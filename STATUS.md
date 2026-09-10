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
`AletheiaVerifier` by `packages/contracts/test/PublicSignalsLayout.ts`. The Sepolia
deployment that was already executed is a v1 deployment that v2 makes obsolete; it must be
redeployed. Nothing downstream of the contracts — subgraph, web frontend, end-to-end
runner — exists yet. The next task is **Day 5**, broadening the contract negative suite.

## Build status

`pnpm -r run typecheck` is green. Per-package test state:

| Package | Result |
|---|---|
| `packages/credential` | **36 of 36 passing** (Day 1 done) |
| `packages/issuer-mock` | **18 passing** (a stale v1 malformed-credential test was fixed during Day 4) |
| `packages/circuits` | **26 of 26 passing** |
| `packages/contracts` | **44 passing** (Day 3 done; +5 for the Day 4 layout-agreement test) |

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
  passing.
- ~~`docs/public-signals.md` is still stale.~~ **Done (Day 4).** It now freezes the
  nine-signal v2 layout, and `packages/contracts/test/PublicSignalsLayout.ts` asserts
  that layout agrees with `AGE_PUBLIC_SIGNALS`, the generated verifier and
  `AletheiaVerifier` — so the normative document cannot silently drift from the code
  again. `docs/credential-schema.md` was re-read against shipped code and carried to v2:
  the `identitySecret` field, the eight-input signed message, the `identityNullifier`
  section, the v2 wire format, and the schema-version-as-public-signal routing rule.

## The Sepolia deployment

A real deployment was executed and is recorded in untracked Ignition artifacts under
`packages/contracts/ignition/deployments/chain-11155111/`. All four contracts deployed and
the `setClaimVerifier(1, ...)` call confirmed in block 11668184:

| Contract | Address |
|---|---|
| `AletheiaIssuerRegistry` | `0x51623fDD54218C70241d85b8e0653b2c751BF087` |
| `Groth16VerifierAge` | `0x96888b2882325a3482A5f64324776A42b68c66fb` |
| `AletheiaVerifier` | `0x899DC043C2a7de25C196ba4C9581f6F924EC44bf` |
| `AletheiaProfile` | `0x906c2D2081dc60f3DC35bF6e4DDB45e9eD96EA6A` |

This deployment is **obsolete**. It serves the v1 seven-signal circuit, the contracts are
deliberately not upgradeable, and no v2 proof can be submitted to it. It has to be
redeployed once the contracts are migrated.

Consequently:

- `docs/deployments.md` still reads "not deployed" in every row, which is currently the
  honest state to publish, since the addresses above will not survive.
- No issuer has been registered on-chain. `packages/contracts/ignition/modules/Aletheia.ts`
  points at `scripts/register-issuer.ts` as the deliberate separate step; **that script
  does not exist**.
- Etherscan verification has not been done for any address.

`packages/contracts/scripts/preflight.ts` (untracked) does exist and works: it confirms
the endpoint really is Sepolia, derives and prints the deployer address, and refuses to
continue below 0.01 ETH.

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
| 9 | Contract tests | **closed under v2** — `AletheiaVerifier` migrated to nine signals, 44 passing; full negative suite (Day 5) still to broaden |
| 10 | Sepolia deployment | executed for v1, obsolete; nothing recorded in `docs/deployments.md` |
| 11 | Real `ClaimVerified` event | not started |
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

Clean. The schema v2 migration was committed as reviewable per-area commits — credential
(with the issuer-mock schema side), circuits, contracts, the normative documents, and the
project scaffolding — rather than the one large four-package change it had become. The
retired `packages/credential/fixtures/credential-v1.json` was deleted in favour of the v2
fixture. Ignition deployment artifacts and all build output remain gitignored.
