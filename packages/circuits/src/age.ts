/**
 * The age claim, end to end: signed credential in, verified Groth16 proof out.
 *
 * Public signal order is the contract between this package, AletheiaVerifier and the
 * subgraph. It is fixed by the declaration order in age.circom, asserted by test, and
 * documented in docs/public-signals.md. Decoding it by name here means no other layer
 * has to index into an array of decimal strings and hope.
 */

import { fieldToAddress, type SignedCredential } from "@aletheia/credential";

import { AGE_CLAIM, ageClaimInput, type AgeClaimRequest } from "./inputs.ts";
import { prove, verify, type Groth16Proof, type ProofResult } from "./prove.ts";

/** Groth16 public signals: circuit outputs first, then public inputs in order. */
export const AGE_PUBLIC_SIGNALS = [
  "nullifier",
  "issuerAx",
  "issuerAy",
  "currentDate",
  "minimumAge",
  "contextId",
  "subject",
] as const;

export interface AgePublicSignals {
  nullifier: bigint;
  issuerAx: bigint;
  issuerAy: bigint;
  currentDate: number;
  minimumAge: number;
  contextId: bigint;
  subject: string;
}

export function decodeAgePublicSignals(signals: readonly string[]): AgePublicSignals {
  if (signals.length !== AGE_PUBLIC_SIGNALS.length) {
    throw new Error(
      `expected ${AGE_PUBLIC_SIGNALS.length} public signals, got ${signals.length}`,
    );
  }
  const at = (name: (typeof AGE_PUBLIC_SIGNALS)[number]): bigint =>
    BigInt(signals[AGE_PUBLIC_SIGNALS.indexOf(name)] as string);

  return {
    nullifier: at("nullifier"),
    issuerAx: at("issuerAx"),
    issuerAy: at("issuerAy"),
    currentDate: Number(at("currentDate")),
    minimumAge: Number(at("minimumAge")),
    contextId: at("contextId"),
    subject: fieldToAddress(at("subject")),
  };
}

export interface AgeClaimProof extends ProofResult {
  decoded: AgePublicSignals;
}

/** Prove an age claim. The returned proof has already been verified locally. */
export async function proveAgeClaim(
  signed: SignedCredential,
  request: AgeClaimRequest,
): Promise<AgeClaimProof> {
  const result = await prove(AGE_CLAIM.circuit, ageClaimInput(signed, request));
  const decoded = decodeAgePublicSignals(result.publicSignals);

  // The proof is only meaningful if the public signals say what the caller asked. A
  // mismatch here would mean the input builder and the circuit disagree.
  if (decoded.minimumAge !== request.minimumAge || decoded.currentDate !== request.currentDate) {
    throw new Error("public signals do not match the requested claim");
  }
  return { ...result, decoded };
}

export async function verifyAgeClaim(
  publicSignals: readonly string[],
  proof: Groth16Proof,
): Promise<boolean> {
  return verify(AGE_CLAIM.circuit, publicSignals, proof);
}
