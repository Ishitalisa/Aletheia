import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * The Aletheia deployment.
 *
 * Ignition rather than a script because a deployment that fails halfway on a public
 * network needs to be resumable: it records what it sent, and re-running continues
 * instead of redeploying contracts that already exist.
 *
 * The issuer is deliberately not registered here. Registration needs the mock issuer's
 * public key, which lives in a gitignored local keystore, and a deployment module is
 * the wrong place for something that depends on an operator's local files. It is a
 * separate, explicit step — see scripts/register-issuer.ts.
 */
export default buildModule("Aletheia", (m) => {
  // Account 0 of the configured network: the deployer becomes the initial owner of the
  // registry and the verifier. Never a hardcoded address.
  const owner = m.getAccount(0);

  const issuerRegistry = m.contract("AletheiaIssuerRegistry", [owner]);

  // The snarkjs-generated verifier for age.circom. Its verification key is baked in, so
  // this contract is only valid for the proving key it was exported from.
  const groth16VerifierAge = m.contract("Groth16VerifierAge");

  const verifier = m.contract("AletheiaVerifier", [owner, issuerRegistry]);
  const profile = m.contract("AletheiaProfile");

  // Without this the verifier has no verifier for claim type 1 and every submission
  // reverts with NoVerifierForClaim, so it is part of the deployment, not an afterthought.
  m.call(verifier, "setClaimVerifier", [1, groth16VerifierAge]);

  return { issuerRegistry, groth16VerifierAge, verifier, profile };
});
