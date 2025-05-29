import type { Duration } from "date-fns";
const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = SECONDS_IN_MINUTE * 60;
const SECONDS_IN_DAY = SECONDS_IN_HOUR * 24;
const SECONDS_IN_WEEK = SECONDS_IN_DAY * 7;
const SECONDS_IN_MONTH = SECONDS_IN_DAY * 30;
const SECONDS_IN_YEAR = SECONDS_IN_DAY * 365;
const MIN_SECONDS = 0;
const MAX_SECONDS = 2147483647;

export function durationToSeconds({
  duration,
  defaultDuration = { hours: 24 },
  useMinMaxSeconds = false,
  minSeconds = MIN_SECONDS,
  maxSeconds = MAX_SECONDS,
}: {
  duration?: Duration;
  defaultDuration?: Duration;
  useMinMaxSeconds?: boolean;
  minSeconds?: number;
  maxSeconds?: number;
}): number {
  let durationToUse = duration;
  if (!duration) {
    durationToUse = defaultDuration;
  }
  let seconds = durationToUse?.seconds ?? 0;
  seconds += (durationToUse?.minutes ?? 0) * SECONDS_IN_MINUTE;
  seconds += (durationToUse?.hours ?? 0) * SECONDS_IN_HOUR;
  seconds += (durationToUse?.days ?? 0) * SECONDS_IN_DAY;
  seconds += (durationToUse?.weeks ?? 0) * SECONDS_IN_WEEK;
  seconds += (durationToUse?.months ?? 0) * SECONDS_IN_MONTH;
  seconds += (durationToUse?.years ?? 0) * SECONDS_IN_YEAR;
  if (useMinMaxSeconds && (seconds < minSeconds || seconds > maxSeconds)) {
    return durationToSeconds({ duration: defaultDuration });
  }
  return seconds;
}
