# Normalized credential (schema version 1)

Normative field list and signed-message layout. Filled in and locked at stage 2; the
implementation in `packages/credential` is the executable form of this document, and a
committed fixture pins the resulting message hash.

## Fields

Pending stage 2.

## Signed message

Pending stage 2.

## Field encodings

- dates: `uint32` `YYYYMMDD` — see `docs/date-format.md`
- nationality: ISO 3166-1 numeric (India = `356`)
- subject: Ethereum address as a `uint160` field element
- credential id: 31 random bytes, so it fits a bn128 field element with room to spare

## Compatibility rule

`schemaVersion` is part of the signed message. Any change to the field list, their order,
or their encodings requires a new `schemaVersion`, a new circuit, and a new verifier
deployment — old credentials keep verifying against the old one.
