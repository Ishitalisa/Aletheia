export {
  SCHEMA_VERSION,
  MAX_SCHEMA_VERSION,
  CLAIM_TYPE,
  MIN_DATE_YYYYMMDD,
  MAX_DATE_YYYYMMDD,
  type ClaimTypeName,
  type ClaimTypeId,
} from "./constants.ts";

export {
  FIELD_MODULUS,
  SAFE_FIELD_BYTES,
  addressToField,
  assertFieldElement,
  fieldToAddress,
  fieldToBytes32,
  hashToField,
  isAddress,
  isFieldElement,
  randomFieldElement,
} from "./field.ts";

export {
  MAX_MINIMUM_AGE,
  ageThresholdYyyymmdd,
  assertValidYyyymmdd,
  completedYears,
  dateToYyyymmdd,
  daysInMonth,
  isLeapYear,
  isUnexpired,
  isValidYyyymmdd,
  parseYyyymmdd,
  satisfiesMinimumAge,
  splitYyyymmdd,
  todayUtcYyyymmdd,
  toYyyymmdd,
  yyyymmddToDate,
  type CalendarDate,
} from "./date.ts";

export {
  MAX_COUNTRY_CODE,
  MIN_COUNTRY_CODE,
  assertNormalizedCredential,
  credentialSupportsDate,
  isCountryCode,
  isNormalizedCredential,
  parseSignedCredential,
  serializeSignedCredential,
  type CredentialSignature,
  type IssuerPublicKey,
  type NormalizedCredential,
  type SignedCredential,
  type SignedCredentialJson,
} from "./credential.ts";

export {
  claimNullifier,
  credentialMessageHash,
  identityNullifier,
  poseidonHash,
  type IdentityNullifierInput,
  type NullifierInput,
} from "./hash.ts";

export type { CredentialSigner } from "./issuer.ts";

// Test support. Exported so every package tests against one credential fixture instead
// of drifting copies; not part of the runtime surface.
export { loadCredentialFixture, type CredentialFixture } from "./test-fixture.ts";
