/**
 * Browser-safe surface of the circuits package.
 *
 * The pieces a holder flow needs to build a witness input, decode a proof's public
 * signals, and turn a proof into Solidity calldata — none of which touch the filesystem.
 * The Node barrel (`index.ts`) additionally exports the proving path (`prove.ts`,
 * `paths.ts`), which loads compiled artifacts off disk; the browser fetches those
 * artifacts itself and drives snarkjs directly, so it never imports that path.
 */

export {
  AGE_CLAIM,
  ageClaimInput,
  assertAgeClaimRequest,
  type AgeClaimRequest,
  type CircuitInput,
} from "./inputs.ts";

export {
  AGE_PUBLIC_SIGNALS,
  CIRCUIT_SCHEMA_VERSION,
  decodeAgePublicSignals,
  type AgePublicSignals,
} from "./signals.ts";

export {
  toSolidityCalldata,
  type Groth16Proof,
  type ProofResult,
  type SolidityCalldata,
} from "./calldata.ts";
