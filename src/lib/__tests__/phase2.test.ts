import { describe, it, expect } from "vitest";
import {
  calculateLateDays,
  calculateLateFee,
  calculateDepositRefund,
  generateLineBillMessage,
  formatMonthThai,
} from "../utils";

describe("Phase 2 Business Logic & Calculations", () => {
  it("calculates late days and late fees accurately at 50 THB/day", () => {
    // Due on 2026-11-05, checked on 2026-11-05 (on time)
    expect(calculateLateDays("2026-11-05", "2026-11-05")).toBe(0);
    expect(calculateLateFee(0, 50)).toBe(0);

    // Due on 2026-11-05, checked on 2026-11-08 (3 days late)
    expect(calculateLateDays("2026-11-05", "2026-11-08")).toBe(3);
    expect(calculateLateFee(3, 50)).toBe(150);

    // Due on 2026-11-05, checked on 2026-11-15 (10 days late)
    expect(calculateLateDays("2026-11-05", "2026-11-15")).toBe(10);
    expect(calculateLateFee(10, 50)).toBe(500);
  });

  it("calculates deposit refund when tenant moves out deducting damage and unpaid bills", () => {
    // Deposit 14,000 THB, damage 2,000 THB, unpaid 8,104 THB -> refund = 3,896 THB
    const result = calculateDepositRefund({
      securityDeposit: 14000,
      damageDeduction: 2000,
      unpaidDeduction: 8104,
    });
    expect(result.depositRefunded).toBe(3896);

    // If deductions exceed deposit, refund cannot be negative (floors at 0)
    const resultExcess = calculateDepositRefund({
      securityDeposit: 5000,
      damageDeduction: 4000,
      unpaidDeduction: 3000,
    });
    expect(resultExcess.depositRefunded).toBe(0);
  });

  it("generates structured Thai LINE bill message with breakdown and promptpay", () => {
    const text = generateLineBillMessage({
      propertyName: "เดอะ เรทฟอร์ด เรสซิเดนซ์",
      tenantName: "กานดา สุขใจ",
      roomNumber: "301",
      billingMonth: "2026-11",
      dueDate: "2026-11-05",
      rentAmount: 7000,
      waterUnits: 8,
      waterRate: 18,
      waterAmount: 144,
      electricUnits: 120,
      electricRate: 8,
      electricAmount: 960,
      totalAmount: 8104,
      promptPayId: "0812345678",
    });

    expect(text).toContain("ห้อง 301");
    expect(text).toContain("คุณกานดา สุขใจ");
    expect(text).toContain("8,104 บาท");
    expect(text).toContain("0812345678");
    expect(text).toContain("พฤศจิกายน 2569");
  });

  it("formats Thai billing month correctly", () => {
    expect(formatMonthThai("2026-01")).toBe("มกราคม 2569");
    expect(formatMonthThai("2026-11")).toBe("พฤศจิกายน 2569");
  });
});
