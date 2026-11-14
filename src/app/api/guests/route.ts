import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      orderBy: { createdAt: "desc" },
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

    return NextResponse.json(guests);
  } catch (error) {
    console.error("GET /api/guests error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลทะเบียนผู้เข้าพักได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      idCardNumber,
      email,
      lineId,
      address,
      emergencyName,
      emergencyPhone,
      idCardDocUrl,
      notes,
    } = body;

    if (!fullName) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อ-นามสกุลของผู้เข้าพัก/ผู้เช่า" },
        { status: 400 }
      );
    }

    const guest = await prisma.guest.create({
      data: {
        fullName: String(fullName).trim(),
        phone: phone ? String(phone).trim() : "",
        idCardNumber: idCardNumber ? String(idCardNumber).trim() : "",
        email: email ? String(email).trim() : "",
        lineId: lineId ? String(lineId).trim() : "",
        address: address ? String(address).trim() : "",
        emergencyName: emergencyName ? String(emergencyName).trim() : "",
        emergencyPhone: emergencyPhone ? String(emergencyPhone).trim() : "",
        idCardDocUrl: idCardDocUrl || "",
        notes: notes || "",
        isSample: false,
      },
    });

    return NextResponse.json(guest, { status: 201 });
  } catch (error) {
    console.error("POST /api/guests error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกข้อมูลผู้เข้าพักได้" },
      { status: 500 }
    );
  }
}
