/**
 * Test support for the claim circuits.
 *
 * Witnesses are computed with the real compiled wasm and checked against the real r1cs
 * via snarkjs. There is no simulation here: a circuit that would reject an input rejects
 * it in these tests too.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadCredentialFixture,
  type NormalizedCredential,
  type SignedCredential,
} from "@aletheia/credential";
import { generateKeypair, signCredential } from "@aletheia/issuer-mock";
import * as snarkjs from "snarkjs";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Shut down the worker pool snarkjs leaves running.
 *
 * `wtns.check` builds the bn128 curve, which spawns worker threads and caches them on
 * `globalThis`. Without terminating them the test process finishes its assertions and
 * then hangs forever instead of exiting.
 */
export async function terminateCurve(): Promise<void> {
  const curve = (globalThis as { curve_bn128?: { terminate(): Promise<void> } }).curve_bn128;
  await curve?.terminate();
}

export function circuitArtifacts(name: string): { wasm: string; r1cs: string } {
  const dir = join(packageRoot, "build", name);
  return { wasm: join(dir, `${name}_js`, `${name}.wasm`), r1cs: join(dir, `${name}.r1cs`) };
}

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

/**
 * Compute a witness. Rejects, rather than returning, when the circuit's constraints
 * cannot be satisfied — which is what every negative test asserts.
 */
export async function calculateWitness(
  name: string,
  input: Record<string, string | number | bigint>,
): Promise<bigint[]> {
  const { wasm } = circuitArtifacts(name);
  const wtnsPath = join(mkdtempSync(join(tmpdir(), "aletheia-wtns-")), "witness.wtns");
  await snarkjs.wtns.calculate(input, wasm, wtnsPath);
  return snarkjs.wtns.exportJson(wtnsPath);
}

/** Compute a witness and additionally verify it against the r1cs. */
export async function calculateAndCheckWitness(
  name: string,
  input: Record<string, string | number | bigint>,
): Promise<bigint[]> {
  const { wasm, r1cs } = circuitArtifacts(name);
  const wtnsPath = join(mkdtempSync(join(tmpdir(), "aletheia-wtns-")), "witness.wtns");
  await snarkjs.wtns.calculate(input, wasm, wtnsPath);
  const satisfied = await snarkjs.wtns.check(r1cs, wtnsPath);
  if (!satisfied) {
    throw new Error(`witness does not satisfy the r1cs for ${name}`);
  }
  return snarkjs.wtns.exportJson(wtnsPath);
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

export interface AgeClaimParams {
  /** `bigint` is allowed so tests can hand the circuit out-of-range values directly. */
  currentDate: number | bigint;
  minimumAge: number | bigint;
  contextId: bigint;
  /** Override the public issuer key, to model a forged-issuer attempt. */
  issuer?: { ax: bigint; ay: bigint };
  /** Override the public subject, to model a stolen-credential attempt. */
  subject?: string;
}

/** Witness input for `age.circom`, exactly as the client will build it. */
export function ageClaimInput(
  signed: SignedCredential,
  params: AgeClaimParams,
): Record<string, string | number | bigint> {
  const issuer = params.issuer ?? signed.issuer;
  const subject = params.subject ?? signed.credential.subject;
  return {
    credentialId: signed.credential.credentialId,
    dateOfBirth: signed.credential.dateOfBirth,
    nationality: signed.credential.nationality,
    expiryDate: signed.credential.expiryDate,
    issuedAt: signed.credential.issuedAt,
    sigR8x: signed.signature.r8x,
    sigR8y: signed.signature.r8y,
    sigS: signed.signature.s,
    issuerAx: issuer.ax,
    issuerAy: issuer.ay,
    currentDate: params.currentDate,
    minimumAge: params.minimumAge,
    contextId: params.contextId,
    subject: BigInt(subject),
  };
}
