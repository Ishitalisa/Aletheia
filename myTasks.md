# Your tasks

Work that cannot be done from the editor. Each entry says which task it blocks and what
"done" looks like. Nothing here is urgent until the stage that needs it.

Agents: add to this file rather than stubbing around a missing credential, and say so in
chat rather than leaving the entry to be found.

---

## Blocking stage 10 — Sepolia deployment

Nothing before stage 10 needs any of these, so there is no rush until Part 0 and stage 9
are closed.

### 1. Sepolia RPC endpoint

- [x] Create a Sepolia endpoint (Alchemy, Infura, dRPC, or self-hosted) and put it in the
  ```
  root `.env` as `SEPOLIA_RPC_URL`.
  ```

Done when `pnpm --filter @aletheia/contracts exec node --experimental-strip-types scripts/preflight.ts`
prints `chain id: 11155111`.

### 2. A funded deployer account

- [x] Fund the deployer with Sepolia ETH from a faucet. `preflight.ts` refuses to
  ```
  continue below **0.01 ETH**, which is sized for four contracts plus the
  `setClaimVerifier` call.
  ```
- [x] Decide where the key lives. **Resolved: the key lives in the root `.env`.**
  ```
  `hardhat.config.ts` loads the root `.env` into `process.env` and resolves
  `SEPOLIA_PRIVATE_KEY` through `configVariable`, matching `preflight.ts`, which already
  read it from there. `.env.example` and the config comments were updated to say so, and
  the keystore instruction was removed. Use a throwaway key.
  ```

Done when `preflight.ts` prints a deployer address and a balance above the floor, and
exits with "pre-flight checks passed".

Use a throwaway key. This account only ever holds faucet ETH.

### 3. Etherscan API key

- [x] Create an Etherscan API key and put it in `.env` as `ETHERSCAN_API_KEY`.

Done when all four deployed contracts show verified source on Sepolia Etherscan. The
stage 10 gate requires verified addresses, so this is not optional.

---



## Blocking stage 12 — Subgraph



### 4. Subgraph Studio account and deploy key

- [x] Create a subgraph in [Subgraph Studio](https://thegraph.com/studio) on **Sepolia**.
- [x] Put the deploy key in `.env` as `GRAPH_DEPLOY_KEY`, and the query endpoint as
  ```
  `GRAPH_QUERY_URL` once the first deploy succeeds.
  ```

Done when the stage 11 transaction is queryable as a real entity from the Studio
endpoint.

---



## Blocking stage 14 — ENS resolution



### 5. Mainnet RPC endpoint

- [ ] Create a **mainnet** endpoint and put it in `.env` as `MAINNET_RPC_URL`.

Read-only, used solely to resolve ENS names through the Universal Resolver. Aletheia
never writes to ENS and never creates ENS state.

- [ ] Nominate a real ENS name to use as the resolution test case. It does not need to be
  ```
  yours, and it must not be invented — the stage 14 gate is that a *real* name
  resolves.
  ```

---



## Blocking stage 16 — Frontend



### 6. WalletConnect project id (optional)

- [ ] Only needed if the frontend supports non-injected wallets. If MetaMask and other
  ```
  injected connectors are enough, skip it and delete the variable from `.env.example`.
  ```

---



## Not blocking, but a decision only you can make



### 7. The phase-1 trusted setup file

The circuits currently build against `aletheia_dev_14.ptau`, a **locally generated
development file**. `.cursor/rules/zk-proof.mdc` requires a published Perpetual Powers of
Tau file pinned by hash, and `docs/security.md` permits a local one only when it is
recorded as such.

- [ ] Either download a published Perpetual Powers of Tau file of the right power and
  ```
  pin its hash, or decide the local file stays for Phase 1 and say so explicitly in
  `docs/trust-model.md`.
  ```

Either answer is defensible. Leaving it undecided is not, because the current state reads
as a real ceremony to anyone who does not check the build output.