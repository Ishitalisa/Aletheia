# Trust model

Aletheia has two layers, stacked and independent. Keeping them apart is the whole design.

```
authenticity layer   an issuer signs a normalized credential   (Phase 1: MOCK issuer)
claim layer          a ZK proof shows a signed credential satisfies a claim
```

The claim layer never learns who the issuer is beyond a public key, so replacing the
issuer does not touch the circuits, contracts, or subgraph.

## The PDF is input, not evidence

```
PDF  ->  extracted candidate fields  ->  normalized credential  ->  ISSUER SIGNATURE  ->  trusted credential
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^      ^^^^^^^^^^^^^^^^
         untrusted, user-correctable, may fail outright              the only source of trust
```

A PDF upload proves nothing whatsoever. Extraction is a convenience that saves typing.
Where a document layout is unsupported or extraction confidence is low, Aletheia says so
and asks for manual entry rather than guessing. Extraction code lives in the web package
and has no ability to sign; the issuer package cannot read PDFs. The separation is
structural, not a matter of discipline.

## What a verification record means

A `ClaimVerified` event means, and only means:

> The wallet that sent this transaction holds a credential carrying a valid signature
> from the issuer public key recorded in this event; that credential's expiry date is not
> before the date recorded in this event; and it satisfies the claim recorded in this
> event.

It does not mean the holder is who they say they are. That depends entirely on how much
the issuer is worth trusting.

## Phase 1 issuer: mock, labelled, isolated

`packages/issuer-mock` generates an EdDSA (BabyJubjub / Poseidon) keypair and signs any
normalized credential handed to it. It performs **no identity verification of any kind**.

Containment measures:

- registered on-chain in `AletheiaIssuerRegistry` with the label `mock-dev`
- that label is carried into the subgraph as `Issuer.label` and rendered in every UI
  surface that shows a record, so a mock-signed record stays distinguishable forever
- private key is generated locally, stored in a gitignored directory, never deployed
- the signer binds to localhost only
- it is the **only** sanctioned mock in this repository

Any claim that a mock-signed credential proves government identity would be false.

## Trusted setup status

- **Phase 1 (universal):** the published Perpetual Powers of Tau `ptau` file, pinned by
  hash. Real, multi-party.
- **Phase 2 (per circuit):** **single contributor** during development. This is a real
  trust assumption: whoever ran the contribution could forge proofs if they retained the
  toxic waste.

**This blocks production use.** A multi-party phase-2 ceremony is required before any
real issuer is registered.

## Trust anchors, summarised

| Anchor | Trusted for | Failure if compromised |
|---|---|---|
| Issuer signing key | truth of credential fields | forged credentials become provable |
| Phase-2 ceremony contributor | soundness of proofs | forged proofs verify |
| `AletheiaVerifier` owner | which verifier contract serves which claim type, which issuers are active | attacker-chosen verifier accepts anything |
| Ethereum Sepolia | ordering, finality, replay state | — |
| The Graph indexer | availability and freshness of records, never validity | stale or missing records; cannot fabricate one that has no matching event |
| ENS | mapping a name to an address today | wrong address looked up; no effect on any proof |

The frontend is trusted for nothing. Every record it displays is backed by an on-chain
transaction the verifier can inspect independently.
