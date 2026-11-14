import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLeaseAvailability } from "@/lib/availability";
import { toDateString } from "@/lib/utils";

export async function GET() {
  try {
    const today = toDateString(new Date());
    const [leases, rooms, settings] = await Promise.all([
      prisma.lease.findMany({
        orderBy: [{ status: "asc" }, { endDate: "asc" }],
        include: {
          room: true,
          guest: true,
          invoices: {
            orderBy: { billingMonth: "desc" },
          },
        },
      }),
      prisma.room.findMany({
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
    ]);

    return NextResponse.json({
      today,
      leases,
      rooms,
      settings,
    });
  } catch (error) {
    console.error("GET /api/leases error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลสัญญารายเดือนได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomId,
      tenantName,
      tenantPhone,
      tenantIdCard,
      tenantLineId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      contractFileUrl,
      notes,
    } = body;

    if (!roomId || !tenantName || !startDate || !endDate) {
      return NextResponse.json(
        { error: "กรุณาระบุห้องพัก ชื่อผู้เช่า วันเริ่มสัญญา และวันสิ้นสุดสัญญา" },
        { status: 400 }
      );
    }

    // ตรวจสอบการชนกับสัญญารายเดือนอื่น หรือการจองรายวันในห้องนี้
    const availability = await checkLeaseAvailability({
      roomId,
      startDate,
      endDate,
    });

    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || "ห้องพักไม่ว่างในช่วงเวลาของสัญญานี้" },
        { status: 409 }
      );
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้องพักที่เลือก" }, { status: 404 });
    }

    const rent = monthlyRent !== undefined ? Number(monthlyRent) : room.monthlyRate;
    const deposit = securityDeposit !== undefined ? Number(securityDeposit) : rent * 2;
    const leaseNumber = `LS-${new Date().getFullYear()}-${room.number}-${Date.now().toString().slice(-4)}`;

    // ค้นหาหรือบันทึกข้อมูลผู้เช่าใน Guest Directory อัตโนมัติ
    let guest = await prisma.guest.findFirst({
      where: {
        OR: [
          tenantPhone ? { phone: String(tenantPhone).trim() } : { id: "__none__" },
          tenantIdCard ? { idCardNumber: String(tenantIdCard).trim() } : { id: "__none__" },
        ],
      },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          fullName: String(tenantName).trim(),
          phone: tenantPhone ? String(tenantPhone).trim() : "",
          idCardNumber: tenantIdCard ? String(tenantIdCard).trim() : "",
          lineId: tenantLineId ? String(tenantLineId).trim() : "",
          idCardDocUrl: contractFileUrl || "",
        },
      });
    } else if (tenantLineId && !guest.lineId) {
      await prisma.guest.update({
        where: { id: guest.id },
        data: { lineId: String(tenantLineId).trim() },
      });
    }

    const lease = await prisma.lease.create({
      data: {
        leaseNumber,
        roomId,
        guestId: guest.id,
        tenantName: String(tenantName).trim(),
        tenantPhone: tenantPhone ? String(tenantPhone).trim() : "",
        tenantIdCard: tenantIdCard ? String(tenantIdCard).trim() : "",
        tenantLineId: tenantLineId ? String(tenantLineId).trim() : "",
        startDate,
        endDate,
        monthlyRent: rent,
        securityDeposit: deposit,
        contractFileUrl: contractFileUrl || "",
        status: "ACTIVE",
        notes: notes || "",
        isSample: false,
      },
      include: {
        room: true,
        guest: true,
      },
    });

    // อัปเดตสถานะห้องเป็น OCCUPIED
    await prisma.room.update({
      where: { id: roomId },
      data: { status: "OCCUPIED" },
    });

    return NextResponse.json(lease, { status: 201 });
  } catch (error) {
    console.error("POST /api/leases error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างสัญญารายเดือนได้" },
      { status: 500 }
    );
  }
}
