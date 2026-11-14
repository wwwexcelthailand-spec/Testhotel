import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  toDateString,
  addDays,
  calculateNights,
  calculateLateDays,
  calculateLateFee,
} from "@/lib/utils";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = toDateString(new Date());
    const currentMonth = today.slice(0, 7); // YYYY-MM
    const selectedMonth = searchParams.get("month") || currentMonth;

    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const daysInSelectedMonth = getDaysInMonth(year, month);
    const monthStartDate = `${selectedMonth}-01`;
    const monthEndDate = `${selectedMonth}-${String(daysInSelectedMonth).padStart(2, "0")}`;
    const monthNextDay = addDays(monthEndDate, 1);

    const [settings, rooms, allBookings, allLeases, allInvoices] = await Promise.all([
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] }),
      prisma.booking.findMany({
        where: { status: { not: "CANCELLED" } },
        include: { room: true, charges: true },
      }),
      prisma.lease.findMany({
        include: { room: true },
      }),
      prisma.invoice.findMany({
        include: {
          lease: { include: { room: true } },
          room: true,
        },
      }),
    ]);

    const lateFeePerDay = settings?.lateFeePerDay ?? 50;

    // 1. รายได้ประจำเดือนที่เลือก
    // - รายวัน: การจองที่ checkInDate อยู่ในเดือนนี้
    const dailyBookingsThisMonth = allBookings.filter((b) =>
      b.checkInDate.startsWith(selectedMonth)
    );
    const dailyRevenue = dailyBookingsThisMonth.reduce(
      (sum, b) => sum + (b.paidAmount || 0),
      0
    );

    // - รายเดือน: บิลประจำเดือนนี้
    const invoicesThisMonth = allInvoices.filter(
      (inv) => inv.billingMonth === selectedMonth
    );
    const monthlyPaidRevenue = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.paidAmount || 0),
      0
    );
    const monthlyTotalBilled = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const waterRevenue = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.waterAmount || 0),
      0
    );
    const electricRevenue = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.electricAmount || 0),
      0
    );
    const rentRevenue = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.rentAmount || 0),
      0
    );
    const lateFeeRevenue = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.lateFeeAmount || 0),
      0
    );
    const otherRevenue = invoicesThisMonth.reduce(
      (sum, inv) => sum + (inv.otherAmount || 0),
      0
    );

    const totalRevenue = dailyRevenue + monthlyPaidRevenue;

    // 2. คำนวณอัตราการเข้าพัก (Occupancy Rate) ประจำเดือน
    // แต่ละห้อง: จำนวนคืนที่เข้าพักรายวัน + จำนวนคืนที่อยู่ในสัญญารายเดือน
    const totalRoomCapacityDays = rooms.length * daysInSelectedMonth;
    let totalOccupiedDays = 0;

    const roomOccupancyList = rooms.map((room) => {
      let roomOccupiedDays = 0;

      // นับวันจองรายวันในเดือนนี้
      const roomDaily = allBookings.filter(
        (b) =>
          b.roomId === room.id &&
          b.status !== "CANCELLED" &&
          b.checkInDate < monthNextDay &&
          b.checkOutDate > monthStartDate
      );

      for (const b of roomDaily) {
        const start = b.checkInDate < monthStartDate ? monthStartDate : b.checkInDate;
        const end = b.checkOutDate > monthNextDay ? monthNextDay : b.checkOutDate;
        roomOccupiedDays += calculateNights(start, end);
      }

      // นับวันสัญญารายเดือนในเดือนนี้
      const roomLeases = allLeases.filter(
        (l) =>
          l.roomId === room.id &&
          l.status !== "TERMINATED" &&
          l.startDate < monthNextDay &&
          addDays(l.endDate, 1) > monthStartDate
      );

      for (const l of roomLeases) {
        const leaseEndEx = addDays(l.endDate, 1);
        const start = l.startDate < monthStartDate ? monthStartDate : l.startDate;
        const end = leaseEndEx > monthNextDay ? monthNextDay : leaseEndEx;
        roomOccupiedDays += calculateNights(start, end);
      }

      const cappedOccupiedDays = Math.min(daysInSelectedMonth, roomOccupiedDays);
      totalOccupiedDays += cappedOccupiedDays;

      const ratePct = daysInSelectedMonth > 0
        ? Math.round((cappedOccupiedDays / daysInSelectedMonth) * 100)
        : 0;

      return {
        roomId: room.id,
        roomNumber: room.number,
        roomName: room.name,
        floor: room.floor,
        roomType: room.roomType,
        occupiedDays: cappedOccupiedDays,
        daysInMonth: daysInSelectedMonth,
        occupancyRate: ratePct,
      };
    });

    const averageOccupancyRate =
      totalRoomCapacityDays > 0
        ? Math.round((totalOccupiedDays / totalRoomCapacityDays) * 100)
        : 0;

    // 3. ยอดค้างชำระทั้งหมด (Overdue & Unpaid Receivables)
    const unpaidInvoices = allInvoices
      .filter((inv) => inv.status === "UNPAID" || inv.status === "OVERDUE" || inv.status === "PARTIAL")
      .map((inv) => {
        const lateDays = calculateLateDays(inv.dueDate, today);
        const lateFee = calculateLateFee(lateDays, lateFeePerDay);
        const outstanding = Math.max(0, inv.totalAmount - inv.paidAmount);
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          roomNumber: inv.lease.room.number,
          tenantName: inv.lease.tenantName,
          tenantPhone: inv.lease.tenantPhone,
          billingMonth: inv.billingMonth,
          dueDate: inv.dueDate,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          outstandingAmount: outstanding,
          lateDays,
          lateFeeAmount: lateFee,
          status: inv.status,
        };
      });

    const totalOutstanding = unpaidInvoices.reduce(
      (sum, inv) => sum + inv.outstandingAmount,
      0
    );

    // 4. แนวโน้มรายได้ย้อนหลัง 6 เดือน
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(year, month - 1 - i, 1);
      const mStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;

      const dRev = allBookings
        .filter((b) => b.checkInDate.startsWith(mStr))
        .reduce((sum, b) => sum + (b.paidAmount || 0), 0);

      const mRev = allInvoices
        .filter((inv) => inv.billingMonth === mStr)
        .reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

      monthlyTrends.push({
        month: mStr,
        dailyRevenue: dRev,
        monthlyRevenue: mRev,
        totalRevenue: dRev + mRev,
      });
    }

    return NextResponse.json({
      selectedMonth,
      settings,
      revenue: {
        totalRevenue,
        dailyRevenue,
        monthlyPaidRevenue,
        monthlyTotalBilled,
        breakdown: {
          rentRevenue,
          waterRevenue,
          electricRevenue,
          lateFeeRevenue,
          otherRevenue,
        },
      },
      occupancy: {
        averageOccupancyRate,
        totalOccupiedDays,
        totalRoomCapacityDays,
        daysInMonth: daysInSelectedMonth,
        roomOccupancyList,
      },
      unpaid: {
        totalOutstanding,
        unpaidCount: unpaidInvoices.length,
        unpaidInvoices,
      },
      monthlyTrends,
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "ไม่สามารถประมวลผลรายงานได้" }, { status: 500 });
  }
}
