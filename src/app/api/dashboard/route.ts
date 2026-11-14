import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateString, addDays } from "@/lib/utils";

export async function GET() {
  try {
    const now = new Date();
    const today = toDateString(now);
    const currentMonth = today.slice(0, 7); // YYYY-MM

    const [setting, rooms, bookings, activeLeases, invoices] = await Promise.all([
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] }),
      prisma.booking.findMany({
        where: { status: { not: "CANCELLED" } },
        include: { room: true, charges: true },
        orderBy: { checkInDate: "asc" },
      }),
      prisma.lease.findMany({
        where: { status: "ACTIVE" },
        include: { room: true },
        orderBy: { endDate: "asc" },
      }),
      prisma.invoice.findMany({
        include: { lease: { include: { room: true } } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const warningDays = setting?.leaseWarningDays ?? 30;
    const warningDateLimit = addDays(today, warningDays);

    // 1. เช็คอินวันนี้ (เข้า 14:00)
    const checkInsToday = bookings.filter(
      (b) => b.checkInDate === today && (b.status === "CONFIRMED" || b.status === "CHECKED_IN")
    );

    // 2. เช็คเอาท์วันนี้ (ออกก่อน 12:00)
    const checkOutsToday = bookings.filter(
      (b) => b.checkOutDate === today && (b.status === "CHECKED_IN" || b.status === "CHECKED_OUT")
    );

    // 3. สรุปสถานะห้องพัก
    const statusCounts = {
      AVAILABLE: rooms.filter((r) => r.status === "AVAILABLE").length,
      OCCUPIED: rooms.filter((r) => r.status === "OCCUPIED").length,
      RESERVED: rooms.filter((r) => r.status === "RESERVED").length,
      CLEANING: rooms.filter((r) => r.status === "CLEANING").length,
      MAINTENANCE: rooms.filter((r) => r.status === "MAINTENANCE").length,
    };

    // 4. รายได้เดือนนี้ (จากการจองรายวันในเดือนนี้ + บิลรายเดือนที่ชำระในเดือนนี้)
    const dailyRevenueThisMonth = bookings
      .filter((b) => b.checkInDate.startsWith(currentMonth))
      .reduce((sum, b) => sum + (b.paidAmount || 0), 0);

    const monthlyRevenueThisMonth = invoices
      .filter((inv) => inv.billingMonth === currentMonth)
      .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    const revenueThisMonth = dailyRevenueThisMonth + monthlyRevenueThisMonth;

    // 5. บิลค้างชำระ
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === "UNPAID" || inv.status === "OVERDUE" || inv.status === "PARTIAL"
    );
    const unpaidTotal = unpaidInvoices.reduce(
      (sum, inv) => sum + Math.max(0, inv.totalAmount - inv.paidAmount),
      0
    );

    // 6. สัญญาใกล้หมด
    const expiringLeases = activeLeases.filter(
      (l) => l.endDate >= today && l.endDate <= warningDateLimit
    );

    return NextResponse.json({
      today,
      setting,
      totalRooms: rooms.length,
      statusCounts,
      checkInsToday,
      checkOutsToday,
      revenueThisMonth,
      dailyRevenueThisMonth,
      monthlyRevenueThisMonth,
      unpaidInvoices,
      unpaidTotal,
      expiringLeases,
      rooms,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลแดชบอร์ดได้" },
      { status: 500 }
    );
  }
}
