import type { Duration } from "date-fns";
export declare function durationToSeconds({ duration, defaultDuration, useMinMaxSeconds, minSeconds, maxSeconds, }: {
    duration?: Duration;
    defaultDuration?: Duration;
    useMinMaxSeconds?: boolean;
    minSeconds?: number;
    maxSeconds?: number;
}): number;
