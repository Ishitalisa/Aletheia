/**
 * Where the subgraph is.
 *
 * The endpoint comes from the environment, never from a literal in code, for the same
 * reason contract addresses do: the deployed subgraph is a moving target — every stage
 * that redeploys `AletheiaVerifier` (stages 17 and 18) produces a new subgraph version
 * with a new URL, and a URL baked into a source file is a stale answer waiting to be
 * believed.
 *
 * The repository-root `.env` is loaded the same way `packages/contracts/scripts/*` load
 * it: Node's own env-file loader, no dependency. `hardhat.config.ts` does the same. The
 * current endpoint is also recorded in `docs/deployments.md`, which is the human-readable
 * copy — not the one code reads.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EndpointNotConfiguredError } from "./errors.ts";

/** The repository-root `.env`, resolved from this file rather than the process cwd. */
const ROOT_ENV = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", ".env");

/**
 * Load the repository-root `.env` into `process.env`, if it exists.
 *
 * Idempotent and non-overriding: Node's loader does not replace variables already set,
 * so a value exported in the shell — or injected by CI, which has no `.env` — wins over
 * the file. Safe to call more than once.
 */
export function loadRootEnv(): void {
  if (existsSync(ROOT_ENV)) {
    process.loadEnvFile(ROOT_ENV);
  }
}

/**
 * Validate an endpoint string.
 *
 * Exported separately from `resolveEndpoint` so it can be unit-tested without touching
 * the environment: this is the pure half.
 *
 * https is required rather than merely preferred. The response to these queries decides
 * whether a person is shown as verified, and a plaintext transport lets anyone on the
 * path rewrite that answer.
 */
export function assertQueryEndpoint(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") throw new EndpointNotConfiguredError("is empty");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new EndpointNotConfiguredError(
      `is not a valid URL (${JSON.stringify(trimmed)})`,
    );
  }
  if (url.protocol !== "https:") {
    throw new EndpointNotConfiguredError(
      `must be an https URL, found ${JSON.stringify(url.protocol)}`,
    );
  }
  return url.toString();
}

/**
 * The subgraph query endpoint, from `GRAPH_QUERY_URL`.
 *
 * Throws rather than falling back to a default. There is no sensible default: a client
 * pointed at the wrong subgraph returns confident, well-formed, wrong answers.
 */
export function resolveEndpoint(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env["GRAPH_QUERY_URL"];
  if (raw === undefined) throw new EndpointNotConfiguredError("is not set");
  return assertQueryEndpoint(raw);
}
