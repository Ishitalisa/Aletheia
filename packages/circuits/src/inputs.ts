/**
 * Witness input builders.
 *
 * These are the only place raw circuit inputs are assembled, so the client, the tests
 * and the end-to-end script all send the circuit the same shape. The public-signal
 * order that comes out of it is frozen in docs/public-signals.md.
 */

import {
  CLAIM_TYPE,
  MAX_MINIMUM_AGE,
  assertNormalizedCredential,
  assertValidYyyymmdd,
  isFieldElement,
  type SignedCredential,
} from "@aletheia/credential";

export type CircuitInput = Record<string, string | number | bigint>;

export interface AgeClaimRequest {
  /** What the verifier asked: "at least this many years old". */
  minimumAge: number;
  /** The date the claim is evaluated against, YYYYMMDD UTC. */
  currentDate: number;
  /** The verifier's scope tag, already reduced into the field. */
  contextId: bigint;
}

/** Reject a request the circuit would reject anyway, with a readable message. */
export function assertAgeClaimRequest(request: AgeClaimRequest): void {
  if (
    !Number.isInteger(request.minimumAge) ||
    request.minimumAge < 0 ||
    request.minimumAge > MAX_MINIMUM_AGE
  ) {
    throw new RangeError(
      `minimumAge must be an integer in 0..${MAX_MINIMUM_AGE}, got ${request.minimumAge}`,
    );
  }
  assertValidYyyymmdd(request.currentDate, "currentDate");
  if (!isFieldElement(request.contextId)) {
    throw new RangeError("contextId must be a bn128 field element");
  }
}

/**
 * Build the witness input for `age.circom`.
 *
 * Private inputs are the credential and the issuer's signature over it. Public inputs
 * are the issuer key, the date, the threshold the verifier chose, the context tag and
 * the holder's address.
 */
export function ageClaimInput(
  signed: SignedCredential,
  request: AgeClaimRequest,
): CircuitInput {
  assertNormalizedCredential(signed.credential);
  assertAgeClaimRequest(request);
  return {
    // private: the credential
    credentialId: signed.credential.credentialId,
    dateOfBirth: signed.credential.dateOfBirth,
    nationality: signed.credential.nationality,
    expiryDate: signed.credential.expiryDate,
    issuedAt: signed.credential.issuedAt,
    // private: the issuer signature
    sigR8x: signed.signature.r8x,
    sigR8y: signed.signature.r8y,
    sigS: signed.signature.s,
    // public
    issuerAx: signed.issuer.ax,
    issuerAy: signed.issuer.ay,
    currentDate: request.currentDate,
    minimumAge: request.minimumAge,
    contextId: request.contextId,
    subject: BigInt(signed.credential.subject),
  };
}

/** Circuit name and claim type id, kept together so they cannot drift apart. */
export const AGE_CLAIM = { circuit: "age", claimTypeId: CLAIM_TYPE.AGE } as const;
