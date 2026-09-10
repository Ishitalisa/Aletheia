/**
 * Test support for the claim circuits.
 *
 * Witnesses are computed with the real compiled wasm and checked against the real r1cs.
 * There is no simulation here: an input the circuit would reject is rejected in these
 * tests too.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadCredentialFixture,
  type NormalizedCredential,
  type SignedCredential,
} from "@aletheia/credential";
import { generateKeypair, signCredential } from "@aletheia/issuer-mock";

import { calculateWitness, checkWitness, type CircuitInput } from "../src/index.ts";

export { calculateWitness, releaseProver as terminateCurve } from "../src/index.ts";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export interface LockedStats {
  nonLinearConstraints: number;
  linearConstraints: number;
  publicInputs: number;
  privateInputs: number;
  publicOutputs: number;
  wires: number;
}

export function lockedStats(name: string): LockedStats {
  const lock = JSON.parse(
    readFileSync(join(packageRoot, "constraints.lock.json"), "utf8"),
  ) as { circuits: Record<string, LockedStats> };
  const entry = lock.circuits[name];
  if (entry === undefined) {
    throw new Error(`no locked constraint counts for circuit "${name}"`);
  }
  return entry;
}

export function compiledStats(name: string): LockedStats & { name: string } {
  return JSON.parse(
    readFileSync(join(packageRoot, "build", name, "constraints.json"), "utf8"),
  ) as LockedStats & { name: string };
}

/** Compute a witness and verify it against the constraint system. */
export async function calculateAndCheckWitness(
  name: string,
  input: CircuitInput,
): Promise<bigint[]> {
  const witness = await calculateWitness(name, input);
  if (!(await checkWitness(name, witness.path))) {
    throw new Error(`witness does not satisfy the r1cs for ${name}`);
  }
  return witness.values;
}

/** A real issuer signature over the committed fixture credential. */
export async function signedFixture(
  overrides: Partial<NormalizedCredential> = {},
): Promise<{ signed: SignedCredential; privateKey: Uint8Array }> {
  const { credential } = loadCredentialFixture();
  const { privateKey } = await generateKeypair();
  const signed = await signCredential(privateKey, { ...credential, ...overrides });
  return { signed, privateKey };
}

export interface RawAgeParams {
  /** `bigint` and out-of-range values are allowed: that is the point of these tests. */
  currentDate: number | bigint;
  minimumAge: number | bigint;
  contextId: bigint;
  /** Override the public issuer key, to model a forged-issuer attempt. */
  issuer?: { ax: bigint; ay: bigint };
  /** Override the public subject, to model a stolen-credential attempt. */
  subject?: string;
  /** Override the public schemaVersion, to test the circuit's version pin. */
  schemaVersion?: number | bigint;
}

/**
 * Assemble an `age.circom` input without the validation `ageClaimInput` applies.
 *
 * The library builder rejects nonsense before the circuit sees it, which is right for
 * callers and useless for testing the circuit's own defences — an attacker will not use
 * our builder. These tests hand the circuit the values directly.
 */
export function rawAgeInput(signed: SignedCredential, params: RawAgeParams): CircuitInput {
  const issuer = params.issuer ?? signed.issuer;
  const subject = params.subject ?? signed.credential.subject;
  return {
    credentialId: signed.credential.credentialId,
    dateOfBirth: signed.credential.dateOfBirth,
    nationality: signed.credential.nationality,
    expiryDate: signed.credential.expiryDate,
    issuedAt: signed.credential.issuedAt,
    identitySecret: signed.credential.identitySecret,
    sigR8x: signed.signature.r8x,
    sigR8y: signed.signature.r8y,
    sigS: signed.signature.s,
    schemaVersion: params.schemaVersion ?? signed.credential.schemaVersion,
    issuerAx: issuer.ax,
    issuerAy: issuer.ay,
    currentDate: params.currentDate,
    minimumAge: params.minimumAge,
    contextId: params.contextId,
    subject: BigInt(subject),
  };
}
