/**
 * The normalized credential: the only representation any Aletheia component works with.
 *
 * A credential becomes trustworthy when an issuer signs it, and not before. Nothing in
 * this module inspects a document, and nothing here holds a key.
 */

import { SCHEMA_VERSION } from "./constants.ts";
import { assertValidYyyymmdd, isValidYyyymmdd } from "./date.ts";
import { assertFieldElement, isAddress } from "./field.ts";

/** ISO 3166-1 numeric country codes are three digits. */
export const MIN_COUNTRY_CODE = 1;
export const MAX_COUNTRY_CODE = 999;

/** Fields an issuer signs. Every one of them is private to the holder. */
export interface NormalizedCredential {
  /** Layout version of this credential and of its signed message. */
  schemaVersion: number;
  /** 31 random bytes. Private: it is the entropy behind every nullifier. */
  credentialId: bigint;
  /** The wallet this credential is bound to, as a 20-byte hex address. */
  subject: string;
  /** YYYYMMDD, UTC. */
  dateOfBirth: number;
  /** ISO 3166-1 numeric, e.g. 356 for India. */
  nationality: number;
  /** YYYYMMDD, UTC. Inclusive: a credential is valid through its expiry date. */
  expiryDate: number;
  /** YYYYMMDD, UTC. */
  issuedAt: number;
}

/** An EdDSA public key on BabyJubjub. */
export interface IssuerPublicKey {
  ax: bigint;
  ay: bigint;
}

/** An EdDSA-Poseidon signature, in the component form the circuit consumes. */
export interface CredentialSignature {
  r8x: bigint;
  r8y: bigint;
  s: bigint;
}

/** A normalized credential plus the issuer attestation that makes it usable. */
export interface SignedCredential {
  credential: NormalizedCredential;
  issuer: IssuerPublicKey;
  signature: CredentialSignature;
}

export function isCountryCode(value: number): boolean {
  return (
    Number.isInteger(value) && value >= MIN_COUNTRY_CODE && value <= MAX_COUNTRY_CODE
  );
}

/**
 * Reject anything that could not have come from a well-behaved issuer. Called before
 * signing, after parsing, and before building a witness — a malformed credential must
 * fail early and loudly rather than produce an unsatisfiable circuit.
 */
export function assertNormalizedCredential(credential: NormalizedCredential): void {
  if (credential.schemaVersion !== SCHEMA_VERSION) {
    throw new RangeError(
      `unsupported schemaVersion ${credential.schemaVersion}, expected ${SCHEMA_VERSION}`,
    );
  }
  assertFieldElement(credential.credentialId, "credentialId");
  if (credential.credentialId === 0n) {
    throw new RangeError("credentialId must not be zero");
  }
  if (!isAddress(credential.subject)) {
    throw new TypeError(`subject is not a 20-byte hex address: ${credential.subject}`);
  }
  assertValidYyyymmdd(credential.dateOfBirth, "dateOfBirth");
  assertValidYyyymmdd(credential.expiryDate, "expiryDate");
  assertValidYyyymmdd(credential.issuedAt, "issuedAt");
  if (!isCountryCode(credential.nationality)) {
    throw new RangeError(`nationality is not an ISO 3166-1 numeric code: ${credential.nationality}`);
  }
  if (credential.dateOfBirth > credential.issuedAt) {
    throw new RangeError("dateOfBirth is after issuedAt");
  }
  if (credential.expiryDate < credential.issuedAt) {
    throw new RangeError("expiryDate is before issuedAt");
  }
}

export function isNormalizedCredential(value: NormalizedCredential): boolean {
  try {
    assertNormalizedCredential(value);
    return true;
  } catch {
    return false;
  }
}

/** Wire form: field elements as decimal strings, so it survives JSON round-trips. */
export interface SignedCredentialJson {
  schemaVersion: number;
  credentialId: string;
  issuer: { ax: string; ay: string };
  subject: string;
  dateOfBirth: number;
  nationality: number;
  expiryDate: number;
  issuedAt: number;
  signature: { r8x: string; r8y: string; s: string };
}

export function serializeSignedCredential(signed: SignedCredential): SignedCredentialJson {
  assertNormalizedCredential(signed.credential);
  return {
    schemaVersion: signed.credential.schemaVersion,
    credentialId: signed.credential.credentialId.toString(10),
    issuer: { ax: signed.issuer.ax.toString(10), ay: signed.issuer.ay.toString(10) },
    subject: signed.credential.subject,
    dateOfBirth: signed.credential.dateOfBirth,
    nationality: signed.credential.nationality,
    expiryDate: signed.credential.expiryDate,
    issuedAt: signed.credential.issuedAt,
    signature: {
      r8x: signed.signature.r8x.toString(10),
      r8y: signed.signature.r8y.toString(10),
      s: signed.signature.s.toString(10),
    },
  };
}

export function parseSignedCredential(json: SignedCredentialJson): SignedCredential {
  const signed: SignedCredential = {
    credential: {
      schemaVersion: json.schemaVersion,
      credentialId: BigInt(json.credentialId),
      subject: json.subject,
      dateOfBirth: json.dateOfBirth,
      nationality: json.nationality,
      expiryDate: json.expiryDate,
      issuedAt: json.issuedAt,
    },
    issuer: { ax: BigInt(json.issuer.ax), ay: BigInt(json.issuer.ay) },
    signature: {
      r8x: BigInt(json.signature.r8x),
      r8y: BigInt(json.signature.r8y),
      s: BigInt(json.signature.s),
    },
  };
  assertNormalizedCredential(signed.credential);
  assertFieldElement(signed.issuer.ax, "issuer.ax");
  assertFieldElement(signed.issuer.ay, "issuer.ay");
  assertFieldElement(signed.signature.r8x, "signature.r8x");
  assertFieldElement(signed.signature.r8y, "signature.r8y");
  assertFieldElement(signed.signature.s, "signature.s");
  return signed;
}

/** Whether a credential's declared claim inputs are internally satisfiable at all. */
export function credentialSupportsDate(
  credential: NormalizedCredential,
  currentDate: number,
): boolean {
  return isValidYyyymmdd(currentDate) && credential.expiryDate >= currentDate;
}
