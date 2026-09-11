/**
 * Browser Groth16 proving for the age claim.
 *
 * The witness input is assembled by the shared `ageClaimInput` (so the browser sends the
 * circuit exactly what the Node path does), then snarkjs produces and verifies a real
 * proof against the artifacts served from the app origin — the wasm witness generator and
 * the final zkey under `/circuits`. Only public data crosses into these files; the
 * credential's private fields stay in memory and never leave the device.
 *
 * The proof is verified here before it is returned, the same habit the Node prover keeps:
 * a proof that was never checked is how "verified" comes to mean nothing.
 */

import {
  ageClaimInput,
  decodeAgePublicSignals,
  toSolidityCalldata,
  type AgeClaimRequest,
  type AgePublicSignals,
  type Groth16Proof,
  type SolidityCalldata,
} from "@aletheia/circuits/browser";
import { SCHEMA_VERSION, type SignedCredential } from "@aletheia/credential";
import * as snarkjs from "snarkjs";

const WASM_URL = "/circuits/age.wasm";
const ZKEY_URL = "/circuits/age_final.zkey";
const VKEY_URL = "/circuits/age_vkey.json";

export interface BrowserProof {
  proof: Groth16Proof;
  publicSignals: string[];
  decoded: AgePublicSignals;
  calldata: SolidityCalldata;
}

let vkeyCache: unknown;

async function verificationKey(): Promise<unknown> {
  if (vkeyCache === undefined) {
    const response = await fetch(VKEY_URL, { cache: "force-cache" });
    if (!response.ok) throw new Error(`could not load the verification key (${response.status})`);
    vkeyCache = await response.json();
  }
  return vkeyCache;
}

/**
 * Prove an age claim entirely in the browser. Produces a real proof, verifies it locally
 * against the verification key, checks the public signals say what was asked, and returns
 * the proof plus the Solidity calldata the verifier contract consumes.
 */
export async function proveAgeInBrowser(
  signed: SignedCredential,
  request: AgeClaimRequest,
): Promise<BrowserProof> {
  const input = ageClaimInput(signed, request);

  const { proof, publicSignals } = (await snarkjs.groth16.fullProve(
    input,
    WASM_URL,
    ZKEY_URL,
  )) as { proof: Groth16Proof; publicSignals: string[] };

  if (!(await snarkjs.groth16.verify(await verificationKey(), publicSignals, proof))) {
    throw new Error("produced a proof that does not verify locally; refusing to return it");
  }

  const decoded = decodeAgePublicSignals(publicSignals);
  if (decoded.minimumAge !== request.minimumAge || decoded.currentDate !== request.currentDate) {
    throw new Error("public signals do not match the requested claim");
  }
  if (decoded.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `proof declares schemaVersion ${decoded.schemaVersion}, expected ${SCHEMA_VERSION}`,
    );
  }

  const calldata = await toSolidityCalldata(proof, publicSignals);
  return { proof, publicSignals, decoded, calldata };
}
