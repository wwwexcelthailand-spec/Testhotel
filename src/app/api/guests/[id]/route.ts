import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: params.id },
      include: {
        bookings: {
          orderBy: { checkInDate: "desc" },
          include: { room: true },
        },
        leases: {
          orderBy: { startDate: "desc" },
          include: {
            room: true,
            invoices: { orderBy: { billingMonth: "desc" } },
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้เข้าพัก" }, { status: 404 });
    }

    return NextResponse.json(guest);
  } catch (error) {
    console.error("GET /api/guests/[id] error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลผู้เข้าพักได้" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await prisma.guest.update({
      where: { id: params.id },
      data: {
        ...(body.fullName !== undefined ? { fullName: String(body.fullName).trim() } : {}),
        ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
        ...(body.idCardNumber !== undefined ? { idCardNumber: String(body.idCardNumber).trim() } : {}),
        ...(body.email !== undefined ? { email: String(body.email).trim() } : {}),
        ...(body.lineId !== undefined ? { lineId: String(body.lineId).trim() } : {}),
        ...(body.address !== undefined ? { address: String(body.address).trim() } : {}),
        ...(body.emergencyName !== undefined ? { emergencyName: String(body.emergencyName).trim() } : {}),
        ...(body.emergencyPhone !== undefined ? { emergencyPhone: String(body.emergencyPhone).trim() } : {}),
        ...(body.idCardDocUrl !== undefined ? { idCardDocUrl: body.idCardDocUrl } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/guests/[id] error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลผู้เข้าพักได้" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.guest.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/guests/[id] error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถลบข้อมูลผู้เข้าพักได้" },
      { status: 500 }
    );
  }
}
