import { prisma } from "./prisma";
import { isDailyRangeOverlap, isDailyOverlappingLease, formatThaiDate } from "./utils";

export interface AvailabilityResult {
  available: boolean;
  reason?: string;
}

/**
 * ตรวจสอบว่าห้องว่างสำหรับการจองรายวันในช่วง [checkInDate, checkOutDate) หรือไม่
 * - ห้ามซ้อนทับกับการจองรายวันอื่นที่สถานะ CONFIRMED หรือ CHECKED_IN
 *   (อนุญาตให้วันเช็คเอาท์ของคนเก่า = วันเช็คอินของคนใหม่ เพราะออกก่อน 12:00 และเข้า 14:00)
 * - ห้ามซ้อนทับกับสัญญารายเดือนที่สถานะ ACTIVE
 */
export async function checkDailyBookingAvailability(params: {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  excludeBookingId?: string;
}): Promise<AvailabilityResult> {
  const { roomId, checkInDate, checkOutDate, excludeBookingId } = params;

  if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
    return {
      available: false,
      reason: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอินอย่างน้อย 1 คืน",
    };
  }

  // 1. ตรวจสัญญารายเดือนที่ ACTIVE ในห้องนี้
  const activeLeases = await prisma.lease.findMany({
    where: {
      roomId,
      status: "ACTIVE",
    },
  });

  for (const lease of activeLeases) {
    if (isDailyOverlappingLease(checkInDate, checkOutDate, lease.startDate, lease.endDate)) {
      return {
        available: false,
        reason: `ห้องนี้ติดสัญญารายเดือนของ "${lease.tenantName}" (${formatThaiDate(
          lease.startDate
        )} - ${formatThaiDate(lease.endDate)}) ไม่สามารถจองรายวันทับได้`,
      };
    }
  }

  // 2. ตรวจการจองรายวันที่ CONFIRMED หรือ CHECKED_IN
  const existingBookings = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });

  for (const b of existingBookings) {
    if (isDailyRangeOverlap(checkInDate, checkOutDate, b.checkInDate, b.checkOutDate)) {
      return {
        available: false,
        reason: `ซ้อนทับกับการจองรายวันของ "${b.guestName}" (${formatThaiDate(
          b.checkInDate
        )} - ${formatThaiDate(b.checkOutDate)})`,
      };
    }
  }

  return { available: true };
}

/**
 * ตรวจสอบว่าห้องว่างสำหรับทำสัญญารายเดือนในช่วง [startDate, endDate] หรือไม่
 * - ห้ามซ้อนทับกับสัญญารายเดือนอื่นที่ ACTIVE
 * - ห้ามซ้อนทับกับการจองรายวันเดิมที่ CONFIRMED หรือ CHECKED_IN
 */
export async function checkLeaseAvailability(params: {
  roomId: string;
  startDate: string;
  endDate: string;
  excludeLeaseId?: string;
}): Promise<AvailabilityResult> {
  const { roomId, startDate, endDate, excludeLeaseId } = params;

  if (!startDate || !endDate || startDate > endDate) {
    return {
      available: false,
      reason: "วันสิ้นสุดสัญญาต้องอยู่หลังหรือวันเดียวกับวันเริ่มสัญญา",
    };
  }

  // 1. ตรวจสอบสัญญารายเดือนอื่นในห้องเดียวกันที่ ACTIVE
  const activeLeases = await prisma.lease.findMany({
    where: {
      roomId,
      status: "ACTIVE",
      ...(excludeLeaseId ? { id: { not: excludeLeaseId } } : {}),
    },
  });

  for (const l of activeLeases) {
    if (startDate <= l.endDate && l.startDate <= endDate) {
      return {
        available: false,
        reason: `ห้องนี้มีสัญญารายเดือนของ "${l.tenantName}" (${formatThaiDate(
          l.startDate
        )} - ${formatThaiDate(l.endDate)}) ซ้อนทับอยู่แล้ว`,
      };
    }
  }

  // 2. ตรวจสอบการจองรายวันในห้องนี้
  const existingBookings = await prisma.booking.findMany({
    where: {
      roomId,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
  });

  for (const b of existingBookings) {
    if (isDailyOverlappingLease(b.checkInDate, b.checkOutDate, startDate, endDate)) {
      return {
        available: false,
        reason: `ห้องนี้มีการจองรายวันของ "${b.guestName}" (${formatThaiDate(
          b.checkInDate
        )} - ${formatThaiDate(b.checkOutDate)}) ซ้อนทับอยู่ ไม่สามารถทำสัญญาได้`,
      };
    }
  }

  return { available: true };
}
