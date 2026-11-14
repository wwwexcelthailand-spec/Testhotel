import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const today = toDateString(new Date());
    const rooms = await prisma.room.findMany({
      orderBy: [{ floor: "asc" }, { number: "asc" }],
      include: {
        leases: {
          where: { status: "ACTIVE" },
          orderBy: { startDate: "desc" },
        },
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            checkOutDate: { gte: today },
          },
          orderBy: { checkInDate: "asc" },
        },
      },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลห้องพักได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    if (!number || !name) {
      return NextResponse.json(
        { error: "กรุณาระบุเลขห้องและชื่อห้อง" },
        { status: 400 }
      );
    }

    const existing = await prisma.room.findUnique({
      where: { number: String(number).trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: `เลขห้อง "${number}" มีอยู่ในระบบแล้ว` },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        number: String(number).trim(),
        name: String(name).trim(),
        floor: Number(floor) || 1,
        roomType: roomType || "Standard",
        dailyRate: Number(dailyRate) || 800,
        monthlyRate: Number(monthlyRate) || 6500,
        status: status || "AVAILABLE",
        imageUrl:
          imageUrl ||
          "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
        notes: notes || "",
        isSample: false,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "ไม่สามารถสร้างห้องพักได้" }, { status: 500 });
  }
}
