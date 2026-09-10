# Public signal order (normative)

snarkjs emits public signals as **circuit outputs first, then public inputs in
declaration order**. Contracts and clients decode by index, so this order is frozen here
and asserted by tests against the generated artifacts. Changing a circuit's signal order
is a breaking change to `AletheiaVerifier`.

Filled in and locked at stage 6, per circuit, as each is built.

## AgeClaim (`claimTypeId = 1`, schema version 2)

Verified empirically against the compiled artifacts, not assumed: the witness layout is
asserted in `packages/circuits/test/age.test.ts`, the decoded order in
`packages/circuits/test/prove.test.ts`, and the agreement of this table with
`AGE_PUBLIC_SIGNALS`, the generated verifier and `AletheiaVerifier` in
`packages/contracts/test/PublicSignalsLayout.ts`.

| Index | Signal | Kind | Notes |
|---|---|---|---|
| 0 | `nullifier` | output | `Poseidon(credentialId, 1, contextId, subject)`; per credential, claim type and context, so replay is detectable while records stay unlinkable across contexts |
| 1 | `identityNullifier` | output | `Poseidon(identitySecret, contextId)`; stable across every credential and wallet one identity proves with in this context, unrelated across contexts. A per-context correlation handle by design — see `docs/trust-model.md` |
| 2 | `schemaVersion` | input | pinned in-circuit to the compiled constant (`2`), so a proof cannot carry any other value; `AletheiaVerifier` refuses a version it was not deployed for |
| 3 | `issuerAx` | input | issuer BabyJubjub key x; checked against `AletheiaIssuerRegistry` |
| 4 | `issuerAy` | input | issuer BabyJubjub key y |
| 5 | `currentDate` | input | YYYYMMDD; contract accepts only today or yesterday UTC |
| 6 | `minimumAge` | input | the verifier's threshold, `0..120`; the generic claim-parameter slot every claim type shares |
| 7 | `contextId` | input | verifier scope tag, reduced into the field |
| 8 | `subject` | input | holder address as `uint160`; contract requires `== msg.sender` |

Nine signals total, which is why the generated verifier takes `uint[9]`. None of them is
a private credential field: the date of birth, nationality, expiry, issuance date,
credential id, `identitySecret` and signature stay in the witness. A test asserts each
private value is absent from the public signals.

`minimumAge` occupies the generic claim-parameter slot at index 6; nationality and expiry
reuse this same nine-signal layout with a different name for that slot, so every claim
type decodes identically.

## NationalityClaim (`claimTypeId = 2`)

Pending stage 17.

## ExpiryClaim (`claimTypeId = 3`)

Pending stage 18.
