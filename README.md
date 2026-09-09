# Aletheia

**Verify the claim, not the document.**

Aletheia is a privacy-preserving credential verification protocol. A holder proves a
statement about a credential — "I am at least 18", "my nationality is India", "my
credential has not expired" — with a zero-knowledge proof, and a verifier checks that
proof on Ethereum. The verifier learns the answer, never the data.

Identity flow:

```
ENS name  ->  wallet address  ->  Aletheia verification records
```

ENS is the human-readable lookup layer. The Graph is the verification-record layer.
Ethereum is the only place cryptographic truth is decided.

## What Phase 1 proves

A successful Aletheia verification proves exactly this:

> The holder of this wallet possesses a credential signed by issuer `X`, that credential
> has not expired as of date `D`, and it satisfies claim `C`.

## What Phase 1 does NOT prove

- **It does not prove government identity.** Phase 1 uses a clearly labelled
  development issuer (`mock-dev`, see `packages/issuer-mock`) whose only job is to
  sign a normalized credential. It performs no identity checks.
- **It does not prove a PDF is genuine.** PDF extraction is *input only*. Uploading a
  document proves nothing. Trust comes solely from the issuer's signature over the
  normalized credential, never from the document.
- **It is not production-ready cryptography.** The Groth16 phase-2 ceremony is
  single-contributor in Phase 1. See `docs/trust-model.md`.

A real credential source (DigiLocker / API Setu) replaces the mock issuer without
changing the circuits, contracts, or subgraph. See `docs/phase2-digilocker.md`.

## Privacy boundaries

Never leaves the holder's device: the PDF, extracted text, date of birth, expiry date,
nationality value, credential ID, and issuer signature.

Never written to Ethereum, the subgraph, or ENS: any of the above.

Published by a proof, by design: the issuer's public key, the date the credential was
checked against, the claim parameter the verifier itself chose (e.g. `18`), a
per-context nullifier, and the holder's address. A successful nationality claim
necessarily reveals the nationality it was asked about; the UI states this before
proving.

## Documentation

| Document | Contents |
|---|---|
| `docs/architecture.md` | Full architecture and staged implementation plan |
| `docs/trust-model.md` | What is trusted, what is mocked, what is not proven |
| `docs/toolchain.md` | Required toolchain, including the circom 2.x requirement |
| `docs/credential-schema.md` | Normalized credential v1 and signed-message layout |
| `docs/date-format.md` | Canonical date representation and boundary behaviour |
| `docs/public-signals.md` | Frozen public-signal order per circuit |
| `docs/security.md` | Threat model and mitigations |
| `docs/deployments.md` | Deployed contract addresses per network |
| `docs/phase2-digilocker.md` | Replacing the mock issuer with a real credential source |
| `docs/phase2-ens-subnames.md` | Why Phase 1 issues no ENS subnames, and what issuing them would require |

## Status

Under construction, stage by stage, against the plan in `docs/architecture.md`.
Nothing is simulated: no placeholder proofs, transaction hashes, GraphQL responses,
ENS records, or verification results exist in this repository.
