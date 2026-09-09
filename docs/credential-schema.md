# Normalized credential (schema version 1)

Normative field list and signed-message layout. `packages/credential` is the executable
form of this document, and `packages/credential/fixtures/credential-v1.json` pins the
resulting hashes so an accidental change fails a test instead of silently invalidating
every credential in existence.

Every field below is **private**. None of them is ever transmitted to Ethereum, the
subgraph, or ENS.

## Fields

| Field | Type | Encoding | Notes |
|---|---|---|---|
| `schemaVersion` | `number` | `1` | first input to the signed hash, so a version change cannot be replayed |
| `credentialId` | `bigint` | 31 random bytes | private; the entropy behind every nullifier. Never leaves the device |
| `subject` | `string` | `0x` + 20 bytes | the wallet the credential is bound to; hashed as a `uint160` field element |
| `dateOfBirth` | `number` | YYYYMMDD, UTC | see `docs/date-format.md` |
| `nationality` | `number` | ISO 3166-1 numeric | India = `356`; range 1-999 |
| `expiryDate` | `number` | YYYYMMDD, UTC | inclusive: valid *through* this date |
| `issuedAt` | `number` | YYYYMMDD, UTC | |

Validity rules enforced before signing and after parsing: real calendar dates inside
`19000101..21001231`, `credentialId` a non-zero bn128 field element, `dateOfBirth`
not after `issuedAt`, and `expiryDate` not before `issuedAt`.

## Signed message

```
msgHash = Poseidon([
  schemaVersion,      // 1
  credentialId,
  uint160(subject),
  dateOfBirth,
  nationality,
  expiryDate,
  issuedAt
])

signature = EdDSA-Poseidon-sign(issuerPrivateKey, msgHash)   // BabyJubjub
```

Seven inputs, in exactly this order. The circuit recomputes this hash from private
inputs and verifies the signature against it with circomlib's `EdDSAPoseidonVerifier`, so
a credential the issuer never signed cannot produce a witness.

Why BabyJubjub EdDSA rather than secp256k1 ECDSA: roughly 4k constraints instead of
roughly 150k, for the same job.

Why `subject` is inside the signed message: it binds the credential to one wallet, so a
leaked credential cannot be used from another address.

## Nullifier

```
nullifier = Poseidon([credentialId, claimTypeId, contextId, uint160(subject)])
```

A circuit **output**, therefore public. It does three jobs:

- the contract rejects a repeat of the same claim in the same context, learning nothing
  about the credential
- it binds the proof to one wallet and one claim type, so a proof cannot be lifted
- because `credentialId` is private and high-entropy, records for one credential under
  different verifier contexts cannot be linked to each other

`claimTypeId` is `1` age, `2` nationality, `3` expiry. Ids are never renumbered.

## Context id

The verifier's scope tag. A 32-byte digest is reduced into the field by keeping its
leading 31 bytes (`hashToField`, i.e. `digest >> 8`). Truncation must be identical
everywhere, so that is the only sanctioned reduction. Consequence, accepted: digests that
differ only in their final byte collide. A `contextId` is a scoping tag, not a
commitment.

## Wire format

`serializeSignedCredential` emits field elements as decimal strings, because JSON numbers
cannot hold a 254-bit integer:

```json
{
  "schemaVersion": 1,
  "credentialId": "1780731860627700044960722568376592200742329637303199754547598369979440671",
  "issuer": { "ax": "...", "ay": "..." },
  "subject": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "dateOfBirth": 20040314,
  "nationality": 356,
  "expiryDate": 20340314,
  "issuedAt": 20260909,
  "signature": { "r8x": "...", "r8y": "...", "s": "..." }
}
```

## Compatibility rule

`schemaVersion` is the first input to the signed message. Any change to the field list,
their order, or their encodings requires a new `schemaVersion`, recompiled circuits, and
newly deployed verifiers. Credentials issued under an older version keep verifying
against the verifier deployed for that version.
