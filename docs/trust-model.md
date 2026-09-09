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

- **Phase 1 (universal):** the published Perpetual Powers of Tau file is preferred and is
  verified against the blake2b hash published in the snarkjs README, so any mirror will
  do — the hash is what is trusted, not the host.

  In practice both official hosts (the `zkevm` Google Storage bucket and the legacy
  Hermez S3 bucket) currently return HTTP 403 for every power, so `scripts/setup.ts`
  falls back to **generating a phase 1 locally**, which has no multi-party guarantee at
  all. Which one was used is recorded in `build/<circuit>/setup.json` as
  `phase1Provenance`, so the two can never be confused. Set `ALETHEIA_PTAU` to a local
  copy of the published file to use the real ceremony instead.
- **Phase 2 (per circuit):** **single contributor** during development. Whoever ran the
  contribution could forge proofs if they retained the toxic waste. The beacon value in
  `scripts/setup.ts` is a fixed development constant, not public randomness, and is
  labelled as such in the code.

**This blocks production use**, and would even with a perfect phase 1: a multi-party
phase-2 ceremony with published transcripts is required before any real issuer is
registered. Every setup record carries `productionReady: false` for this reason.

What this does *not* undermine: the proofs are real Groth16 proofs, the circuit is real,
and verification genuinely fails for invalid inputs. An unsound setup means someone with
the toxic waste could forge a proof — it does not mean the system is faking proofs.

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
