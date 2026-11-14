import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkLeaseAvailability } from "@/lib/availability";
import { calculateDepositRefund, toDateString } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lease = await prisma.lease.findUnique({
      where: { id: params.id },
      include: {
        room: true,
        guest: true,
        invoices: {
          orderBy: { billingMonth: "desc" },
        },
      },
    });

    if (!lease) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
    }

    return NextResponse.json(lease);
  } catch (error) {
    console.error("GET /api/leases/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลสัญญาได้" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const existing = await prisma.lease.findUnique({
      where: { id: params.id },
      include: { room: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
    }

    // ฟังก์ชันย้ายออก (Move Out) พร้อมคำนวณเงินประกันคืนหักค่าเสียหายและบิลค้าง
    if (body.action === "MOVE_OUT") {
      const moveOutDate = body.moveOutDate || toDateString(new Date());
      const damageDeduction = Number(body.damageDeduction) || 0;
      const unpaidDeduction = Number(body.unpaidDeduction) || 0;

      const calc = calculateDepositRefund({
        securityDeposit: existing.securityDeposit,
        damageDeduction,
        unpaidDeduction,
      });

      const updated = await prisma.lease.update({
        where: { id: params.id },
        data: {
          status: "MOVED_OUT",
          moveOutDate,
          damageDeduction: calc.damageDeduction,
          unpaidDeduction: calc.unpaidDeduction,
          depositRefunded: calc.depositRefunded,
          notes: body.notes !== undefined ? body.notes : existing.notes,
        },
        include: { room: true, guest: true, invoices: true },
      });

      // เมื่อผู้เช่าย้ายออก ปรับสถานะห้องเป็น CLEANING เพื่อให้แม่บ้านทำความสะอาด
      await prisma.room.update({
        where: { id: existing.roomId },
        data: { status: "CLEANING" },
      });

      return NextResponse.json(updated);
    }

    // ฟังก์ชันยกเลิกสัญญา (Terminate)
    if (body.action === "TERMINATE") {
      const updated = await prisma.lease.update({
        where: { id: params.id },
        data: { status: "TERMINATED" },
        include: { room: true, guest: true, invoices: true },
      });

      await prisma.room.update({
        where: { id: existing.roomId },
        data: { status: "AVAILABLE" },
      });

      return NextResponse.json(updated);
    }

    // กรณีแก้ไขข้อมูลสัญญา
    const targetRoomId = body.roomId || existing.roomId;
    const targetStartDate = body.startDate || existing.startDate;
    const targetEndDate = body.endDate || existing.endDate;

    if (
      existing.status === "ACTIVE" &&
      (targetRoomId !== existing.roomId ||
        targetStartDate !== existing.startDate ||
        targetEndDate !== existing.endDate)
    ) {
      const availability = await checkLeaseAvailability({
        roomId: targetRoomId,
        startDate: targetStartDate,
        endDate: targetEndDate,
        excludeLeaseId: params.id,
      });

      if (!availability.available) {
        return NextResponse.json(
          { error: availability.reason || "ช่วงเวลาที่เลือกซ้อนทับกับการจองอื่น" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.lease.update({
      where: { id: params.id },
      data: {
        roomId: targetRoomId,
        startDate: targetStartDate,
        endDate: targetEndDate,
        ...(body.tenantName !== undefined ? { tenantName: String(body.tenantName).trim() } : {}),
        ...(body.tenantPhone !== undefined ? { tenantPhone: String(body.tenantPhone).trim() } : {}),
        ...(body.tenantIdCard !== undefined ? { tenantIdCard: String(body.tenantIdCard).trim() } : {}),
        ...(body.tenantLineId !== undefined ? { tenantLineId: String(body.tenantLineId).trim() } : {}),
        ...(body.monthlyRent !== undefined ? { monthlyRent: Number(body.monthlyRent) } : {}),
        ...(body.securityDeposit !== undefined ? { securityDeposit: Number(body.securityDeposit) } : {}),
        ...(body.contractFileUrl !== undefined ? { contractFileUrl: body.contractFileUrl } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
      include: {
        room: true,
        guest: true,
        invoices: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/leases/[id] error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลสัญญาได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lease = await prisma.lease.findUnique({ where: { id: params.id } });
    if (!lease) {
      return NextResponse.json({ error: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
    }

    await prisma.lease.delete({ where: { id: params.id } });

    // ถ้าห้องไม่มีสัญญาอื่นที่ ACTIVE ให้เปลี่ยนสถานะห้องเป็น AVAILABLE
    const otherActive = await prisma.lease.findFirst({
      where: { roomId: lease.roomId, status: "ACTIVE" },
    });
    if (!otherActive) {
      await prisma.room.update({
        where: { id: lease.roomId },
        data: { status: "AVAILABLE" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/leases/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถลบสัญญาได้" }, { status: 500 });
  }
}
