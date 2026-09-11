# Deployments

No contracts have been deployed yet. This file is filled in at stage 10 with real
addresses produced by `packages/contracts/ignition`, each verified on Etherscan.

Placeholder addresses are never written here. If an address is absent, it does not exist.

## Sepolia (chain id 11155111)

Credential schema **v2** (nine public signals). Originally deployed 2026-09-10 by
`0xA66f7fc3F125b06a5fd4f107D31a400103866cAe`. For **stage 17 (Day 24)** the
`AletheiaVerifier` was **redeployed** to add `submitNationalityClaim`, and the new
`Groth16VerifierNationality` was deployed alongside it (2026-09-11, same deployer). The
contracts are not upgradeable, so a new claim type needs a fresh `AletheiaVerifier`; the
registry, profile and age Groth16 verifier are **reused unchanged**. On the new verifier
`setClaimVerifier(1, Groth16VerifierAge)` and `setClaimVerifier(2, Groth16VerifierNationality)`
were both confirmed in block 11681726. All are verified on Etherscan (and Sourcify).

| Contract | Address | Deploy block | Etherscan |
|---|---|---|---|
| `AletheiaIssuerRegistry` (reused) | `0xC3F1ee25b47BbFD25B359B2301ABbDF27d987286` | 11674698 | [code](https://sepolia.etherscan.io/address/0xC3F1ee25b47BbFD25B359B2301ABbDF27d987286#code) |
| `Groth16VerifierAge` (reused) | `0x369b25B54a7829dE4343eA3625f0FC7D8A2D6eb7` | 11674698 | [code](https://sepolia.etherscan.io/address/0x369b25B54a7829dE4343eA3625f0FC7D8A2D6eb7#code) |
| `Groth16VerifierNationality` | `0xB559D20Be873531F59d4A6020A481A32D9384Ab4` | 11681716 | [code](https://sepolia.etherscan.io/address/0xB559D20Be873531F59d4A6020A481A32D9384Ab4#code) |
| `AletheiaVerifier` | `0xce95C47Ce991B6DB19cF0c55D0fAe3C6CA14a1cA` | 11681721 | [code](https://sepolia.etherscan.io/address/0xce95C47Ce991B6DB19cF0c55D0fAe3C6CA14a1cA#code) |
| `AletheiaProfile` (reused) | `0x64C2c9974B5f6960E9671C0D843a29Be499dB534` | 11674698 | [code](https://sepolia.etherscan.io/address/0x64C2c9974B5f6960E9671C0D843a29Be499dB534#code) |

The **previous `AletheiaVerifier`** at `0x110BB3af042ecbeA118d399e300a4358DC9b993c`
(deploy block 11674703) still holds its stage-8..16 age-claim records. Those records are
valid and immutable, so the subgraph indexes that address as a second, historical
`AletheiaVerifier` data source alongside the new one rather than orphaning them (Decision 2);
new records come from the new verifier above.

A retired **v1** deployment (seven-signal, obsolete) previously occupied
`0x51623fDD…`, `0x96888b28…`, `0x899DC043…`, `0x906c2D20…`. It served an incompatible
circuit, is not upgradeable, and has been dropped; those addresses are not used.

## Registered issuers

`ax`/`ay` are the mock issuer's EdDSA public key. It is a **mock** — it verifies no
identity; registering it only makes `mock-dev` credentials verifiable. Registered in
block 11674721 (tx `0xe58167bb6d5ddc0dbf4c67aad0982f026d85efda7e14df01a2afc00a70cee2dc`).

| `issuerId` | Label | Public key | Active |
|---|---|---|---|
| `0xfee4bdf6ec605973cbc4ae331ef4c92cfc89ce43fb42da6d4d6517a164be2588` | `mock-dev` | ax `15808909928821364056960736135823935383830781668867221144693156124101082714209`, ay `16093738387085587958022137404017811413083228893645485512866626227058972605355` | yes |

## Subgraph

Redeployed to Subgraph Studio on Sepolia 2026-09-11 as **`v0.0.3`** for stage 17 (Day 24).
It indexes **two** `AletheiaVerifier` data sources: the redeployed verifier
`0xce95C47Ce991B6DB19cF0c55D0fAe3C6CA14a1cA` (start block 11681721, age and nationality)
and the previous verifier `0x110BB3af042ecbeA118d399e300a4358DC9b993c` (start block 11674703,
historical age records). Both share one mapping, so the redeploy keeps the old age records
rather than orphaning them (Decision 2). Synced with no indexing errors: after the Day 24
run the endpoint returns six records — five age (claim type 1) from the previous verifier
and one nationality (claim type 2, code 356) from the new verifier
(id `0x7977b92fe1b450fc36e6c8afe084615e07a1d2f7658855450e9ede02a09bb9d8`, tx `0xa8e78532…`).

The first real subgraph shipped as `v0.0.2` on 2026-09-10 (an earlier `v0.0.1` label had
been reserved by a stale scaffold whose schema had no `Verification` type, and Studio labels
cannot be overwritten). `v0.0.2` remains queryable but is superseded; clients read `v0.0.3`.

| Field | Value |
|---|---|
| Studio slug | `aletheia` |
| Version label | `v0.0.3` |
| Deployment (IPFS) | `QmQ8KFpPhxmWQSrYtEAnsfn3nEvmgTFhNVLeGaMq72fuwE` |
| Query URL | `https://api.studio.thegraph.com/query/1760063/aletheia/v0.0.3` |
| Start block | 11674698 |
| Previous | `v0.0.2` (`QmNu6wYNr71x95ynBpLCMbErm2bCZmNTzAg9umYKvgpVEL`), single verifier, superseded |
