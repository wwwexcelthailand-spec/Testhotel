import { describe, it, expect } from "vitest";
import {
  calculateNights,
  isDailyRangeOverlap,
  isDailyOverlappingLease,
} from "../utils";

describe("Room Booking & Lease Rules", () => {
  it("calculates nights accurately based on check-in (14:00) and check-out (12:00)", () => {
    expect(calculateNights("2026-11-10", "2026-11-11")).toBe(1);
    expect(calculateNights("2026-11-10", "2026-11-13")).toBe(3);
  });

  it("allows back-to-back daily bookings where guest A checks out before 12:00 and guest B checks in at 14:00 on the same day", () => {
    // Guest A: 10 -> 12, Guest B: 12 -> 14
    expect(isDailyRangeOverlap("2026-11-10", "2026-11-12", "2026-11-12", "2026-11-14")).toBe(false);
    // Guest B: 08 -> 10, Guest A: 10 -> 12
    expect(isDailyRangeOverlap("2026-11-10", "2026-11-12", "2026-11-08", "2026-11-10")).toBe(false);
  });

  it("blocks overlapping daily bookings", () => {
    expect(isDailyRangeOverlap("2026-11-10", "2026-11-13", "2026-11-12", "2026-11-15")).toBe(true);
    expect(isDailyRangeOverlap("2026-11-10", "2026-11-15", "2026-11-11", "2026-11-12")).toBe(true);
  });

  it("blocks daily bookings on rooms with an active monthly lease", () => {
    // Lease: 2026-11-01 to 2026-11-30
    expect(
      isDailyOverlappingLease("2026-11-10", "2026-11-12", "2026-11-01", "2026-11-30")
    ).toBe(true);
    // Booking on the last day of lease (2026-11-30 -> 2026-12-01) is still blocked
    expect(
      isDailyOverlappingLease("2026-11-30", "2026-12-01", "2026-11-01", "2026-11-30")
    ).toBe(true);
    // Booking after lease ends (2026-12-01 -> 2026-12-03) is allowed
    expect(
      isDailyOverlappingLease("2026-12-01", "2026-12-03", "2026-11-01", "2026-11-30")
    ).toBe(false);
  });
});
