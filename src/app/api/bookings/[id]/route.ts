import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkDailyBookingAvailability } from "@/lib/availability";
import { calculateNights, toDateString } from "@/lib/utils";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const existing = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { charges: true, room: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    // กรณี Action พิเศษ: CHECK_IN, CHECK_OUT, CANCEL, ADD_CHARGE, REMOVE_CHARGE
    if (body.action === "CHECK_IN") {
      const updated = await prisma.booking.update({
        where: { id: params.id },
        data: {
          status: "CHECKED_IN",
          actualCheckIn: new Date(),
          ...(body.paidAmount !== undefined
            ? { paidAmount: Number(body.paidAmount) }
            : {}),
        },
        include: { room: true, charges: true },
      });
      await prisma.room.update({
        where: { id: existing.roomId },
        data: { status: "OCCUPIED" },
      });
      return NextResponse.json(updated);
    }

    if (body.action === "CHECK_OUT") {
      const updated = await prisma.booking.update({
        where: { id: params.id },
        data: {
          status: "CHECKED_OUT",
          actualCheckOut: new Date(),
          ...(body.paidAmount !== undefined
            ? { paidAmount: Number(body.paidAmount) }
            : {}),
          ...(body.paymentMethod !== undefined
            ? { paymentMethod: body.paymentMethod }
            : {}),
        },
        include: { room: true, charges: true },
      });
      // เมื่อเช็คเอาท์ เปลี่ยนสถานะห้องเป็น CLEANING เพื่อให้แม่บ้านทำความสะอาดก่อนรับลูกค้า 14:00
      await prisma.room.update({
        where: { id: existing.roomId },
        data: { status: "CLEANING" },
      });
      return NextResponse.json(updated);
    }

    if (body.action === "CANCEL") {
      const updated = await prisma.booking.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
        include: { room: true, charges: true },
      });
      if (existing.room.status === "RESERVED" || existing.room.status === "OCCUPIED") {
        await prisma.room.update({
          where: { id: existing.roomId },
          data: { status: "AVAILABLE" },
        });
      }
      return NextResponse.json(updated);
    }

    if (body.action === "ADD_CHARGE") {
      if (!body.description || body.amount === undefined) {
        return NextResponse.json(
          { error: "กรุณาระบุรายการและจำนวนเงินค่าใช้จ่ายเพิ่ม" },
          { status: 400 }
        );
      }
      await prisma.bookingCharge.create({
        data: {
          bookingId: params.id,
          description: String(body.description).trim(),
          amount: Number(body.amount) || 0,
        },
      });
      const updated = await prisma.booking.findUnique({
        where: { id: params.id },
        include: { room: true, charges: { orderBy: { createdAt: "asc" } } },
      });
      return NextResponse.json(updated);
    }

    if (body.action === "REMOVE_CHARGE") {
      if (body.chargeId) {
        await prisma.bookingCharge.delete({
          where: { id: body.chargeId },
        });
      }
      const updated = await prisma.booking.findUnique({
        where: { id: params.id },
        include: { room: true, charges: { orderBy: { createdAt: "asc" } } },
      });
      return NextResponse.json(updated);
    }

    // แก้ไขรายละเอียดทั่วไป หรือลากวางเปลี่ยนห้อง/วันที่ในปฏิทิน
    const targetRoomId = body.roomId || existing.roomId;
    const targetCheckIn = body.checkInDate || existing.checkInDate;
    const targetCheckOut = body.checkOutDate || existing.checkOutDate;

    if (targetCheckOut <= targetCheckIn) {
      return NextResponse.json(
        { error: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอินอย่างน้อย 1 คืน" },
        { status: 400 }
      );
    }

    const todayStr = toDateString(new Date());
    // ป้องกันการย้ายวันเช็คอินย้อนหลังไปในอดีต (ถ้าก่อนหน้านี้ไม่ได้อยู่ในอดีตอยู่แล้ว)
    if (
      targetCheckIn !== existing.checkInDate &&
      targetCheckIn < todayStr &&
      existing.checkInDate >= todayStr
    ) {
      return NextResponse.json(
        { error: "ไม่สามารถย้ายวันเช็คอินย้อนหลังไปในอดีตได้" },
        { status: 400 }
      );
    }

    // ตรวจสอบการจองซ้อนทับหากมีการเปลี่ยนห้องหรือวันที่และสถานะยังไม่ยกเลิก/เช็คเอาท์
    if (
      existing.status !== "CANCELLED" &&
      existing.status !== "CHECKED_OUT" &&
      (targetRoomId !== existing.roomId ||
        targetCheckIn !== existing.checkInDate ||
        targetCheckOut !== existing.checkOutDate)
    ) {
      const availability = await checkDailyBookingAvailability({
        roomId: targetRoomId,
        checkInDate: targetCheckIn,
        checkOutDate: targetCheckOut,
        excludeBookingId: params.id,
      });

      if (!availability.available) {
        return NextResponse.json(
          { error: availability.reason || "ไม่สามารถย้ายหรือขยายวันจองได้เนื่องจากติดคิวอื่น" },
          { status: 409 }
        );
      }
    }

    const nights = calculateNights(targetCheckIn, targetCheckOut);

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: {
        roomId: targetRoomId,
        checkInDate: targetCheckIn,
        checkOutDate: targetCheckOut,
        nights,
        ...(body.guestName !== undefined ? { guestName: String(body.guestName).trim() } : {}),
        ...(body.guestPhone !== undefined ? { guestPhone: String(body.guestPhone).trim() } : {}),
        ...(body.guestIdCard !== undefined ? { guestIdCard: String(body.guestIdCard).trim() } : {}),
        ...(body.dailyRate !== undefined ? { dailyRate: Number(body.dailyRate) } : {}),
        ...(body.deposit !== undefined ? { deposit: Number(body.deposit) } : {}),
        ...(body.discount !== undefined ? { discount: Number(body.discount) } : {}),
        ...(body.paidAmount !== undefined ? { paidAmount: Number(body.paidAmount) } : {}),
        ...(body.paymentMethod !== undefined ? { paymentMethod: body.paymentMethod } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: {
        room: true,
        charges: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/bookings/[id] error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลการจองได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/bookings/[id] error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบรายการจองได้" },
      { status: 500 }
    );
  }
}
