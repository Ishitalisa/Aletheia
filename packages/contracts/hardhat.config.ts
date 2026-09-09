import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

/**
 * The optimizer is enabled in both profiles on purpose: the snarkjs-generated Groth16
 * verifiers are assembly-heavy, and test gas numbers should reflect what is deployed
 * rather than an unoptimised build nobody will use.
 */
const settings = {
  optimizer: { enabled: true, runs: 200 },
} as const;

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: { version: "0.8.28", settings },
      production: { version: "0.8.28", settings },
    },
  },
  networks: {
    // Local simulated chain used by the test suite.
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // Secrets come from the Hardhat keystore or the environment, never from a file in
    // the repository. See .env.example.
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
