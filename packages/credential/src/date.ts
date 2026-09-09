/**
 * The canonical Aletheia date representation: a `uint32` in YYYYMMDD form, always a UTC
 * calendar date. See `docs/date-format.md` for why, and for the boundary tables these
 * functions are tested against.
 *
 * This module is the single source of truth. Extraction, normalization, issuer signing,
 * circuit inputs and the Solidity `DateLib` all agree with it, or one of them is wrong.
 */

import { MAX_DATE_YYYYMMDD, MIN_DATE_YYYYMMDD } from "./constants.ts";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** Days in `month` (1-12) of `year`, proleptic Gregorian. */
export function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new RangeError(`month out of range: ${month}`);
  }
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Split a YYYYMMDD integer into its parts without validating them. */
export function splitYyyymmdd(value: number): CalendarDate {
  return {
    year: Math.trunc(value / 10000),
    month: Math.trunc(value / 100) % 100,
    day: value % 100,
  };
}

/**
 * True when `value` is a real UTC calendar date inside the supported range. Rejects
 * sparse encodings such as 20261232 that are representable but not dates.
 */
export function isValidYyyymmdd(value: number): boolean {
  if (!Number.isInteger(value)) return false;
  if (value < MIN_DATE_YYYYMMDD || value > MAX_DATE_YYYYMMDD) return false;
  const { year, month, day } = splitYyyymmdd(value);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

export function assertValidYyyymmdd(value: number, label: string): void {
  if (!isValidYyyymmdd(value)) {
    throw new RangeError(`${label} is not a valid YYYYMMDD date in range: ${value}`);
  }
}

export function toYyyymmdd(date: CalendarDate): number {
  const value = date.year * 10000 + date.month * 100 + date.day;
  assertValidYyyymmdd(value, "date");
  return value;
}

export function parseYyyymmdd(value: number): CalendarDate {
  assertValidYyyymmdd(value, "date");
  return splitYyyymmdd(value);
}

/** The UTC calendar date of a `Date`, as YYYYMMDD. Time of day is discarded. */
export function dateToYyyymmdd(date: Date): number {
  return toYyyymmdd({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

/** UTC midnight of a YYYYMMDD date. */
export function yyyymmddToDate(value: number): Date {
  const { year, month, day } = parseYyyymmdd(value);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Today's UTC date as YYYYMMDD. */
export function todayUtcYyyymmdd(now: Date = new Date()): number {
  return dateToYyyymmdd(now);
}

/** Largest supported `minimumAge`, matched by the on-chain parameter range check. */
export const MAX_MINIMUM_AGE = 120;

/**
 * The latest date of birth that still satisfies `age >= minimumAge` on `currentDate`.
 *
 * Subtracting `minimumAge * 10000` decrements only the year field, so the result is
 * exact on the birthday itself with no leap-year reasoning. This is the same
 * computation the age circuit performs.
 */
export function ageThresholdYyyymmdd(currentDate: number, minimumAge: number): number {
  assertValidYyyymmdd(currentDate, "currentDate");
  if (!Number.isInteger(minimumAge) || minimumAge < 0 || minimumAge > MAX_MINIMUM_AGE) {
    throw new RangeError(`minimumAge out of range: ${minimumAge}`);
  }
  const threshold = currentDate - minimumAge * 10000;
  if (threshold < MIN_DATE_YYYYMMDD) {
    throw new RangeError(
      `age threshold falls below the supported date range: ${threshold}`,
    );
  }
  return threshold;
}

/** Whether a holder born on `dateOfBirth` is at least `minimumAge` on `currentDate`. */
export function satisfiesMinimumAge(
  dateOfBirth: number,
  currentDate: number,
  minimumAge: number,
): boolean {
  assertValidYyyymmdd(dateOfBirth, "dateOfBirth");
  return dateOfBirth <= ageThresholdYyyymmdd(currentDate, minimumAge);
}

/** Whether a credential expiring on `expiryDate` is still valid on `currentDate`. */
export function isUnexpired(expiryDate: number, currentDate: number): boolean {
  assertValidYyyymmdd(expiryDate, "expiryDate");
  assertValidYyyymmdd(currentDate, "currentDate");
  return expiryDate >= currentDate;
}

/** Completed years between two dates, for display only. Never used in a claim. */
export function completedYears(dateOfBirth: number, currentDate: number): number {
  assertValidYyyymmdd(dateOfBirth, "dateOfBirth");
  assertValidYyyymmdd(currentDate, "currentDate");
  return Math.trunc((currentDate - dateOfBirth) / 10000);
}
