import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkDailyBookingAvailability } from "@/lib/availability";
import { calculateNights, toDateString } from "@/lib/utils";

export async function GET() {
  try {
    const [bookings, leases, rooms, settings] = await Promise.all([
      prisma.booking.findMany({
        orderBy: { checkInDate: "desc" },
        include: {
          room: true,
          charges: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.lease.findMany({
        where: { status: "ACTIVE" },
        include: { room: true },
        orderBy: { startDate: "asc" },
      }),
      prisma.room.findMany({
        orderBy: [{ floor: "asc" }, { number: "asc" }],
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
    ]);

    return NextResponse.json({
      bookings,
      leases,
      rooms,
      settings,
    });
  } catch (error) {
    console.error("GET /api/bookings error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลการจองได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      roomId,
      guestName,
      guestPhone,
      guestIdCard,
      checkInDate,
      checkOutDate,
      dailyRate,
      deposit,
      discount,
      paidAmount,
      paymentMethod,
      status,
      notes,
    } = body;

    if (!roomId || !guestName || !checkInDate || !checkOutDate) {
      return NextResponse.json(
        { error: "กรุณากรอกห้องพัก ชื่อผู้เข้าพัก วันเช็คอิน และวันเช็คเอาท์ให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const todayStr = toDateString(new Date());
    if (checkInDate < todayStr) {
      return NextResponse.json(
        { error: "ไม่สามารถจองห้องพักย้อนหลังได้ (วันเช็คอินต้องเป็นวันนี้หรือวันข้างหน้า)" },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอินอย่างน้อย 1 คืน" },
        { status: 400 }
      );
    }

    const availability = await checkDailyBookingAvailability({
      roomId,
      checkInDate,
      checkOutDate,
    });

    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || "ห้องพักไม่ว่างในช่วงเวลานี้" },
        { status: 409 }
      );
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ error: "ไม่พบห้องพักที่เลือก" }, { status: 404 });
    }

    const nights = calculateNights(checkInDate, checkOutDate);
    const rate = dailyRate !== undefined ? Number(dailyRate) : room.dailyRate;
    const bookingStatus = status || "CONFIRMED";
    const bookingNumber = `BK-${Date.now().toString().slice(-6)}`;

    // บันทึกข้อมูลลูกค้าลงทะเบียนผู้เข้าพักอัตโนมัติ
    const guest = await prisma.guest.create({
      data: {
        fullName: String(guestName).trim(),
        phone: guestPhone ? String(guestPhone).trim() : "",
        idCardNumber: guestIdCard ? String(guestIdCard).trim() : "",
      },
    });

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        roomId,
        guestId: guest.id,
        guestName: String(guestName).trim(),
        guestPhone: guestPhone ? String(guestPhone).trim() : "",
        guestIdCard: guestIdCard ? String(guestIdCard).trim() : "",
        checkInDate,
        checkOutDate,
        nights,
        dailyRate: rate,
        deposit: Number(deposit) || 0,
        discount: Number(discount) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod: paymentMethod || "CASH",
        status: bookingStatus,
        actualCheckIn: bookingStatus === "CHECKED_IN" ? new Date() : null,
        notes: notes || "",
        isSample: false,
      },
      include: {
        room: true,
        charges: true,
      },
    });

    const today = toDateString(new Date());
    if (bookingStatus === "CHECKED_IN") {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "OCCUPIED" },
      });
    } else if (checkInDate <= today && checkOutDate > today && room.status === "AVAILABLE") {
      await prisma.room.update({
        where: { id: roomId },
        data: { status: "RESERVED" },
      });
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("POST /api/bookings error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างการจองได้" },
      { status: 500 }
    );
  }
}
