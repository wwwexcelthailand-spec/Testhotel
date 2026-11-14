import { NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { toDateString } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const today = toDateString(new Date());

    // 1. ดาวน์โหลดไฟล์ SQLite database โดยตรง
    if (format === "sqlite") {
      const dbPath = path.join(process.cwd(), "prisma", "dev.db");
      const fileBuffer = await readFile(dbPath);
      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="room-manager-backup-${today}.db"`,
        },
      });
    }

    // 2. ดาวน์โหลดไฟล์สำรองข้อมูล JSON สมบูรณ์
    const [
      setting,
      rooms,
      guests,
      bookings,
      bookingCharges,
      leases,
      meterReadings,
      invoices,
    ] = await Promise.all([
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.room.findMany(),
      prisma.guest.findMany(),
      prisma.booking.findMany(),
      prisma.bookingCharge.findMany(),
      prisma.lease.findMany(),
      prisma.meterReading.findMany(),
      prisma.invoice.findMany(),
    ]);

    const backupData = {
      meta: {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        propertyName: setting?.propertyName || "The Retford Residence",
        counts: {
          rooms: rooms.length,
          guests: guests.length,
          bookings: bookings.length,
          leases: leases.length,
          invoices: invoices.length,
        },
      },
      setting,
      rooms,
      guests,
      bookings,
      bookingCharges,
      leases,
      meterReadings,
      invoices,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);

    return new Response(jsonStr, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="room-manager-backup-${today}.json"`,
      },
    });
  } catch (error) {
    console.error("GET /api/backup error:", error);
    return NextResponse.json({ error: "ไม่สามารถส่งออกข้อมูลสำรองได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let payload: any = null;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "ไม่พบไฟล์สำรองข้อมูล" }, { status: 400 });
      }
      const text = await file.text();
      payload = JSON.parse(text);
    } else {
      payload = await request.json();
    }

    // ตรวจสอบความถูกต้องของข้อมูลสำรอง (Validation)
    if (!payload || !payload.rooms || !Array.isArray(payload.rooms)) {
      return NextResponse.json(
        { error: "รูปแบบไฟล์สำรองข้อมูลไม่ถูกต้อง (ไม่พบข้อมูลห้องพัก)" },
        { status: 400 }
      );
    }

    // ทำการสำรองข้อมูลปัจจุบันไว้ก่อนอัตโนมัติ (Safety Auto-Backup before overwrite)
    try {
      const [
        curSetting,
        curRooms,
        curGuests,
        curBookings,
        curCharges,
        curLeases,
        curMeters,
        curInvoices,
      ] = await Promise.all([
        prisma.setting.findUnique({ where: { id: 1 } }),
        prisma.room.findMany(),
        prisma.guest.findMany(),
        prisma.booking.findMany(),
        prisma.bookingCharge.findMany(),
        prisma.lease.findMany(),
        prisma.meterReading.findMany(),
        prisma.invoice.findMany(),
      ]);

      const safetyBackup = {
        meta: {
          note: "Auto-backup created before restore",
          timestamp: new Date().toISOString(),
        },
        setting: curSetting,
        rooms: curRooms,
        guests: curGuests,
        bookings: curBookings,
        bookingCharges: curCharges,
        leases: curLeases,
        meterReadings: curMeters,
        invoices: curInvoices,
      };

      const backupFile = path.join(
        process.cwd(),
        "prisma",
        "backups",
        `auto-backup-before-restore-${Date.now()}.json`
      );
      await writeFile(backupFile, JSON.stringify(safetyBackup, null, 2));
    } catch (backupErr) {
      console.warn("Safety auto-backup warning:", backupErr);
    }

    // เริ่มทำการนำเข้าข้อมูลทั้งหมด
    const rooms = payload.rooms || [];
    const guests = payload.guests || [];
    const bookings = payload.bookings || [];
    const bookingCharges = payload.bookingCharges || [];
    const leases = payload.leases || [];
    const meterReadings = payload.meterReadings || [];
    const invoices = payload.invoices || [];

    // เคลียร์ข้อมูลเดิม
    await prisma.invoice.deleteMany({});
    await prisma.meterReading.deleteMany({});
    await prisma.bookingCharge.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.lease.deleteMany({});
    await prisma.guest.deleteMany({});
    await prisma.room.deleteMany({});

    // นำเข้าห้องพัก
    for (const r of rooms) {
      await prisma.room.create({
        data: {
          id: r.id,
          number: r.number,
          name: r.name,
          floor: r.floor ?? 1,
          roomType: r.roomType || "Standard",
          dailyRate: r.dailyRate ?? 800,
          monthlyRate: r.monthlyRate ?? 6500,
          status: r.status || "AVAILABLE",
          imageUrl: r.imageUrl || "",
          notes: r.notes || "",
          isSample: Boolean(r.isSample),
        },
      });
    }

    // นำเข้า Guest
    for (const g of guests) {
      await prisma.guest.create({
        data: {
          id: g.id,
          fullName: g.fullName,
          phone: g.phone || "",
          idCardNumber: g.idCardNumber || "",
          email: g.email || "",
          address: g.address || "",
          emergencyName: g.emergencyName || "",
          emergencyPhone: g.emergencyPhone || "",
          idCardDocUrl: g.idCardDocUrl || "",
          notes: g.notes || "",
          isSample: Boolean(g.isSample),
        },
      });
    }

    // นำเข้า Bookings
    for (const b of bookings) {
      await prisma.booking.create({
        data: {
          id: b.id,
          bookingNumber: b.bookingNumber,
          roomId: b.roomId,
          guestId: b.guestId,
          guestName: b.guestName,
          guestPhone: b.guestPhone || "",
          guestIdCard: b.guestIdCard || "",
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
          nights: b.nights ?? 1,
          dailyRate: b.dailyRate ?? 800,
          deposit: b.deposit ?? 0,
          discount: b.discount ?? 0,
          paidAmount: b.paidAmount ?? 0,
          paymentMethod: b.paymentMethod || "CASH",
          status: b.status || "CONFIRMED",
          notes: b.notes || "",
          isSample: Boolean(b.isSample),
        },
      });
    }

    // นำเข้า BookingCharges
    for (const c of bookingCharges) {
      await prisma.bookingCharge.create({
        data: {
          id: c.id,
          bookingId: c.bookingId,
          description: c.description,
          amount: c.amount,
        },
      });
    }

    // นำเข้า Leases
    for (const l of leases) {
      await prisma.lease.create({
        data: {
          id: l.id,
          leaseNumber: l.leaseNumber,
          roomId: l.roomId,
          guestId: l.guestId,
          tenantName: l.tenantName,
          tenantPhone: l.tenantPhone || "",
          tenantIdCard: l.tenantIdCard || "",
          startDate: l.startDate,
          endDate: l.endDate,
          monthlyRent: l.monthlyRent,
          securityDeposit: l.securityDeposit ?? 0,
          contractFileUrl: l.contractFileUrl || "",
          status: l.status || "ACTIVE",
          moveOutDate: l.moveOutDate,
          damageDeduction: l.damageDeduction ?? 0,
          unpaidDeduction: l.unpaidDeduction ?? 0,
          depositRefunded: l.depositRefunded ?? 0,
          notes: l.notes || "",
          isSample: Boolean(l.isSample),
        },
      });
    }

    // นำเข้า MeterReadings
    for (const m of meterReadings) {
      await prisma.meterReading.create({
        data: {
          id: m.id,
          roomId: m.roomId,
          billingMonth: m.billingMonth,
          prevWater: m.prevWater ?? 0,
          currWater: m.currWater ?? 0,
          waterUnits: m.waterUnits ?? 0,
          prevElectric: m.prevElectric ?? 0,
          currElectric: m.currElectric ?? 0,
          electricUnits: m.electricUnits ?? 0,
          isSample: Boolean(m.isSample),
        },
      });
    }

    // นำเข้า Invoices
    for (const inv of invoices) {
      await prisma.invoice.create({
        data: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          leaseId: inv.leaseId,
          roomId: inv.roomId,
          billingMonth: inv.billingMonth,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          rentAmount: inv.rentAmount ?? 0,
          waterUnits: inv.waterUnits ?? 0,
          waterRate: inv.waterRate ?? 0,
          waterAmount: inv.waterAmount ?? 0,
          electricUnits: inv.electricUnits ?? 0,
          electricRate: inv.electricRate ?? 0,
          electricAmount: inv.electricAmount ?? 0,
          otherAmount: inv.otherAmount ?? 0,
          otherNote: inv.otherNote || "",
          lateDays: inv.lateDays ?? 0,
          lateFeeAmount: inv.lateFeeAmount ?? 0,
          totalAmount: inv.totalAmount ?? 0,
          paidAmount: inv.paidAmount ?? 0,
          status: inv.status || "UNPAID",
          paymentMethod: inv.paymentMethod || "",
          isSample: Boolean(inv.isSample),
        },
      });
    }

    // อัปเดต Settings ถ้ามี
    if (payload.setting) {
      const s = payload.setting;
      await prisma.setting.upsert({
        where: { id: 1 },
        update: {
          propertyName: s.propertyName,
          propertyAddress: s.propertyAddress,
          propertyPhone: s.propertyPhone,
          waterRate: s.waterRate ?? 18,
          electricRate: s.electricRate ?? 8,
          lateFeePerDay: s.lateFeePerDay ?? 50,
          checkInTime: s.checkInTime || "14:00",
          checkOutTime: s.checkOutTime || "12:00",
          leaseWarningDays: s.leaseWarningDays ?? 30,
          promptPayId: s.promptPayId || "",
          promptPayQrUrl: s.promptPayQrUrl || "",
          loginImageUrl: s.loginImageUrl || "",
        },
        create: {
          id: 1,
          propertyName: s.propertyName,
          propertyAddress: s.propertyAddress,
          propertyPhone: s.propertyPhone,
          waterRate: s.waterRate ?? 18,
          electricRate: s.electricRate ?? 8,
          lateFeePerDay: s.lateFeePerDay ?? 50,
          checkInTime: s.checkInTime || "14:00",
          checkOutTime: s.checkOutTime || "12:00",
          leaseWarningDays: s.leaseWarningDays ?? 30,
          promptPayId: s.promptPayId || "",
          promptPayQrUrl: s.promptPayQrUrl || "",
          loginImageUrl: s.loginImageUrl || "",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      message: `นำเข้าและกู้คืนข้อมูลสำเร็จ: ห้องพัก ${rooms.length} ห้อง, การจอง ${bookings.length} รายการ, สัญญา ${leases.length} ฉบับ, บิล ${invoices.length} รายการ`,
    });
  } catch (error) {
    console.error("POST /api/backup error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการนำเข้าข้อมูลสำรอง" }, { status: 500 });
  }
}
