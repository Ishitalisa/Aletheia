export {
  createQueryClient,
  type PageOptions,
  type QueryClient,
  type QueryClientOptions,
} from "./client.ts";

export {
  assertQueryEndpoint,
  loadRootEnv,
  resolveEndpoint,
} from "./endpoint.ts";

export {
  EndpointNotConfiguredError,
  GraphQueryError,
  GraphTransportError,
  MalformedResponseError,
} from "./errors.ts";

export type {
  Hex,
  IndexingMeta,
  Issuer,
  Profile,
  ProfileRecord,
  QueryResult,
  Verification,
  VerificationIssuer,
} from "./types.ts";

// The decoders are exported because they are the honest seam of this package: pure,
// total, and the only part a test can exercise without the network. Nothing downstream
// needs them to read the subgraph.
export {
  decodeIssuer,
  decodeMeta,
  decodeNullable,
  decodeProfile,
  decodeVerification,
  decodeVerifications,
} from "./decode.ts";

// The GraphQL documents, exported so a caller can see exactly what is sent rather than
// take this package's word for it.
export {
  ISSUER_QUERY,
  META_QUERY,
  PROFILE_QUERY,
  RECENT_VERIFICATIONS_QUERY,
  VERIFICATION_QUERY,
} from "./queries.ts";
