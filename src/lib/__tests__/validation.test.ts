import { describe, it, expect } from "vitest";
import { cleanIdCard, cleanPhoneNumber, formatPhoneNumber } from "../utils";

describe("Input Validation & Cleaning Helpers", () => {
  it("cleans Thai National ID card: digits only and max 13 characters", () => {
    expect(cleanIdCard("1-1004-00123-45-6")).toBe("1100400123456");
    expect(cleanIdCard("11004001234567890")).toBe("1100400123456");
    expect(cleanIdCard("abc 123 def 456")).toBe("123456");
    expect(cleanIdCard("")).toBe("");
  });

  it("cleans Thai phone numbers: digits only and max 10 characters", () => {
    expect(cleanPhoneNumber("081-234-5678")).toBe("0812345678");
    expect(cleanPhoneNumber("0812345678999")).toBe("0812345678");
    expect(cleanPhoneNumber("+66 81 234 5678")).toBe("6681234567");
    expect(cleanPhoneNumber("02-123-4567")).toBe("021234567");
  });

  it("formats Thai phone numbers correctly", () => {
    expect(formatPhoneNumber("0812345678")).toBe("081-234-5678");
    expect(formatPhoneNumber("021234567")).toBe("02-123-4567");
    expect(formatPhoneNumber("12345")).toBe("12345");
  });
});
