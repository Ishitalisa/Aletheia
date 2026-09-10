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
Day 9 is done: a genuine age proof was submitted on Sepolia and the identical proof, on
resubmission, reverted on-chain with `VerificationAlreadyRecorded`. Day 10 is done:
`packages/subgraph` now exists with the designed schema (`Profile`, immutable
`Verification`, `Issuer`; `Bytes` ids; `@derivedFrom` on the one side of each relation)
and a three-dataSource manifest on `sepolia` starting at the stage 10 deploy blocks;
`graph codegen` and `graph build` run clean with no `eth_call` anywhere. Day 11 is now
done: the four event handlers (`ClaimVerified`, `IssuerRegistered`, `IssuerActiveSet`,
`ProfileRegistered`) are implemented and matchstick is green — six tests covering a first
verification, a second in a different context, an issuer revocation, the `mock-dev` label
reaching the `Issuer`, the unknown-issuer guard, and `ProfileRegistered`. Day 12 is now
done: the subgraph is deployed to Subgraph Studio on Sepolia (slug `aletheia`, version
`v0.0.2`, deployment `QmNu6wYNr71…gpVEL`), synced with `hasIndexingErrors: false`, and the
stage 11 `ClaimVerified` is queryable as a real `Verification` entity from the Studio
endpoint. Day 13 is now done: `packages/query` is a typed GraphQL read client — one
`fetch`-based transport, strict decoders, five typed reads, every one returning
`_meta.block.number` and `hasIndexingErrors` alongside its records — and
`scripts/check.ts` ran it live against the deployed Studio endpoint, reading indexer
block **11676205** (`hasIndexingErrors: false`) and the stage 11 `Verification`
`0xd24a4fc1…928c3`, confirmed against transaction `0x195671d0…b92719` and the `mock-dev`
issuer label, with the subject's derived `Profile.verifications` resolving back to the
same record. Introspecting the live schema surfaced a genuine bug before the gate closed:
graph-node's built-in `_meta.block.number` is `Int!` (a JSON number), unlike the
subgraph's own `BigInt` fields (decimal strings), and `decode.ts` had assumed the latter
for both. Fixed in the decoder, not worked around. No mocked `fetch` anywhere in the read
path. Day 14 is now done: `packages/query` derives the **five verification states**
(`verified`, `stale`, `revoked`, `pending`, `not-found`) from a real read via the pure
`deriveVerificationState`, and all five were reproduced against the live Studio endpoint
with real artifacts — including an actual on-chain issuer revocation and re-activation for
`revoked`, and a real submit-and-poll for `pending`. Day 15 is now done: `packages/ens` is
a read-only ENS resolver — `createEnsResolver` with `resolveAddress` (forward, name →
address) and `resolveName` (reverse, address → name), both through the ENS Universal
Resolver proxy `0xeEeE…EeEe` over `MAINNET_RPC_URL` using viem 2.56, with no writes, no
registrar and no injectable transport. `scripts/check.ts` ran live against real mainnet
ENS and closed all three exit criteria: `vitalik.eth` resolved to
`0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (never hardcoded, never special-cased), that
address reverse-resolved to `vitalik.eth` and forward round-tripped back (ENSv2 enforces
the forward-match on-chain), a nonexistent name returned `null` rather than throwing, and a
keccak-derived address with no reverse record returned `null` as a first-class outcome. The
name is resolved live and stored nowhere — not on-chain, not in the subgraph
(`docs/architecture.md`, ENS section). The next task is **Day 16**, the M1 end-to-end
runner.

## Build status

`pnpm -r run typecheck` is green. Per-package test state:

| Package | Result |
|---|---|
| `packages/credential` | **36 of 36 passing** (Day 1 done) |
| `packages/issuer-mock` | **18 passing** (a stale v1 malformed-credential test was fixed during Day 4) |
| `packages/circuits` | **26 of 26 passing** |
| `packages/contracts` | **46 passing** (Day 6 done; +1 for the leap-year-boundary sweep) |
| `packages/subgraph` | **6 matchstick tests passing** (Day 11); `graph codegen`/`graph build` clean, no `eth_call`; deployed to Studio (Day 12), slug `aletheia` v0.0.2, synced clean |
| `packages/query` | **40 of 40 passing** (Day 14 done, +13 for the five-state derivation); `scripts/check.ts` and `scripts/states.ts` pass live against the deployed Studio endpoint |
| `packages/ens` | **11 of 11 passing** (Day 15 done); pure seams unit-tested (env validation, UTS-46 name normalisation, address checksumming); `scripts/check.ts` passes live against real mainnet ENS through the Universal Resolver |

`packages/web` and `scripts` are named in `docs/architecture.md` and do not exist yet
(`packages/web` is Day 20; the `scripts` M1 runner is Day 16). `packages/subgraph` exists
with its schema, manifest, four implemented event handlers and matchstick coverage
(Days 10–11), and is deployed to Studio (Day 12, slug `aletheia` v0.0.2, synced clean).

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

## The first real `ClaimVerified` event (Day 9)

`packages/contracts/scripts/submit-age-claim.ts` ran the whole pipeline against Sepolia
for the first time: a credential the `mock-dev` issuer actually signed, bound to the
submitting wallet; a real Groth16 proof over `age.circom`; a real `submitAgeClaim`
transaction; and the emitted event read back from the mined receipt.

| | Transaction | Block | Result |
|---|---|---|---|
| Success | `0x195671d0f3d105a5401656b7ad35d0cd6d94190fd17061dd6d70833524b92719` | 11674993 | `ClaimVerified` emitted (gas used 312165) |
| Replay | `0x8aaf3b5ee12af4ad7386265578efae83e374905c5cc4c11b3682373889d1088c` | 11674994 | reverted on-chain, `VerificationAlreadyRecorded` |

The emitted event carried `verificationId`
`0xd24a4fc1052a1b7753e1fffd825666a3946fd2ee5c88e8f472fb743fab6928c3`, `claimType 1`,
`issuerId 0xfee4bdf6…be2588` (the `mock-dev` issuer), `claimParameter 18`,
`credentialValidOn 20260910`, and both nullifiers. The replay is a **real failed
transaction**, not a local `to.be.reverted`: gas was supplied explicitly so the node
broadcast and mined it (`status reverted`) rather than the RPC rejecting it during
estimation, and the custom error name was decoded from a live `eth_call` against the same
state. `credentialId` and `identitySecret` are freshly random per run, so the success
path never collides with a record a previous run left behind.

## The five verification states (Day 14)

`packages/query/src/state.ts` adds `deriveVerificationState` — pure (record + `_meta` +
freshness policy + injected `now` in, one of five named states out), the unit-tested seam
the same way the decoders are. Precedence is fixed: `pending / indexer-errored` first
(nothing an errored indexer returns can be trusted), then `pending / awaiting-index`
(absent but a newer block was expected), then `not-found`, then `revoked` (issuer inactive
outranks an old record), then `stale`, then `verified`. Freshness is measured on
`verifiedAt`, not `credentialValidOn`: the latter is day-granular and always today for a
same-day record, so it cannot express sub-day freshness — the module header and
`docs/security.md` carry the reasoning. `createQueryClient().verificationState(id, …)`
composes the live query with the derivation in one round trip; `scripts/states.ts` is the
read/derive gate.

All five were reproduced against the deployed Studio endpoint — no simulated state:

| State | Real cause / artifact |
|---|---|
| `verified` | the stage 11 record `0xd24a4fc1…928c3`, read live under a 30-day freshness window |
| `stale` | the *same* record read under a 1-hour window; it was genuinely ~4.7h old (`verifiedAt` 1789043940) |
| `not-found` | a live query for the all-zero id returned `null` with current meta |
| `pending` | `reproduce-pending.ts` submitted a real claim (tx `0xd7816a31…5801e`, block 11676384); the indexer sat at 11676383 for four polls (`awaiting-index`) then reached 11676384 and the same lookup flipped to `verified` |
| `revoked` | `setActive(mock-dev, false)` on-chain (tx `0x7a7b72f5…4636f`, block 11676390); once indexed the stage 11 record read `revoked` |

The revocation was reversed immediately: `setActive(mock-dev, true)` (tx `0x44bb9fc8…757d`,
block 11676394), confirmed back to `verified` once indexed, so the shared Sepolia
deployment is left exactly as it was — issuer active, both records verifiable. The extra
`pending` submit left a second real `Verification` on-chain
(`0x0053414b…47312`, block 11676384); it is a genuine record, not a fixture.

`packages/contracts` gained `@aletheia/query` as a devDependency (workspace) so
`reproduce-pending.ts` can both submit on-chain and derive the state from the live read in
one process. `scripts/set-issuer-active.ts` (refuses any issuer but `mock-dev`) is the
revoke/restore tool.

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
| 11 | Real `ClaimVerified` event | **closed** — genuine age proof submitted on Sepolia (tx `0x195671d0…`), replay reverted on-chain with `VerificationAlreadyRecorded` (tx `0x8aaf3b5e…`) |
| 12 | Subgraph | **closed** — schema, manifest, mappings and matchstick done (Days 10–11): 6 tests green, `graph codegen`/`graph build` clean, no `eth_call`; deployed to Studio (Day 12), slug `aletheia` v0.0.2, synced with no indexing errors, stage 11 `ClaimVerified` queryable as a real `Verification` |
| 13 | GraphQL query layer | **closed** — `packages/query` reads live from the Studio endpoint: `scripts/check.ts` returned indexer block 11676205, the stage 11 `Verification` matched against its transaction hash and `mock-dev` issuer label, and the derived `Profile.verifications` side; the **five verification states** are now derived by the pure `deriveVerificationState` and all five reproduced from real endpoint data (Day 14) — a real on-chain revoke/restore for `revoked`, a real submit-and-poll for `pending`; 40 unit tests green, no mocked `fetch` (next: Day 15, ENS) |
| 14 | ENS resolution | **closed** — `packages/ens` resolves forward and reverse through the Universal Resolver proxy over mainnet, read-only, viem 2.56: `scripts/check.ts` ran live and `vitalik.eth` → `0xd8dA…6045` with the reverse round-trip, a nonexistent name returned not-found without throwing, and a keccak-derived address with no reverse record returned null; 11 unit tests green, the name resolved live and stored nowhere |
| — | **M1 end-to-end** | not reached; `scripts` runner does not exist |
| 15 | Document extraction | not started; `docs/passport-extraction.md` written (untracked) |
| 16 | Frontend (age only) | not started; package does not exist |
| 17 | NationalityClaim | not started |
| 18 | ExpiryClaim | not started |
| 19 | Multi-claim end-to-end | not started |
| 20 | Security testing | not started; `docs/security.md` threat table written with a `Verified by` column to close |
| 21 | Documentation | not started |

## Working tree

Everything through Day 12 — the schema v2 migration, the Sepolia deployment, the Day 9
`submit-age-claim.ts` run, and the subgraph (schema, mappings, matchstick tests, the
Docker-backed test runner, and the Day 12 Studio deploy) — is committed, most recently as
`8b8016d`. Day 13 added `packages/query` (transport, decoders, typed reads,
`scripts/check.ts`), committed as `ea0d43f`. Day 14 adds the five-state derivation
(`src/state.ts`, `src/state.test.ts`, the `verificationState` client method and the new
exports), the `scripts/states.ts` read/derive gate, the on-chain
`packages/contracts/scripts/set-issuer-active.ts` and `reproduce-pending.ts`, the
`@aletheia/query` devDependency on `packages/contracts` with its `pnpm-lock.yaml` entry,
and the `docs/security.md` freshness refinement, committed as `53f1f36`. Day 15 adds
`packages/ens` — `src/endpoint.ts` (the `MAINNET_RPC_URL` seam), `src/errors.ts`,
`src/resolver.ts` (the forward/reverse resolver), `src/index.ts`, the two unit-test files,
`scripts/check.ts` (the live gate), the package manifest and tsconfigs — plus the new
`viem` workspace entry in `pnpm-lock.yaml`, committed alongside this file and `TODO.md`.
The subgraph's `generated/` and `build/`, the `dist/` of each package, the Ignition
deployment artifacts and all other build output remain gitignored.

**Toolchain note (Day 11):** the subgraph's `@graphprotocol/graph-ts` was pinned down from
`0.38.2` to `0.35.0`. matchstick 0.6.0 is the newest matchstick release and it compiles
with `assemblyscript` 0.19.23 (its bundled `bin/asc` layout); graph-ts 0.36+ moved to
assemblyscript 0.27.31, which matchstick 0.6.0 cannot invoke. 0.35.0 is the last graph-ts
on asc 0.19.x, and `graph codegen`/`graph build` still run clean on it. The subgraph also
gains `assemblyscript@0.19.23` and `matchstick-as@0.6.0` as devDependencies.
