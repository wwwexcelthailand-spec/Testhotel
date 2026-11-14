import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import {
  toDateString,
  formatThaiDate,
  formatMonthThai,
  calculateLateDays,
  calculateLateFee,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = toDateString(new Date());
    const currentMonth = today.slice(0, 7);
    const selectedMonth = searchParams.get("month") || currentMonth;

    const [settings, rooms, bookings, leases, invoices] = await Promise.all([
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.room.findMany({ orderBy: [{ floor: "asc" }, { number: "asc" }] }),
      prisma.booking.findMany({
        where: { checkInDate: { startsWith: selectedMonth } },
        include: { room: true },
        orderBy: { checkInDate: "asc" },
      }),
      prisma.lease.findMany({
        include: { room: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.invoice.findMany({
        where: { billingMonth: selectedMonth },
        include: { lease: { include: { room: true } } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = settings?.propertyName || "The Retford Residence";
    workbook.created = new Date();

    const brandColor = "FF5C2484";
    const headerFont: Partial<ExcelJS.Font> = {
      name: "Tahoma",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    const headerFill: ExcelJS.FillPattern = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: brandColor },
    };

    // ───────────────────────────────────────────────
    // Sheet 1: สรุปภาพรวมและรายได้
    // ───────────────────────────────────────────────
    const wsSummary = workbook.addWorksheet("สรุปภาพรวมรายได้");
    wsSummary.properties.defaultRowHeight = 22;

    wsSummary.addRow([settings?.propertyName || "เดอะ เรทฟอร์ด เรสซิเดนซ์"]);
    wsSummary.getRow(1).font = { name: "Tahoma", size: 14, bold: true, color: { argb: "FF222222" } };

    wsSummary.addRow([`รายงานสรุปผลประกอบการ ประจำเดือน ${formatMonthThai(selectedMonth)}`]);
    wsSummary.getRow(2).font = { name: "Tahoma", size: 11, italic: true };
    wsSummary.addRow([]);

    const dailyRevenue = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const monthlyPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const waterRev = invoices.reduce((sum, inv) => sum + (inv.waterAmount || 0), 0);
    const elecRev = invoices.reduce((sum, inv) => sum + (inv.electricAmount || 0), 0);
    const rentRev = invoices.reduce((sum, inv) => sum + (inv.rentAmount || 0), 0);
    const lateRev = invoices.reduce((sum, inv) => sum + (inv.lateFeeAmount || 0), 0);
    const totalRev = dailyRevenue + monthlyPaid;

    wsSummary.addRow(["หมวดหมู่รายรับ", "จำนวนเงิน (บาท)"]);
    const hRow = wsSummary.getRow(4);
    hRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { vertical: "middle" };
    });

    wsSummary.addRow(["รายได้จากการจองห้องพักรายวัน", dailyRevenue]);
    wsSummary.addRow(["รายได้จากค่าเช่าห้องพักรายเดือน", rentRev]);
    wsSummary.addRow(["รายได้จากค่าน้ำประปา", waterRev]);
    wsSummary.addRow(["รายได้จากค่าไฟฟ้า", elecRev]);
    wsSummary.addRow(["รายได้จากค่าปรับชำระล่าช้า", lateRev]);
    wsSummary.addRow(["รวมรายรับสุทธิประจำเดือน", totalRev]);

    const totalRow = wsSummary.getRow(10);
    totalRow.font = { name: "Tahoma", size: 12, bold: true, color: { argb: "FF5C2484" } };

    wsSummary.getColumn(1).width = 40;
    wsSummary.getColumn(2).width = 25;
    wsSummary.getColumn(2).numFmt = '#,##0.00 "บาท"';

    // ───────────────────────────────────────────────
    // Sheet 2: รายการจองรายวัน (Daily Bookings)
    // ───────────────────────────────────────────────
    const wsDaily = workbook.addWorksheet("การจองรายวัน");
    wsDaily.addRow([
      "เลขที่จอง",
      "เลขห้อง",
      "ชื่อผู้เข้าพัก",
      "เบอร์โทร",
      "วันเช็คอิน",
      "วันเช็คเอาท์",
      "จำนวนคืน",
      "ราคา/คืน",
      "เงินมัดจำ",
      "ยอดชำระแล้ว",
      "สถานะ",
    ]);

    const dHRow = wsDaily.getRow(1);
    dHRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
    });

    bookings.forEach((b) => {
      wsDaily.addRow([
        b.bookingNumber,
        b.room.number,
        b.guestName,
        b.guestPhone || "-",
        formatThaiDate(b.checkInDate),
        formatThaiDate(b.checkOutDate),
        b.nights,
        b.dailyRate,
        b.deposit,
        b.paidAmount,
        b.status,
      ]);
    });

    [15, 10, 25, 16, 14, 14, 12, 14, 14, 16, 14].forEach((w, i) => {
      wsDaily.getColumn(i + 1).width = w;
    });

    // ───────────────────────────────────────────────
    // Sheet 3: บิลรายเดือน (Monthly Invoices)
    // ───────────────────────────────────────────────
    const wsInvoices = workbook.addWorksheet("บิลรายเดือน");
    wsInvoices.addRow([
      "เลขที่บิล",
      "ห้อง",
      "ชื่อผู้เช่า",
      "รอบเดือน",
      "วันครบกำหนด",
      "ค่าเช่า",
      "หน่วยน้ำ",
      "ค่าน้ำ",
      "หน่วยไฟ",
      "ค่าไฟ",
      "ค่าปรับ",
      "ยอดรวมบิล",
      "ชำระแล้ว",
      "สถานะ",
    ]);

    const iHRow = wsInvoices.getRow(1);
    iHRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = headerFill;
    });

    invoices.forEach((inv) => {
      wsInvoices.addRow([
        inv.invoiceNumber,
        inv.lease.room.number,
        inv.lease.tenantName,
        inv.billingMonth,
        formatThaiDate(inv.dueDate),
        inv.rentAmount,
        inv.waterUnits,
        inv.waterAmount,
        inv.electricUnits,
        inv.electricAmount,
        inv.lateFeeAmount,
        inv.totalAmount,
        inv.paidAmount,
        inv.status,
      ]);
    });

    [16, 10, 22, 12, 14, 14, 10, 12, 10, 12, 12, 16, 16, 12].forEach((w, i) => {
      wsInvoices.getColumn(i + 1).width = w;
    });

    // ───────────────────────────────────────────────
    // Sheet 4: ยอดค้างชำระ (Overdue & Unpaid)
    // ───────────────────────────────────────────────
    const wsOverdue = workbook.addWorksheet("ยอดค้างชำระ");
    wsOverdue.addRow([
      "เลขที่บิล",
      "ห้อง",
      "ชื่อผู้เช่า",
      "เบอร์โทร",
      "รอบเดือน",
      "ครบกำหนดชำระ",
      "เกินกำหนด (วัน)",
      "ค่าปรับล่าช้า",
      "ยอดคงค้างชำระ",
      "สถานะ",
    ]);

    const oHRow = wsOverdue.getRow(1);
    oHRow.eachCell((cell) => {
      cell.font = headerFont;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFAC2D2D" }, // Red header for overdue
      };
    });

    const lateFeePerDay = settings?.lateFeePerDay ?? 50;
    const unpaidList = invoices.filter((i) => i.status !== "PAID");

    unpaidList.forEach((inv) => {
      const lateDays = calculateLateDays(inv.dueDate, today);
      const lateFee = calculateLateFee(lateDays, lateFeePerDay);
      const outstanding = Math.max(0, inv.totalAmount - inv.paidAmount);

      wsOverdue.addRow([
        inv.invoiceNumber,
        inv.lease.room.number,
        inv.lease.tenantName,
        inv.lease.tenantPhone || "-",
        inv.billingMonth,
        formatThaiDate(inv.dueDate),
        lateDays,
        lateFee,
        outstanding,
        inv.status,
      ]);
    });

    [16, 10, 22, 16, 12, 16, 14, 14, 16, 12].forEach((w, i) => {
      wsOverdue.getColumn(i + 1).width = w;
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="room-manager-report-${selectedMonth}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /api/reports/export error:", error);
    return NextResponse.json({ error: "ไม่สามารถส่งออกไฟล์ Excel ได้" }, { status: 500 });
  }
}
