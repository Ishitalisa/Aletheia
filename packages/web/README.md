# @aletheia/web — Phase 1 holder flow

A browser app that takes a passport MRZ, lets the holder review and correct the extracted
fields, signs a `mock-dev` credential, proves an age claim, and submits it to Sepolia —
**all on the device**. The passport (its MRZ, date of birth, nationality, expiry, number)
never leaves the browser; only the proof and its public signals go on-chain.

`mock-dev` is labelled everywhere it appears: this issuer verifies no identity. A
credential signed here proves issuance by a mock issuer and nothing more.

## What runs where

| Step | Where | Package |
|---|---|---|
| Extract MRZ (text / PDF / image) | browser, on-device | `@aletheia/extraction` |
| Review & correct (mandatory) | browser | this app |
| Derive `documentKey`, sign credential | browser (mock issuer on the holder's device) | `@aletheia/issuer-mock/browser`, `@aletheia/extraction/browser` |
| Prove age (Groth16) | browser (snarkjs + wasm/zkey from this origin) | `@aletheia/circuits/browser` + snarkjs |
| Submit `submitAgeClaim` | wallet → Sepolia | `viem` |

Contract addresses come from the generated deployment manifest
(`packages/contracts/deployments/sepolia.json`), never a literal.

## Setup

1. **Build the circuit artifacts** (the wasm and zkey the browser proves with):

   ```bash
   pnpm --filter @aletheia/circuits run build
   ```

   `predev`/`prebuild` copy them into `public/circuits` (they are gitignored, ~10 MB).

2. **Copy the mock-dev issuer keystore** into the app so the browser can sign. The
   keystore is the gitignored one the Node tools use; the app fetches it from its own
   origin and refuses anything not labelled `mock-dev`:

   ```bash
   cp packages/issuer-mock/keys/issuer-mock.json packages/web/public/mock-issuer-keystore.json
   ```

   (Generate it first with `pnpm --filter @aletheia/issuer-mock run keygen` if you have
   none, and register it as the `mock-dev` issuer.)

3. **Configure `.env.local`** (gitignored). The RPC endpoint is used by the dev signer and
   for reads; the dev signer key is optional and only enables the no-extension path:

   ```
   NEXT_PUBLIC_SEPOLIA_RPC_URL=<your Sepolia RPC url>
   NEXT_PUBLIC_DEV_SIGNER_PRIVATE_KEY=<0x… throwaway funded key>   # optional
   ```

## Run

```bash
pnpm --filter @aletheia/web dev
```

Then, at <http://localhost:3000>: load a passport (the "Use sample MRZ" button fills a
specimen MRZ), confirm the fields, connect a wallet, and submit.

## Signing the transaction

- **Injected wallet (MetaMask)** — the real design. Connect your wallet; `subject` in the
  credential must equal the connected address or the contract reverts with
  `SubjectIsNotSender`.
- **Dev signer** — appears only when `NEXT_PUBLIC_DEV_SIGNER_PRIVATE_KEY` is set. Signs
  with the throwaway Sepolia key locally (no extension), so the whole flow including the
  real transaction can run headless. Not the real UX; a testing convenience.
