/**
 * Poseidon hashing for Aletheia: the issuer-signed credential message and the claim
 * nullifier.
 *
 * Both layouts are reproduced constraint-for-constraint inside the circuits, and the
 * circuit is the authority. These functions exist so the issuer, the witness builder and
 * the tests agree with it; a mismatch shows up as an unsatisfiable circuit, which is why
 * the layouts below are frozen and pinned by fixture.
 */

import { buildPoseidon, type Poseidon } from "circomlibjs";

import type { ClaimTypeId } from "./constants.ts";
import { assertNormalizedCredential, type NormalizedCredential } from "./credential.ts";
import { addressToField, assertFieldElement } from "./field.ts";

let poseidonPromise: Promise<Poseidon> | undefined;

/** The Poseidon instance, built once per process. */
async function poseidon(): Promise<Poseidon> {
  poseidonPromise ??= buildPoseidon();
  return poseidonPromise;
}

/** Hash a list of field elements with circomlib's Poseidon, returning a `bigint`. */
export async function poseidonHash(
  inputs: readonly bigint[],
): Promise<bigint> {
  if (inputs.length === 0 || inputs.length > 16) {
    throw new RangeError(`Poseidon takes 1 to 16 inputs, got ${inputs.length}`);
  }
  inputs.forEach((input, index) => assertFieldElement(input, `input[${index}]`));
  const instance = await poseidon();
  return instance.F.toObject(instance(inputs));
}

/**
 * The message an issuer signs. Field order is normative and versioned by
 * `schemaVersion`, which is itself the first input:
 *
 *   Poseidon([schemaVersion, credentialId, subject, dateOfBirth, nationality,
 *             expiryDate, issuedAt])
 *
 * Binding `subject` into the signed message is what stops a credential being used from
 * another wallet.
 */
export async function credentialMessageHash(
  credential: NormalizedCredential,
): Promise<bigint> {
  assertNormalizedCredential(credential);
  return poseidonHash([
    BigInt(credential.schemaVersion),
    credential.credentialId,
    addressToField(credential.subject),
    BigInt(credential.dateOfBirth),
    BigInt(credential.nationality),
    BigInt(credential.expiryDate),
    BigInt(credential.issuedAt),
  ]);
}

export interface NullifierInput {
  /** Private, from the credential. */
  credentialId: bigint;
  /** Which claim was proven. */
  claimTypeId: ClaimTypeId;
  /** Verifier-chosen scope, reduced into the field by `hashToField`. */
  contextId: bigint;
  /** The proving wallet, as a hex address. */
  subject: string;
}

/**
 * The public nullifier a claim circuit outputs:
 *
 *   Poseidon([credentialId, claimTypeId, contextId, subject])
 *
 * It does three jobs at once. It lets the contract reject a repeat of the same claim in
 * the same context without learning anything about the credential; it binds the proof to
 * one wallet and one claim, so a proof cannot be lifted elsewhere; and because
 * `credentialId` is private and high-entropy, records for the same credential under
 * different verifier contexts cannot be linked to each other.
 */
export async function claimNullifier(input: NullifierInput): Promise<bigint> {
  assertFieldElement(input.credentialId, "credentialId");
  assertFieldElement(input.contextId, "contextId");
  return poseidonHash([
    input.credentialId,
    BigInt(input.claimTypeId),
    input.contextId,
    addressToField(input.subject),
  ]);
}
