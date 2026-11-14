import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      number,
      name,
      floor,
      roomType,
      dailyRate,
      monthlyRate,
      status,
      imageUrl,
      notes,
    } = body;

    if (number) {
      const conflict = await prisma.room.findFirst({
        where: {
          number: String(number).trim(),
          id: { not: params.id },
        },
      });
      if (conflict) {
        return NextResponse.json(
          { error: `เลขห้อง "${number}" ซ้ำกับห้องอื่น` },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.room.update({
      where: { id: params.id },
      data: {
        ...(number !== undefined ? { number: String(number).trim() } : {}),
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(floor !== undefined ? { floor: Number(floor) } : {}),
        ...(roomType !== undefined ? { roomType } : {}),
        ...(dailyRate !== undefined ? { dailyRate: Number(dailyRate) } : {}),
        ...(monthlyRate !== undefined ? { monthlyRate: Number(monthlyRate) } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถแก้ไขห้องพักได้" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.room.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/rooms/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถลบห้องพักได้" }, { status: 500 });
  }
}
