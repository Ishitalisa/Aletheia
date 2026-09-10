# Status

Snapshot taken 2026-09-10. The **credential schema v1 to v2 migration (Part 0, Days
1–4)** is complete and committed as reviewable per-area commits on top of `0ad8687`
("Add the Solidity verifier and the contracts that decide a claim on-chain").

This file describes what is true right now. `TODO.md` describes what is left. Neither
records anything aspirational: if something is not built, it says so.

## One paragraph

Committed history now reaches the end of **Part 0**: the schema v2 migration is finished
and committed across `packages/credential`, `packages/circuits`, `packages/contracts`,
`packages/issuer-mock` and the normative documents. The full workspace test run is green
and `pnpm -r run typecheck` is green. The nine-signal AgeClaim layout is asserted to agree
across `docs/public-signals.md`, `AGE_PUBLIC_SIGNALS`, the generated verifier and
`AletheiaVerifier` by `packages/contracts/test/PublicSignalsLayout.ts`. The v2 contracts
are now **deployed to Sepolia (Day 8 done)**: four fresh verified addresses, the retired
v1 deployment dropped, and the `mock-dev` issuer registered and reading back active.
Nothing downstream of the contracts — subgraph, web frontend, end-to-end runner — exists
yet. Day 6 is done: `DateLib.toYyyymmdd` is compared directly against the TypeScript codec
on every day from 1970-01-01 to 2100-12-31 (~47,800 samples) with zero divergence, plus an
explicit leap-year-boundary sweep. Day 7 is done:
`packages/contracts/scripts/register-issuer.ts` reads the mock issuer key from the
gitignored keystore, refuses any keystore not labelled `mock-dev`, reads the registry
address from the Ignition deployment for the connected chain, registers the issuer as
`mock-dev`, reads it back active, and refuses a second run rather than double-registering.
The next task is **Day 9**, a real `ClaimVerified` event submitted on-chain.

## Build status

`pnpm -r run typecheck` is green. Per-package test state:

| Package | Result |
|---|---|
| `packages/credential` | **36 of 36 passing** (Day 1 done) |
| `packages/issuer-mock` | **18 passing** (a stale v1 malformed-credential test was fixed during Day 4) |
| `packages/circuits` | **26 of 26 passing** |
| `packages/contracts` | **46 passing** (Day 6 done; +1 for the leap-year-boundary sweep) |

`packages/subgraph`, `packages/web` and `scripts` are named in `docs/architecture.md` and
do not exist.

## The schema v2 migration

### What it changes

Three things, all interlocking:

1. A new private credential field, `identitySecret`, issuer-derived as
   `Poseidon([issuerSalt, documentKey])`. It is stable across credentials the same issuer
   derives from the same document, deliberately unlike the per-instance random
   `credentialId`.
2. `schemaVersion` is promoted from a circom template parameter to a **public signal**,
   pinned in-circuit to the compiled constant, so `AletheiaVerifier` can route on it
   instead of being silently unable to distinguish a v1 proof from a v2 proof.
3. A second circuit output, `identityNullifier = Poseidon([identitySecret, contextId])`,
   carrying no `credentialId`, no `subject` and no `claimTypeId`.

The signed message goes from `Poseidon(7)` to `Poseidon(8)`, and the age circuit's public
signals go from **seven to nine**:

```
0 nullifier          output
1 identityNullifier  output      <- new
2 schemaVersion      public in   <- new
3 issuerAx
4 issuerAy
5 currentDate
6 minimumAge
7 contextId
8 subject
```

Constraints moved with it: 8421 non-linear / 1872 linear under v1, **8685 / 2216** under
v2, recorded in `packages/circuits/constraints.lock.json`.

### What is done

- `packages/circuits` is fully migrated. `lib/credential.circom` pins the version, hashes
  eight inputs, and emits both nullifiers; `age.circom` instantiates `AgeClaim(2)` and
  declares the new public signal. The circuit compiles `--inspect` clean, the constraint
  lock is updated with a written rationale, and all 26 tests pass — including a real
  Groth16 proof, the decoded signal order, altered-signal rejection and tampered-proof
  rejection. A new proving key and verification key have been generated.
- `packages/credential` carries the v2 field, the widened hash, the `identityNullifier`
  derivation, JSON serialization for `identitySecret`, and a guard rejecting
  `identitySecret == credentialId`.
- `packages/issuer-mock/src/identity.ts` (untracked) derives `identitySecret` and
  documents, at length, that it is neither a person identifier nor Sybil resistance.
- `docs/credential-schema.md` and `docs/trust-model.md` carry the reasoning: why
  `credentialId` must stay random, why uniqueness belongs in a separate signal, and why
  two schema versions cannot be live for one claim type on one deployed verifier.

### What is not done

- ~~`packages/credential` has two stale test expectations.~~ **Done (Day 1).** The
  constant assertion and the seven-input `field order is load-bearing` vector were
  updated to v2, `MAX_SCHEMA_VERSION` is now pinned, and coverage the migration had left
  untested was added: an `identitySecret` mutation row, an arity check that a v1 message
  is not a v2 message, and three `identityNullifier` tests (pinned value, survives
  re-issuance and a change of wallet, unlinkable across contexts). 31 to 36 tests, all
  green, and the new pinned tests were confirmed to fail on a deliberately swapped hash
  order before being kept.
- **`packages/contracts` is fully migrated.** `Groth16VerifierAge.sol` was re-exported
  from the new v2 zkey (Day 2): it takes `uint[9]`, carries IC0–IC9, and
  `test/Groth16VerifierAge.ts` passes all seven cases, with the committed `.sol` asserted
  byte-for-byte against a fresh export of the current proving key. `AletheiaVerifier` is
  now v2 (Day 3): it declares `IGroth16Verifier9`, `submitAgeClaim(..., uint256[9])`, and
  the nine-signal indices (`nullifier` 0, `identityNullifier` 1, `schemaVersion` 2,
  `issuerAx` 3, `issuerAy` 4, `currentDate` 5, `minimumAge` 6, `contextId` 7, `subject`
  8). It refuses any `schemaVersion != 2` with a named `SchemaVersionNotSupported` error
  before the pairing check (constant `SUPPORTED_SCHEMA_VERSION`, a `uint16`), and
  `ClaimVerified` now carries `identityNullifier` — non-indexed, with the per-context
  correlation consequence written into `docs/trust-model.md` first. Full suite: 39
  passing. The negative suite was then completed (Day 5): every failure mode — wrong
  subject, stale date, future date, out-of-range parameter, unregistered issuer, revoked
  issuer, nullifier reuse, malformed proof, wrong schema version — has its own test and
  its own named error, none asserting a generic revert, and a `ReserveOrderingProbe`
  test-only adversarial verifier proves the nullifier is reserved *before* the external
  verifier call (the reentrancy defence). The probe reads back the reservation at the
  moment it is invoked and reverts carrying it; the assertion was confirmed to fail when
  the observed value was flipped, so it is a real regression guard rather than a vacuous
  decode. Full contracts suite: 45 passing.
- ~~`docs/public-signals.md` is still stale.~~ **Done (Day 4).** It now freezes the
  nine-signal v2 layout, and `packages/contracts/test/PublicSignalsLayout.ts` asserts
  that layout agrees with `AGE_PUBLIC_SIGNALS`, the generated verifier and
  `AletheiaVerifier` — so the normative document cannot silently drift from the code
  again. `docs/credential-schema.md` was re-read against shipped code and carried to v2:
  the `identitySecret` field, the eight-input signed message, the `identityNullifier`
  section, the v2 wire format, and the schema-version-as-public-signal routing rule.

## The Sepolia deployment

The **v2** contracts are live on Sepolia, deployed 2026-09-10 by
`0xA66f7fc3F125b06a5fd4f107D31a400103866cAe`. Full record in `docs/deployments.md`:

| Contract | Address | Deploy block |
|---|---|---|
| `AletheiaIssuerRegistry` | `0xC3F1ee25b47BbFD25B359B2301ABbDF27d987286` | 11674698 |
| `Groth16VerifierAge` | `0x369b25B54a7829dE4343eA3625f0FC7D8A2D6eb7` | 11674698 |
| `AletheiaVerifier` | `0x110BB3af042ecbeA118d399e300a4358DC9b993c` | 11674703 |
| `AletheiaProfile` | `0x64C2c9974B5f6960E9671C0D843a29Be499dB534` | 11674698 |

`setClaimVerifier(1, Groth16VerifierAge)` confirmed in block 11674709; an on-chain read
confirms `SUPPORTED_SCHEMA_VERSION == 2` and `claimVerifier[1]` points at the deployed
`Groth16VerifierAge`. All four are verified on Etherscan and Sourcify.

The old v1 deployment (`0x51623fDD…`, `0x96888b28…`, `0x899DC043…`, `0x906c2D20…`) was
obsolete — seven-signal, not upgradeable, no v2 proof submittable. Its Ignition state for
`chain-11155111` was wiped and it was redeployed fresh; the retired addresses are dropped.

The `mock-dev` issuer is registered and active:
`issuerId 0xfee4bdf6ec605973cbc4ae331ef4c92cfc89ce43fb42da6d4d6517a164be2588` (register tx
`0xe58167bb6d5ddc0dbf4c67aad0982f026d85efda7e14df01a2afc00a70cee2dc`, block 11674721),
read back active on-chain. It verifies no identity — see `docs/trust-model.md`.

The deployer key now lives in the repository-root `.env` (`SEPOLIA_PRIVATE_KEY`),
resolved via `hardhat.config.ts` loading `.env` into the environment — matching
`preflight.ts`. `.env.example` and the config comments were updated to remove the earlier
keystore contradiction (`myTasks.md` item 2).

## Stage gates

| # | Stage | State |
|---|---|---|
| 0 | Toolchain verification | closed — circom 2.2.3 asserted by the build script |
| 1 | Repository foundation | closed |
| 2 | Credential data model | **closed under v2** — 36 tests green, both nullifiers and the widened hash pinned by the v2 fixture |
| 3 | Mock trusted issuer | closed; `identitySecret` derivation added and untracked |
| 4 | AgeClaim circuit | **closed under v2** — `--inspect` clean, constraints locked, negative cases fail |
| 5 | Local witness generation | closed under v2 |
| 6 | Local Groth16 proof | **closed under v2** — `docs/public-signals.md` updated and asserted to match the artifacts |
| 7 | Local proof verification | closed under v2 |
| 8 | Solidity verifier | **closed under v2** — re-exported to `uint[9]`, 7 tests green, committed `.sol` asserted against the current proving key |
| 9 | Contract tests | **closed under v2** — `AletheiaVerifier` migrated to nine signals, 46 passing; full negative suite complete (Day 5), each failure mode named, reserve-before-verify ordering asserted; `DateLib` proven against the TS codec on every day 1970–2100 (Day 6) |
| 10 | Sepolia deployment | **closed** — v2 deployed, four addresses verified on Etherscan, `mock-dev` issuer registered and active, `docs/deployments.md` filled |
| 11 | Real `ClaimVerified` event | not started (next: Day 9) |
| 12 | Subgraph | not started; package does not exist |
| 13 | GraphQL query layer | not started |
| 14 | ENS resolution | not started |
| — | **M1 end-to-end** | not reached; `scripts` runner does not exist |
| 15 | Document extraction | not started; `docs/passport-extraction.md` written (untracked) |
| 16 | Frontend (age only) | not started; package does not exist |
| 17 | NationalityClaim | not started |
| 18 | ExpiryClaim | not started |
| 19 | Multi-claim end-to-end | not started |
| 20 | Security testing | not started; `docs/security.md` threat table written with a `Verified by` column to close |
| 21 | Documentation | not started |

## Working tree

The schema v2 migration was committed as reviewable per-area commits. Uncommitted on top,
from the Sepolia deployment (Day 8): `docs/deployments.md`, `STATUS.md`, `myTasks.md`,
`.env.example` and `packages/contracts/hardhat.config.ts` (the deployer-key location
decision). Ignition deployment artifacts and all build output remain gitignored.
