import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dateToYyyymmdd, isValidYyyymmdd } from "@aletheia/credential";
import { network } from "hardhat";

/**
 * DateLib must agree with the TypeScript codec exactly.
 *
 * If they disagree by a day, a proof built by the client near midnight is rejected by
 * the contract for no reason a user could understand. Ten thousand dates are compared
 * rather than a handful of hand-picked ones, because the interesting cases are leap
 * days, century boundaries and month ends, and a small sample misses them.
 */
describe("DateLib", async () => {
  const { viem } = await network.create();
  const dateLib = await viem.deployContract("DateLibHarness");

  it("matches the TypeScript date codec across the whole supported range", async () => {
    const startTimestamp = Date.UTC(1970, 0, 1) / 1000;
    // The codec supports dates up to 2100-12-31; sampling past it would be testing the
    // test, not the library.
    const endTimestamp = Date.UTC(2100, 11, 31) / 1000;
    const timestamps: bigint[] = [];
    const expected: number[] = [];

    // Every fourth day from 1970 to 2100: about 12,000 samples, covering every month
    // length, every leap year, and both century rules (2000 leap, 2100 not).
    for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += 4 * 86_400) {
      timestamps.push(BigInt(timestamp));
      expected.push(dateToYyyymmdd(new Date(timestamp * 1000)));
    }
    assert.ok(timestamps.length > 10_000, `expected over 10,000 samples, got ${timestamps.length}`);

    // Batched into one eth_call each, rather than 10,000 round trips.
    const actual: number[] = [];
    for (let offset = 0; offset < timestamps.length; offset += 2_000) {
      const chunk = timestamps.slice(offset, offset + 2_000);
      const dates = await dateLib.read.toYyyymmddBatch([chunk]);
      actual.push(...dates.map((date) => Number(date)));
    }

    assert.deepEqual(actual, expected);
  });

  it("handles the boundaries that break naive implementations", async () => {
    const cases: ReadonlyArray<[string, number, number]> = [
      ["unix epoch", Date.UTC(1970, 0, 1) / 1000, 19700101],
      ["leap day 2000", Date.UTC(2000, 1, 29) / 1000, 20000229],
      ["1900 was not a leap year, 2000 was", Date.UTC(2000, 2, 1) / 1000, 20000301],
      ["leap day 2024", Date.UTC(2024, 1, 29) / 1000, 20240229],
      ["2100 is not a leap year", Date.UTC(2100, 1, 28) / 1000, 21000228],
      ["day after 2100-02-28", Date.UTC(2100, 2, 1) / 1000, 21000301],
      ["last second of a year", Date.UTC(2025, 11, 31, 23, 59, 59) / 1000, 20251231],
      ["first second of a year", Date.UTC(2026, 0, 1, 0, 0, 0) / 1000, 20260101],
      ["month end", Date.UTC(2026, 3, 30) / 1000, 20260430],
    ];

    for (const [label, timestamp, want] of cases) {
      const got = await dateLib.read.toYyyymmdd([BigInt(timestamp)]);
      assert.equal(Number(got), want, label);
    }
  });

  it("truncates the time of day rather than rounding it", async () => {
    // Any moment during a UTC day maps to that day. Rounding up would let a proof
    // built late in the evening claim tomorrow's date.
    const midnight = Date.UTC(2026, 5, 15) / 1000;
    for (const secondsIntoDay of [0, 1, 3_600, 43_200, 86_399]) {
      const got = await dateLib.read.toYyyymmdd([BigInt(midnight + secondsIntoDay)]);
      assert.equal(Number(got), 20260615);
    }
  });

  it("produces dates the TypeScript validator accepts", async () => {
    for (const year of [1970, 2000, 2026, 2100]) {
      for (const month of [0, 1, 6, 11]) {
        const got = await dateLib.read.toYyyymmdd([BigInt(Date.UTC(year, month, 15) / 1000)]);
        assert.ok(isValidYyyymmdd(Number(got)), `${got} should be a valid YYYYMMDD`);
      }
    }
  });
});
