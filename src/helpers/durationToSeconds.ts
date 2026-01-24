import { add, differenceInSeconds, Duration } from "date-fns";
const MIN_SECONDS = Number(Bun.env.MIN_SECONDS || "0");
const MAX_SECONDS = Number(Bun.env.MAX_SECONDS || "2147483647");

export function durationToSeconds({
  duration,
  defaultDuration = { hours: 24 },
  useMin = false,
  useMax = false,
  minSeconds = MIN_SECONDS,
  maxSeconds = MAX_SECONDS,
}: {
  duration?: Duration;
  defaultDuration?: Duration;
  useMin?: boolean;
  useMax?: boolean;
  minSeconds?: number;
  maxSeconds?: number;
}): number {
  const startDate = new Date(0);
  let durationToUse: Duration | undefined;
  if (!duration) {
    durationToUse = defaultDuration;
  } else {
    durationToUse = duration;
  }
  const endDate = add(startDate, durationToUse);
  const durationSeconds = differenceInSeconds(endDate, startDate);
  if (!(useMin || useMax)) {
    return durationSeconds;
  }
  if (useMin && durationSeconds < minSeconds) {
    return minSeconds;
  }
  if (useMax && durationSeconds > maxSeconds) {
    return maxSeconds;
  }
  return durationSeconds;
}
