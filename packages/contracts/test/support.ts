/**
 * Deployment and proving helpers for the contract tests.
 *
 * Every proof here is generated at test time from a real issuer signature and a real
 * circuit. There are no recorded proofs, no stubbed verifier and no simulated success:
 * if the crypto stops working, these tests stop passing.
 */

import {
  dateToYyyymmdd,
  loadCredentialFixture,
  type NormalizedCredential,
  type SignedCredential,
} from "@aletheia/credential";
import {
  proveAgeClaim,
  toSolidityCalldata,
  type SolidityCalldata,
} from "@aletheia/circuits";
import { generateKeypair, signCredential } from "@aletheia/issuer-mock";
import { network } from "hardhat";

export const MOCK_ISSUER_LABEL = "mock-dev";

export type Deployment = Awaited<ReturnType<typeof deployAletheia>>;

/** Deploy the protocol and wire it up the way a real deployment does. */
export async function deployAletheia() {
  const connection = await network.create();
  const { viem } = connection;
  const publicClient = await viem.getPublicClient();
  const [owner, holder, stranger] = await viem.getWalletClients();
  if (owner === undefined || holder === undefined || stranger === undefined) {
    throw new Error("expected at least three wallet clients");
  }

  const registry = await viem.deployContract("AletheiaIssuerRegistry", [
    owner.account.address,
  ]);
  const groth16 = await viem.deployContract("Groth16VerifierAge");
  const verifier = await viem.deployContract("AletheiaVerifier", [
    owner.account.address,
    registry.address,
  ]);
  await verifier.write.setClaimVerifier([1, groth16.address]);

  // The issuer key is generated per test run, so nothing here depends on a key that
  // exists in the repository.
  const issuer = await generateKeypair();
  await registry.write.register([
    issuer.publicKey.ax,
    issuer.publicKey.ay,
    MOCK_ISSUER_LABEL,
  ]);

  return { connection, viem, publicClient, owner, holder, stranger, registry, groth16, verifier, issuer };
}

/** The date the chain currently considers today, read from the contract itself. */
export async function chainToday(deployment: Deployment): Promise<number> {
  return Number(await deployment.verifier.read.today());
}

/** The previous UTC day, derived from the chain's clock rather than the host's. */
export async function chainYesterday(deployment: Deployment): Promise<number> {
  const block = await deployment.publicClient.getBlock();
  return dateToYyyymmdd(new Date((Number(block.timestamp) - 86_400) * 1000));
}

export async function chainDaysAgo(deployment: Deployment, days: number): Promise<number> {
  const block = await deployment.publicClient.getBlock();
  return dateToYyyymmdd(new Date((Number(block.timestamp) - days * 86_400) * 1000));
}

export interface ClaimOptions {
  minimumAge?: number;
  currentDate?: number;
  contextId?: bigint;
  /** Sign with a different issuer key, to model an unregistered issuer. */
  issuerPrivateKey?: Uint8Array;
  /** Override credential fields before signing. */
  credential?: Partial<NormalizedCredential>;
}

export interface AgeClaimBundle {
  signed: SignedCredential;
  calldata: SolidityCalldata;
  /**
   * The fixed-size tuple the generated verifier and AletheiaVerifier expect, in the
   * nine-signal v2 order:
   * `[nullifier, identityNullifier, schemaVersion, issuerAx, issuerAy, currentDate,
   * minimumAge, contextId, subject]`.
   */
  signals: readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ];
  publicSignals: string[];
}

/**
 * Sign a credential for the holder's own address and prove an age claim about it.
 *
 * The subject must be the holder's wallet: it is inside the signed message, inside the
 * nullifier, and compared against `msg.sender` on-chain.
 */
export async function buildAgeClaim(
  deployment: Deployment,
  options: ClaimOptions = {},
): Promise<AgeClaimBundle> {
  const { credential } = loadCredentialFixture();
  const signed = await signCredential(options.issuerPrivateKey ?? deployment.issuer.privateKey, {
    ...credential,
    subject: deployment.holder.account.address.toLowerCase(),
    ...options.credential,
  });

  const proved = await proveAgeClaim(signed, {
    minimumAge: options.minimumAge ?? 18,
    currentDate: options.currentDate ?? (await chainToday(deployment)),
    contextId: options.contextId ?? loadCredentialFixture().expected.contextId,
  });
  const calldata = await toSolidityCalldata(proved.proof, proved.publicSignals);

  return {
    signed,
    calldata,
    signals: calldata.publicSignals as unknown as AgeClaimBundle["signals"],
    publicSignals: proved.publicSignals,
  };
}

/** Submit a claim as the holder. Returns the transaction hash. */
export async function submitAsHolder(
  deployment: Deployment,
  bundle: AgeClaimBundle,
): Promise<`0x${string}`> {
  return deployment.verifier.write.submitAgeClaim(
    [bundle.calldata.a, bundle.calldata.b, bundle.calldata.c, bundle.signals],
    { account: deployment.holder.account },
  );
}
