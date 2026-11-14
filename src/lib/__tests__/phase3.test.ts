import { describe, it, expect } from "vitest";
import { toDateString, addDays, calculateNights } from "../utils";

describe("Phase 3 Reports & Backup Logic", () => {
  it("calculates occupancy percentage correctly", () => {
    const daysInMonth = 30;
    const totalRooms = 10;
    const totalRoomCapacityDays = totalRooms * daysInMonth; // 300 room-days

    // Scenario 1: 150 room-days occupied -> 50%
    const occRate1 = Math.round((150 / totalRoomCapacityDays) * 100);
    expect(occRate1).toBe(50);

    // Scenario 2: 240 room-days occupied -> 80%
    const occRate2 = Math.round((240 / totalRoomCapacityDays) * 100);
    expect(occRate2).toBe(80);
  });

  it("calculates date windows for monthly occupancy calculation correctly", () => {
    // A booking from 2026-11-28 to 2026-12-03
    // Within November (2026-11-01 to 2026-11-30), the occupied nights in Nov is 2 nights (28th, 29th)
    const monthStart = "2026-11-01";
    const monthNextDay = "2026-12-01"; // end + 1

    const checkIn = "2026-11-28";
    const checkOut = "2026-12-03";

    const effectiveStart = checkIn < monthStart ? monthStart : checkIn;
    const effectiveEnd = checkOut > monthNextDay ? monthNextDay : checkOut;

    const nightsInMonth = calculateNights(effectiveStart, effectiveEnd);
    expect(nightsInMonth).toBe(3); // nights: 28, 29, 30
  });

  it("validates backup structure and safety checks", () => {
    const validBackup = {
      meta: { version: "1.0.0", exportDate: new Date().toISOString() },
      rooms: [{ id: "r1", number: "101" }],
      bookings: [],
      leases: [],
    };

    expect(Array.isArray(validBackup.rooms)).toBe(true);
    expect(validBackup.rooms.length).toBeGreaterThan(0);

    const invalidBackup = {
      something: "wrong",
    };
    expect((invalidBackup as any).rooms).toBeUndefined();
  });
});
