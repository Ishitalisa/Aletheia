export {
  MOCK_ISSUER_LABEL,
  PRIVATE_KEY_BYTES,
  defaultKeystorePath,
  generateKeypair,
  parseKeystore,
  publicKeyFor,
  readKeystore,
  serializeKeystore,
  writeKeystore,
  type IssuerKeypair,
  type KeystoreFile,
} from "./keys.ts";

export {
  createMockIssuer,
  isSignedBy,
  signCredential,
  verifySignedCredential,
} from "./sign.ts";
