# Public signal order (normative)

snarkjs emits public signals as **circuit outputs first, then public inputs in
declaration order**. Contracts and clients decode by index, so this order is frozen here
and asserted by tests against the generated artifacts. Changing a circuit's signal order
is a breaking change to `AletheiaVerifier`.

Filled in and locked at stage 6, per circuit, as each is built.

## AgeClaim (`claimTypeId = 1`)

| Index | Signal | Kind | Notes |
|---|---|---|---|
| | | | pending stage 6 |

## NationalityClaim (`claimTypeId = 2`)

Pending stage 17.

## ExpiryClaim (`claimTypeId = 3`)

Pending stage 18.
