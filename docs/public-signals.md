# Public signal order (normative)

snarkjs emits public signals as **circuit outputs first, then public inputs in
declaration order**. Contracts and clients decode by index, so this order is frozen here
and asserted by tests against the generated artifacts. Changing a circuit's signal order
is a breaking change to `AletheiaVerifier`.

Filled in and locked at stage 6, per circuit, as each is built.

## AgeClaim (`claimTypeId = 1`)

Verified empirically against the compiled artifacts, not assumed: the witness layout is
asserted in `packages/circuits/test/age.test.ts` and the decoded order in
`packages/circuits/test/prove.test.ts`.

| Index | Signal | Kind | Notes |
|---|---|---|---|
| 0 | `nullifier` | output | `Poseidon(credentialId, 1, contextId, subject)` |
| 1 | `issuerAx` | input | issuer BabyJubjub key x; checked against `AletheiaIssuerRegistry` |
| 2 | `issuerAy` | input | issuer BabyJubjub key y |
| 3 | `currentDate` | input | YYYYMMDD; contract accepts only today or yesterday UTC |
| 4 | `minimumAge` | input | the verifier's threshold, `0..120` |
| 5 | `contextId` | input | verifier scope tag, reduced into the field |
| 6 | `subject` | input | holder address as `uint160`; contract requires `== msg.sender` |

Seven signals total, which is why the generated verifier takes `uint[7]`. None of them
is a private credential field: the date of birth, nationality, expiry, issuance date,
credential id and signature stay in the witness. A test asserts each private value is
absent from the public signals.

## NationalityClaim (`claimTypeId = 2`)

Pending stage 17.

## ExpiryClaim (`claimTypeId = 3`)

Pending stage 18.
