import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toDateString(dt);
}

export function calculateNights(checkInDate: string, checkOutDate: string): number {
  const [y1, m1, d1] = checkInDate.split("-").map(Number);
  const [y2, m2, d2] = checkOutDate.split("-").map(Number);
  const dt1 = Date.UTC(y1, m1 - 1, d1);
  const dt2 = Date.UTC(y2, m2 - 1, d2);
  const diff = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]) + 543;
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  return `${d} ${THAI_MONTHS_SHORT[m] || ""} ${String(y).slice(-2)}`;
}

export function formatThaiDateFull(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]) + 543;
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  return `${d} ${THAI_MONTHS_SHORT[m] || ""} ${y}`;
}

/**
 * ตรวจสอบการซ้อนทับของการจองรายวัน
 * กฎห้องพัก: เข้า 14:00 ของ checkInDate และออกก่อน 12:00 ของ checkOutDate
 * ดังนั้นช่วงเป็น [startA, endA) และ [startB, endB)
 * วันเช็คเอาท์ของคนเก่า สามารถตรงกับวันเช็คอินของคนใหม่ได้ (ไม่ซ้อนทับ)
 */
export function isDailyRangeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

/**
 * ตรวจสอบการซ้อนทับระหว่างการจองรายวัน [checkIn, checkOut) กับสัญญารายเดือน [leaseStart, leaseEnd]
 * สัญญารายเดือนครอบคลุมตั้งแต่ leaseStart ถึง leaseEnd (รวมวันสิ้นสุดสัญญา)
 * ดังนั้นเราเปรียบเทียบ [checkIn, checkOut) กับ [leaseStart, addDays(leaseEnd, 1))
 */
export function isDailyOverlappingLease(
  checkInDate: string,
  checkOutDate: string,
  leaseStartDate: string,
  leaseEndDate: string
): boolean {
  const leaseExclusiveEnd = addDays(leaseEndDate, 1);
  return checkInDate < leaseExclusiveEnd && leaseStartDate < checkOutDate;
}

export const ROOM_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  AVAILABLE: {
    label: "ว่าง",
    bg: "bg-[#cef5ca]",
    text: "text-[#114e0b]",
    dot: "bg-[#114e0b]",
  },
  OCCUPIED: {
    label: "มีผู้พัก",
    bg: "bg-[#f5eef9]",
    text: "text-[#5c2484]",
    dot: "bg-[#5c2484]",
  },
  RESERVED: {
    label: "จองแล้ว",
    bg: "bg-[#d9e5ff]",
    text: "text-[#080331]",
    dot: "bg-[#2d62ff]",
  },
  CLEANING: {
    label: "ทำความสะอาด",
    bg: "bg-[#fcf8d8]",
    text: "text-[#5e5515]",
    dot: "bg-[#b49b12]",
  },
  MAINTENANCE: {
    label: "ซ่อมบำรุง",
    bg: "bg-[#f8e4e4]",
    text: "text-[#ac2d2d]",
    dot: "bg-[#ac2d2d]",
  },
};

export const BOOKING_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  CONFIRMED: {
    label: "จองแล้ว (รอเช็คอิน)",
    bg: "bg-[#d9e5ff]",
    text: "text-[#080331]",
  },
  CHECKED_IN: {
    label: "เช็คอินแล้ว (กำลังพัก)",
    bg: "bg-[#cef5ca]",
    text: "text-[#114e0b]",
  },
  CHECKED_OUT: {
    label: "เช็คเอาท์แล้ว",
    bg: "bg-[#eeeeee]",
    text: "text-[#444444]",
  },
  CANCELLED: {
    label: "ยกเลิก",
    bg: "bg-[#f8e4e4]",
    text: "text-[#ac2d2d]",
  },
};

export const LEASE_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  ACTIVE: {
    label: "กำลังเช่า",
    bg: "bg-[#cef5ca]",
    text: "text-[#114e0b]",
  },
  MOVED_OUT: {
    label: "ย้ายออกแล้ว",
    bg: "bg-[#eeeeee]",
    text: "text-[#444444]",
  },
  TERMINATED: {
    label: "ยกเลิกสัญญา",
    bg: "bg-[#f8e4e4]",
    text: "text-[#ac2d2d]",
  },
};

export const INVOICE_STATUS_MAP: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  PAID: {
    label: "ชำระแล้ว",
    bg: "bg-[#cef5ca]",
    text: "text-[#114e0b]",
  },
  UNPAID: {
    label: "รอชำระ",
    bg: "bg-[#fcf8d8]",
    text: "text-[#5e5515]",
  },
  OVERDUE: {
    label: "เกินกำหนดชำระ",
    bg: "bg-[#f8e4e4]",
    text: "text-[#ac2d2d]",
  },
  PARTIAL: {
    label: "ชำระบางส่วน",
    bg: "bg-[#d9e5ff]",
    text: "text-[#080331]",
  },
};

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

export function formatMonthThai(monthStr: string): string {
  if (!monthStr) return "";
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) return monthStr;
  const thaiYear = y + 543;
  return `${THAI_MONTHS_FULL[m - 1] || ""} ${thaiYear}`;
}

export function calculateLateDays(dueDate: string, asOfDate?: string): number {
  if (!dueDate) return 0;
  const current = asOfDate || toDateString(new Date());
  if (current <= dueDate) return 0;
  return calculateNights(dueDate, current);
}

export function calculateLateFee(lateDays: number, lateFeePerDay = 50): number {
  if (lateDays <= 0) return 0;
  return lateDays * lateFeePerDay;
}

export function calculateDepositRefund(params: {
  securityDeposit: number;
  damageDeduction: number;
  unpaidDeduction: number;
}): {
  securityDeposit: number;
  damageDeduction: number;
  unpaidDeduction: number;
  depositRefunded: number;
} {
  const deposit = Number(params.securityDeposit) || 0;
  const damage = Number(params.damageDeduction) || 0;
  const unpaid = Number(params.unpaidDeduction) || 0;
  const refund = Math.max(0, deposit - damage - unpaid);
  return {
    securityDeposit: deposit,
    damageDeduction: damage,
    unpaidDeduction: unpaid,
    depositRefunded: refund,
  };
}

export function generateLineBillMessage(params: {
  propertyName: string;
  tenantName: string;
  roomNumber: string;
  billingMonth: string;
  dueDate: string;
  rentAmount: number;
  waterUnits: number;
  waterRate: number;
  waterAmount: number;
  electricUnits: number;
  electricRate: number;
  electricAmount: number;
  otherAmount?: number;
  otherNote?: string;
  lateFeeAmount?: number;
  totalAmount: number;
  promptPayId?: string;
  promptPayQrUrl?: string;
}): string {
  const monthName = formatMonthThai(params.billingMonth);
  const dueThai = formatThaiDate(params.dueDate);

  let msg = `📢 ใบแจ้งค่าเช่าและสาธารณูปโภคประจำเดือน ${monthName}\n`;
  msg += `🏢 ${params.propertyName}\n`;
  msg += `🚪 ห้อง ${params.roomNumber} (คุณ${params.tenantName})\n`;
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `▪ ค่าเช่าห้อง: ${params.rentAmount.toLocaleString("th-TH")} บาท\n`;
  msg += `▪ ค่าน้ำประปา (${params.waterUnits} หน่วย x ${params.waterRate} บ.): ${params.waterAmount.toLocaleString("th-TH")} บาท\n`;
  msg += `▪ ค่าไฟฟ้า (${params.electricUnits} หน่วย x ${params.electricRate} บ.): ${params.electricAmount.toLocaleString("th-TH")} บาท\n`;

  if (params.otherAmount && params.otherAmount > 0) {
    msg += `▪ ${params.otherNote || "ค่าใช้จ่ายอื่น ๆ"}: ${params.otherAmount.toLocaleString("th-TH")} บาท\n`;
  }

  if (params.lateFeeAmount && params.lateFeeAmount > 0) {
    msg += `▪ ค่าปรับล่าช้า: ${params.lateFeeAmount.toLocaleString("th-TH")} บาท\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 ยอดรวมที่ต้องชำระ: ${params.totalAmount.toLocaleString("th-TH")} บาท\n`;
  msg += `📅 กรุณาชำระภายในวันที่: ${dueThai}\n`;

  if (params.promptPayQrUrl) {
    msg += `💳 สแกนจ่ายผ่าน QR Code รับเงินในลิงก์บิล\n`;
  } else if (params.promptPayId) {
    msg += `💳 โอนชำระผ่านพร้อมเพย์: ${params.promptPayId}\n`;
  }
  msg += `เมื่อโอนแล้วรบกวนส่งสลิปเพื่อออกใบเสร็จรับเงิน ขอบคุณครับ/ค่ะ 🙏`;

  return msg;
}

/**
 * กรองเลขบัตรประชาชนให้มีเฉพาะตัวเลข 0-9 และจำกัดความยาวสูงสุด 13 หลัก
 */
export function cleanIdCard(val: string): string {
  return String(val || "").replace(/\D/g, "").slice(0, 13);
}

/**
 * กรองเบอร์โทรศัพท์ให้มีเฉพาะตัวเลข 0-9 และจำกัดความยาวสูงสุด 10 หลัก
 */
export function cleanPhoneNumber(val: string): string {
  return String(val || "").replace(/\D/g, "").slice(0, 10);
}

/**
 * จัดรูปแบบเบอร์โทรศัพท์ให้อ่านง่าย เช่น 081-234-5678 หรือ 02-123-4567
 */
export function formatPhoneNumber(val: string): string {
  const clean = cleanPhoneNumber(val);
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 10)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 9)}`;
  }
  return clean;
}

