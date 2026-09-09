import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CLAIM_TYPE,
  MAX_DATE_YYYYMMDD,
  MIN_DATE_YYYYMMDD,
  SCHEMA_VERSION,
} from "./constants.ts";

// These are wire-format constants: circuits, contracts and the subgraph all decode
// against them. A change here without a coordinated redeploy silently breaks
// verification, so they are pinned by test.
test("schema version is pinned", () => {
  assert.equal(SCHEMA_VERSION, 1);
});

test("claim type ids are pinned and unique", () => {
  assert.deepEqual(CLAIM_TYPE, { AGE: 1, NATIONALITY: 2, EXPIRY: 3 });
  const ids = Object.values(CLAIM_TYPE);
  assert.equal(new Set(ids).size, ids.length);
});

test("date bounds are pinned and ordered", () => {
  assert.equal(MIN_DATE_YYYYMMDD, 19000101);
  assert.equal(MAX_DATE_YYYYMMDD, 21001231);
  assert.ok(MIN_DATE_YYYYMMDD < MAX_DATE_YYYYMMDD);
});
