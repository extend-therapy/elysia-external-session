import { describe, expect, test } from "bun:test";
import { durationToSeconds } from "../../src/helpers/durationToSeconds";

describe("durationToSeconds", () => {
  test("should convert days to seconds", () => {
    expect(durationToSeconds({ duration: { days: 1 } })).toBe(86400);
  });

  test("should convert hours to seconds", () => {
    expect(durationToSeconds({ duration: { hours: 1 } })).toBe(3600);
  });

  test("should convert minutes to seconds", () => {
    expect(durationToSeconds({ duration: { minutes: 1 } })).toBe(60);
  });

  test("should use default duration when no duration is provided", () => {
    expect(durationToSeconds({})).toBe(86400); // 24 hours default
  });

  test("should use provided default duration when no duration is provided", () => {
    expect(durationToSeconds({ defaultDuration: { minutes: 10 } })).toBe(600);
  });

  test("should respect useMin - under min", () => {
    // If under min, returns minSeconds
    expect(
      durationToSeconds({
        duration: { seconds: 10 },
        useMin: true,
        minSeconds: 60,
        maxSeconds: 60000, // doesn't use maxSeconds
      }),
    ).toBe(60);
  });

  test("should respect useMax - over max", () => {
    // If overmax, returns maxSeconds
    expect(
      durationToSeconds({
        duration: { days: 100 },
        useMax: true,
        maxSeconds: 3600,
        minSeconds: 60000, // doesn't use minSeconds
      }),
    ).toBe(3600);
  });

  test("should respect useMin - under min (default)", () => {
    // If under min, returns default minSeconds = 0
    expect(
      durationToSeconds({
        duration: { seconds: -10 },
        useMin: true,
      }),
    ).toBe(0);
  });

  test("should respect useMax - over max (default)", () => {
    // If overmax, returns default maxSeconds = 2147483647 (2147483647 seconds = 68 years)
    expect(
      durationToSeconds({
        duration: { years: 100 },
        useMax: true,
      }),
    ).toBe(2147483647);
  });

  test("should handle complex durations", () => {
    expect(durationToSeconds({ duration: { hours: 1, minutes: 30, seconds: 15 } })).toBe(5415);
  });
});
