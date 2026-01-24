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

  test("should respect useMinMaxSeconds - under min", () => {
    // If undermin, returns defaultDuration (24 hours = 86400)
    expect(
      durationToSeconds({
        duration: { seconds: 10 },
        useMinMaxSeconds: true,
        minSeconds: 60,
      })
    ).toBe(86400);
  });

  test("should respect useMinMaxSeconds - over max", () => {
    // If overmax, returns defaultDuration (24 hours = 86400)
    expect(
      durationToSeconds({
        duration: { days: 100 },
        useMinMaxSeconds: true,
        maxSeconds: 3600,
      })
    ).toBe(86400);
  });

  test("should handle complex durations", () => {
    expect(
      durationToSeconds({ duration: { hours: 1, minutes: 30, seconds: 15 } })
    ).toBe(5415);
  });
});
