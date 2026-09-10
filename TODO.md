# Todo

Everything left, broken into days. One day is one bounded task that can be built and
tested in isolation, per `AGENTS.md`.

Read `STATUS.md` for where the project actually is. Read `myTasks.md` for the things only
the human can unblock.

**Exit criteria are not optional and not negotiable downward.** A day is done when its
criteria demonstrably pass — a test run, a transaction hash, an indexed entity — not when
the code looks finished. Gates involving proofs, chain or indexing are closed by real
artifacts, never by a unit test alone.

The ordering is dependency, not preference. Stages 4 to 13 all decode against a frozen
public-signal layout, so the schema v2 migration lands before anything else is worth
building.

---

# Part 0 — Finish the schema v2 migration

The only thing standing between the repository and a green build.

## Day 1 — Unbreak `packages/credential`

Two tests carry v1 expectations, and three v2 behaviours have no test at all.

- [x] `src/constants.test.ts`: "schema version is pinned" asserts `1`; the constant is
      now `2`.
- [x] `src/constants.test.ts`: pin `MAX_SCHEMA_VERSION`. It is exported and unpinned, and
      the contract will route on it as a `uint16`.
- [x] `src/hash.test.ts`: "field order is load-bearing" hashes a hand-built **seven**
      element array. Rebuild it as the v2 eight-element message. Take `schemaVersion` and
      `identitySecret` from the fixture — the fixture's `expected.messageHash` is already
      a correct v2 value, so do not paste the number the failure printed.
- [x] `src/hash.test.ts`: "message hash changes when any signed field changes" has no
      `identitySecret` row. It is a signed field now; add it.
- [x] `src/hash.test.ts`: nothing asserts `identityNullifier`. The fixture pins
      `expected.identityNullifier` and `test-fixture.ts` loads it, but no test reads it.
      Add one, and assert the properties the function claims: unchanged across claim
      types and across a change of `subject`, changed by a different `contextId`.

**Exit criteria**

- `pnpm --filter @aletheia/credential test` green, and the total count has gone **up**
  from 31 — a green run at 31 means coverage was removed rather than fixed.
- Every pinned vector in `hash.test.ts` traces to `fixtures/credential-v2.json`.
- `pnpm -r run typecheck` green.

## Day 2 — Re-export the Solidity verifier

- [x] Run `packages/contracts/scripts/export-verifier.ts` against the new zkey. Committed
      verbatim, never hand-edited. Output should be `verifyProof(..., uint[9])`.
- [x] Confirm `test/Groth16VerifierAge.ts` asserts the committed verifier against the
      current verification key, and that it actually fails if pointed at the old one.

**Exit criteria**

- On-chain `verifyProof` returns true for a real v2 proof produced by
  `packages/circuits`, and false for a mutation of every public signal and of the proof.
- The committed `.sol` matches `age_vkey.json`, asserted by test.

## Day 3 — Migrate `AletheiaVerifier`

- [x] Replace `IGroth16Verifier7` with the nine-signal interface.
- [x] Widen `submitAgeClaim` to `uint256[9]`, and move every hardcoded index to the new
      layout: `nullifier` 0, `identityNullifier` 1, `schemaVersion` 2, `issuerAx` 3,
      `issuerAy` 4, `currentDate` 5, `minimumAge` 6, `contextId` 7, `subject` 8.
- [x] Reject a `schemaVersion` the contract was not deployed for. The circuit pins it, so
      the contract cannot be fooled — but it should refuse rather than accept silently.
      Add the constant and a `SchemaVersionNotSupported` error.
- [x] Decide whether `ClaimVerified` carries `identityNullifier`. **Decided: it carries
      it.** That is the reason the signal exists, it is in calldata regardless, and the
      subgraph needs it indexable to make the per-context correlation observable. The
      consequence — a per-context correlation handle that links an identity's wallets
      within a context but not across contexts — was written into `docs/trust-model.md`
      before the event field was added. Non-indexed, since the event already uses its
      three indexed slots.

**Exit criteria**

- `pnpm --filter @aletheia/contracts test` green.
- A v1 seven-signal proof cannot be submitted, and fails with a named error rather than
  an ABI decode failure.

## Day 4 — Update the normative documents and commit

- [x] `docs/public-signals.md`: replace the AgeClaim table with the nine-signal layout.
      Fix the "Seven signals total, which is why the generated verifier takes `uint[7]`"
      sentence. This document is normative and is currently wrong.
- [x] Re-read `docs/credential-schema.md` against shipped code; it was written while the
      design was still moving.
- [x] Commit the migration as reviewable commits — `credential`, `circuits`, `contracts`,
      docs — rather than the one four-package change it is now.

**Exit criteria**

- The layout in `docs/public-signals.md`, in `AGE_PUBLIC_SIGNALS`, in the generated
  verifier and in `AletheiaVerifier` all agree, asserted by a test rather than by reading.
- `pnpm -r run test` green from a clean checkout.
- `git status` clean.

---

# Part 1 — Chain

## Day 5 — Stage 9: the negative suite

- [x] Restore full negative coverage under v2: wrong subject, stale date, future date,
      out-of-range parameter, unregistered issuer, revoked issuer, nullifier reuse,
      malformed proof, wrong schema version.
- [x] Assert the nullifier is marked used **before** the external verifier call, since
      that ordering is the reentrancy defence.

**Exit criteria** — every failure mode has its own test and its own custom error; no test
asserts a generic revert.

## Day 6 — Stage 9: `DateLib`

- [x] `DateLib.toYyyymmdd` matches the TypeScript codec over 10,000 dates spanning
      1900-2100, including every leap-year boundary. **Note:** the comparison starts at
      the Unix epoch (1970), not 1900. `DateLib` takes a `uint256` timestamp and is only
      ever fed `block.timestamp` (`AletheiaVerifier` converts "now" into `currentDate`
      and never runs a birth or expiry date through it), so a pre-1970 date is a negative
      Unix timestamp — unrepresentable as `uint256` and out of the library's domain by
      construction. Every day from 1970-01-01 to 2100-12-31 is compared (~47,800
      samples), plus an explicit leap-year-boundary sweep of every Feb 28 / Feb 29 /
      Mar 1 and year rollover in range.

**Exit criteria** — the 10k comparison passes with zero divergence, and the two
implementations are compared directly rather than both against a third table.

## Day 7 — `scripts/register-issuer.ts`

`packages/contracts/ignition/modules/Aletheia.ts` names this script and it does not
exist.

- [ ] Read the mock issuer public key from the local gitignored keystore, call
      `AletheiaIssuerRegistry.register`, label it `mock-dev`.
- [ ] Deliberately not part of the Ignition module: it depends on an operator's local
      files.
- [ ] Refuse to run against a key that is not the local mock issuer's.

**Exit criteria** — against a local Hardhat node, the issuer registers, reads back
active, and a second run fails cleanly rather than double-registering.

## Day 8 — Stage 10: deploy to Sepolia

Needs `myTasks.md` items 1, 2 and 3 done first.

- [ ] Resolve the deployer-key contradiction recorded in `myTasks.md` item 2 before
      spending anything.
- [ ] Run `preflight.ts`, then deploy. The existing v1 deployment is dead — decide
      whether to wipe the Ignition deployment directory or deploy under a new deployment
      id, and whether the retired v1 addresses are recorded or dropped.
- [ ] Register the `mock-dev` issuer with day 7's script.
- [ ] Verify all four contracts on Etherscan.
- [ ] Fill in `docs/deployments.md`: addresses, deploy blocks, Etherscan links, the
      registered `issuerId` and public key. Placeholders are never written there.

**Exit criteria** — four verified addresses on Etherscan, an issuer reading back active
on-chain, and `docs/deployments.md` containing no "not deployed" row.

## Day 9 — Stage 11: a real `ClaimVerified` event

- [ ] Submit a genuine age proof from a funded wallet on Sepolia.
- [ ] Resubmit the same proof and confirm it reverts with `VerificationAlreadyRecorded`
      **on-chain**, not in a local test.

**Exit criteria** — a real transaction hash for the success and a real one for the
revert, both recorded in `STATUS.md`.

---

# Part 2 — Records and reads

## Day 10 — Stage 12: subgraph schema and manifest

- [ ] Create `packages/subgraph`. Entities `Profile`, `Verification`
      (`@entity(immutable: true)`), `Issuer`. `Bytes` ids throughout, `@derivedFrom` on
      the one side of each relation.
- [ ] Manifest on `sepolia`, start block = the stage 10 deploy block.

**Exit criteria** — `graph codegen` and `graph build` clean; no `eth_call` anywhere in
the manifest or mappings.

## Day 11 — Stage 12: mappings and matchstick tests

- [ ] Handle `ClaimVerified`, `IssuerRegistered`, `IssuerRevoked`, `ProfileRegistered`.
- [ ] The `mock-dev` label reaches the `Issuer` entity, because every UI record depends
      on it to mark itself as mocked.

**Exit criteria** — matchstick green, covering a first verification, a second in a
different context, and an issuer revocation.

## Day 12 — Stage 12: deploy the subgraph

Needs `myTasks.md` item 4.

**Exit criteria** — the stage 11 transaction is queryable as a real `Verification` entity
from the Studio endpoint. Record the query URL in `docs/deployments.md`.

## Day 13 — Stage 13: the query client

- [ ] Typed GraphQL client reading `_meta.block.number` and `hasIndexingErrors` alongside
      every record.

**Exit criteria** — a live query against the real endpoint returns the stage 11 record
plus meta. No mocked `fetch` anywhere in the read path.

## Day 14 — Stage 13: the five states

- [ ] Derive `verified`, `stale`, `revoked issuer`, `pending indexing`, `not found`, each
      with its own reason.
- [ ] Each state needs a **real** cause. `revoked` means actually revoking the issuer
      on-chain; `pending` means querying inside the real indexing window.

**Exit criteria** — all five reproduced from real endpoint data, each with the artifact
that caused it. A simulated state does not count.

## Day 15 — Stage 14: ENS resolution

Needs `myTasks.md` item 5. Reference: https://docs.ens.domains/llms-full.txt

- [ ] Forward (`getEnsAddress`) and reverse (`getEnsName`) through the Universal Resolver
      proxy `0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe`. viem pinned `>= 2.35`.
- [ ] Read-only. No registrar, no subname minting, no ENS writes.

**Exit criteria** — a real name resolves to a real address; a name that does not exist
returns not-found rather than throwing; an address with no reverse record is a normal
first-class case.

## Day 16 — M1: the end-to-end runner

- [ ] Create `scripts`. One command: signed credential, circuit, proof, local verify,
      Solidity verify, Sepolia transaction, event, Graph, verifier query.

**Exit criteria** — the command completes against real infrastructure, start to finish,
from a clean checkout, printing the real transaction hash and the real indexed record.

**Nationality and expiry do not begin before this passes.**

---

# Part 3 — Product

## Day 17 — Stage 15: MRZ parsing

- [ ] Implement per `docs/passport-extraction.md` (written, untracked — commit it).
- [ ] Check digits, century inference, the nationality code table.

**Exit criteria** — an MRZ fixture extracts; a failing check digit reports **which
field**; an ambiguous century and an unmappable nationality return *unsupported*, never a
guess.

## Day 18 — Stage 15: image and PDF input

- [ ] Camera scan, image and PDF, all client-side, in a worker. PDF JavaScript disabled,
      size and page caps, no server-side parser, extracted text never evaluated.

**Exit criteria** — a fixture PDF and a fixture image both reach the same candidate
fields as the raw MRZ, and no network request is issued during extraction.

## Day 19 — Stage 15: `documentKey`

`deriveIdentitySecret` already expects a `documentKey` and nothing produces one.

- [ ] Derive it in the extraction layer, which is the only layer that knows the document
      format.

**Exit criteria** — the same passport yields the same `documentKey` twice; two different
passports never collide; it is a field element; it never leaves the device.

## Day 20 — Stage 16: holder flow

- [ ] `packages/web`, Next.js. Extract, review and correct, sign with the mock issuer,
      prove, submit.
- [ ] The review step is mandatory — extraction is untrusted input by construction.
- [ ] Contract addresses come from generated deployment output, never a literal.

**Exit criteria** — a browser run on Sepolia producing a real transaction, with the
document demonstrably never leaving the device (verified in the network tab, not
asserted).

## Day 21 — Stage 16: verifier flow

- [ ] Resolve an ENS name or an address, query, render all five states.
- [ ] Pending is rendered before verified, always. A submitted transaction is never
      rendered as verified.
- [ ] Every record shows the `mock-dev` label and links to its transaction.

**Exit criteria** — the day 20 verification appears as pending, then verified, without a
reload trick; every state reachable in the real UI.

---

# Part 4 — The remaining claims

Each repeats the stage 4 to 13 gates: a new circuit, a new trusted setup, a new generated
verifier, **and a newly deployed `AletheiaVerifier`**, because the contracts are not
upgradeable and each claim type has its own entrypoint. The registry, the profile
contract and the age verifier are reused unchanged.

## Day 22 — Stage 17: `nationality.circom`

- [ ] On the shared base. `requiredNationality` goes in the same generic
      claim-parameter slot age uses, keeping one nine-signal layout across all claims.

**Exit criteria** — compiles `--inspect` clean, constraint count locked, negative cases
fail: wrong nationality, tampered field, wrong issuer, expired credential.

## Day 23 — Stage 17: setup, verifier, contract

- [ ] Trusted setup, export the verifier, freeze the layout in `docs/public-signals.md`,
      add `submitNationalityClaim`.

**Exit criteria** — contract tests green; the layout asserted against artifacts.

## Day 24 — Stage 17: deploy and index

- [ ] Redeploy `AletheiaVerifier`, repoint the subgraph, update `docs/deployments.md`.
- [ ] Disclosure notice shown **before** proving: a successful nationality claim reveals
      the nationality asked about.

**Exit criteria** — a real nationality verification indexed and rendered, with the
disclosure shown pre-proof.

## Day 25 — Stage 18: `expiry.circom`

- [ ] The base expiry check is the whole claim; parameter pinned to zero.

**Exit criteria** — compiles clean, constraints locked, and the `expiryDate ==
currentDate` boundary passes on both sides.

## Day 26 — Stage 18: setup, verifier, contract, deploy

**Exit criteria** — same as day 24, plus the `expiryDate == currentDate` boundary proven
**on-chain**.

## Day 27 — Stage 19: multi-claim end-to-end

**Exit criteria** — three real transactions, three real records, three distinct
`nullifier`s — and the `identityNullifier` identical across all three within one context,
since that is the property it was added for.

---

# Part 5 — Close out

## Day 28 — Stage 20: close the threat table

- [ ] Fill the `Verified by` column in `docs/security.md` for every row, or write an
      explicitly accepted risk. Rows currently pointing at then-unbuilt stages: malicious
      document input, stale verification record, Graph indexing delay, ENS assumptions,
      malicious wallet input, public data leakage, nationality disclosure, frontend
      compromise.

**Exit criteria** — no row left with an unverified mitigation and no written acceptance.

## Day 29 — Stage 20: the threats v2 introduced

- [ ] Add rows the table does not cover: identity-nullifier correlation within a context,
      issuer-salt rotation re-partitioning every identity nullifier, and schema-version
      confusion between deployments.
- [ ] Settle `myTasks.md` item 7, the phase-1 ptau file.

**Exit criteria** — each new row has a passing test or a written accepted risk, and the
trusted setup's real status is stated in `docs/trust-model.md`.

## Day 30 — Stage 21: reconcile the documentation

- [ ] Every document against shipped code. Several were edited mid-migration.
- [ ] Add `STATUS.md`, `TODO.md`, `AGENTS.md` and `myTasks.md` to the README table, or
      delete the ones that have served their purpose.

**Exit criteria** — a stranger reproduces M1 from the documentation alone. Test it with
an actual stranger, or at minimum a clean clone on a fresh machine.
