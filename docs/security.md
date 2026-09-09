# Security model

Mitigations are listed per threat. The `Verified by` column is filled in as each stage's
tests land; stage 20 audits that no row is left unverified without a written accepted
risk.

## Credential and issuance

| Threat | Mitigation | Verified by |
|---|---|---|
| Self-asserted / forged credential fields | in-circuit `EdDSAPoseidonVerifier` over `Poseidon` of all signed fields; no signature means no witness | stage 4 |
| Forged issuer signature | BabyJubjub EdDSA; issuer public key is a public signal checked against `AletheiaIssuerRegistry`; unknown key reverts | stages 4, 9 |
| Tampered PDF or edited extracted fields | trust derives only from the issuer signature; the PDF is never evidence | stages 3, 15 |
| **Mock issuer signs anything** | inherent to Phase 1 and documented, not mitigated: label `mock-dev` on-chain, surfaced in the subgraph and every UI record | stages 10, 16 |
| Malicious PDF input | parsing only in a browser pdfjs worker, PDF JavaScript disabled, size and page caps, no server-side parser, no evaluation of extracted text | stage 15 |
| Mock issuer key theft | key generated locally, gitignored, signer bound to localhost, never deployed; label keeps mock records distinguishable | stage 3 |

## Proof soundness

| Threat | Mitigation | Verified by |
|---|---|---|
| Invalid or malformed proof | snarkjs-generated verifier reverts; contract validates array shape and signal count first | stages 8, 9 |
| Manipulated public signals | contract independently checks issuer, subject, date freshness and parameter ranges; the circuit range-checks the same values so field wraparound cannot forge a threshold | stages 4, 9 |
| Public-signal reordering after a recompile | order frozen in `docs/public-signals.md` and asserted against generated artifacts | stages 6, 8 |
| Under-constrained circuit | `--inspect` must be clean; constraint count snapshotted; no `<--` without a matching `===` | stage 4 |
| Trusted-setup toxic waste | published Perpetual Powers of Tau for phase 1 when obtainable, hash-verified, otherwise a locally generated phase 1 recorded as such; single-contributor phase 2 in development is a documented blocker for production | `docs/trust-model.md` |

## Replay and identity binding

| Threat | Mitigation | Verified by |
|---|---|---|
| Replaying another holder's proof | `subject` bound into the signed message and into the nullifier; contract requires `subject == msg.sender` | stages 4, 9 |
| Duplicate verification / nullifier grinding | `keccak256(claimType, contextId, nullifier)` marked used before verification | stages 9, 11 |
| Credential shared between wallets | `subject` is part of the issuer-signed message | stages 3, 4 |
| Expired credential | expiry checked inside every claim circuit against the contract-validated `currentDate` | stage 4 |
| Backdated or future-dated proof | contract derives today's UTC date from `block.timestamp` and accepts only `{today, today - 1}` | stage 9 |
| Stale verification record | `credentialValidOn` in the event; verifier-side freshness policy renders `stale` distinctly from `verified` | stage 13 |

## Infrastructure and display

| Threat | Mitigation | Verified by |
|---|---|---|
| Unauthorized issuer or verifier-mapping changes | `Ownable2Step`; every change emits an indexed event | stage 9 |
| Graph indexing delay or errors | `_meta.block.number` and `hasIndexingErrors` drive an explicit `pending` state; a submitted transaction is never rendered as verified | stage 13 |
| ENS assumptions | resolution only through the Universal Resolver proxy with viem >= 2.35; nothing is trusted about a name beyond "resolves to this address now"; no ENS state on-chain | stage 14 |
| Malicious wallet or address input | checksum and `isAddress` validation, chain id asserted before writes, contract addresses never taken from user input | stage 16 |
| Public data leakage | the event carries only issuer id, claim type, claim parameter, validity date, context id, nullifier and subject | stage 20 |
| Nationality-claim disclosure | inherent: a successful claim reveals the nationality asked about. Shown before proving, not buried | stage 17 |
| Frontend compromise | frontend is authoritative for nothing; every record links to its transaction for independent inspection | stage 16 |
