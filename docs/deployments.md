# Deployments

No contracts have been deployed yet. This file is filled in at stage 10 with real
addresses produced by `packages/contracts/ignition`, each verified on Etherscan.

Placeholder addresses are never written here. If an address is absent, it does not exist.

## Sepolia (chain id 11155111)

Credential schema **v2** (nine public signals). Deployed 2026-09-10 by
`0xA66f7fc3F125b06a5fd4f107D31a400103866cAe`. `setClaimVerifier(1, Groth16VerifierAge)`
confirmed in block 11674709. All four are verified on Etherscan (and Sourcify).

| Contract | Address | Deploy block | Etherscan |
|---|---|---|---|
| `AletheiaIssuerRegistry` | `0xC3F1ee25b47BbFD25B359B2301ABbDF27d987286` | 11674698 | [code](https://sepolia.etherscan.io/address/0xC3F1ee25b47BbFD25B359B2301ABbDF27d987286#code) |
| `Groth16VerifierAge` | `0x369b25B54a7829dE4343eA3625f0FC7D8A2D6eb7` | 11674698 | [code](https://sepolia.etherscan.io/address/0x369b25B54a7829dE4343eA3625f0FC7D8A2D6eb7#code) |
| `AletheiaVerifier` | `0x110BB3af042ecbeA118d399e300a4358DC9b993c` | 11674703 | [code](https://sepolia.etherscan.io/address/0x110BB3af042ecbeA118d399e300a4358DC9b993c#code) |
| `AletheiaProfile` | `0x64C2c9974B5f6960E9671C0D843a29Be499dB534` | 11674698 | [code](https://sepolia.etherscan.io/address/0x64C2c9974B5f6960E9671C0D843a29Be499dB534#code) |

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

| Field | Value |
|---|---|
| Studio slug | not deployed |
| Query URL | not deployed |
| Start block | 11674698 |
