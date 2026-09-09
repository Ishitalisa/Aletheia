/**
 * Groth16 proving and verification.
 *
 * Thin wrappers over snarkjs that keep artifact paths, public-signal decoding and the
 * "verify what you just produced" habit in one place. No result is ever synthesised: if
 * snarkjs cannot produce or verify a proof, these functions fail.
 */

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as snarkjs from "snarkjs";

import { assertArtifacts } from "./paths.ts";
import type { CircuitInput } from "./inputs.ts";

/** A Groth16 proof in the shape snarkjs emits and the Solidity verifier consumes. */
export interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
}

export interface ProofResult {
  proof: Groth16Proof;
  /** Decimal strings, in the frozen order: outputs first, then public inputs. */
  publicSignals: string[];
}

/** Compute a witness only. Throws if the input does not satisfy the constraints. */
export async function calculateWitness(
  circuit: string,
  input: CircuitInput,
): Promise<{ path: string; values: bigint[] }> {
  const { wasm } = assertArtifacts(circuit, ["wasm"]);
  const path = join(mkdtempSync(join(tmpdir(), `aletheia-${circuit}-`)), "witness.wtns");
  await snarkjs.wtns.calculate(input, wasm, path);
  return { path, values: await snarkjs.wtns.exportJson(path) };
}

/** Verify a witness against the constraint system, independently of any proof. */
export async function checkWitness(circuit: string, witnessPath: string): Promise<boolean> {
  const { r1cs } = assertArtifacts(circuit, ["r1cs"]);
  return snarkjs.wtns.check(r1cs, witnessPath);
}

export function verificationKey(circuit: string): unknown {
  const { vkey } = assertArtifacts(circuit, ["vkey"]);
  return JSON.parse(readFileSync(vkey, "utf8"));
}

/**
 * Produce a proof and verify it before returning.
 *
 * A prover that hands back a proof it never checked is how "verified" ends up meaning
 * nothing, so verification is not optional here.
 */
export async function prove(circuit: string, input: CircuitInput): Promise<ProofResult> {
  const { wasm, zkey } = assertArtifacts(circuit, ["wasm", "zkey", "vkey"]);
  const { proof, publicSignals } = (await snarkjs.groth16.fullProve(
    input,
    wasm,
    zkey,
  )) as ProofResult;

  if (!(await verify(circuit, publicSignals, proof))) {
    throw new Error(
      `produced a proof for "${circuit}" that does not verify; refusing to return it`,
    );
  }
  return { proof, publicSignals };
}

export async function verify(
  circuit: string,
  publicSignals: readonly string[],
  proof: Groth16Proof,
): Promise<boolean> {
  return snarkjs.groth16.verify(verificationKey(circuit), publicSignals, proof);
}

/**
 * Release the worker threads snarkjs starts for curve arithmetic.
 *
 * Without this a process that has proved or verified anything finishes its work and
 * then hangs instead of exiting.
 */
export async function releaseProver(): Promise<void> {
  const curve = (globalThis as { curve_bn128?: { terminate(): Promise<void> } }).curve_bn128;
  await curve?.terminate();
}
