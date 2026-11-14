import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getPreviousMonth(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const dt = new Date(y, m - 1 - 1, 1);
  const py = dt.getFullYear();
  const pm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${py}-${pm}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const today = toDateString(new Date());
    const currentMonth = today.slice(0, 7);
    const billingMonth = searchParams.get("month") || currentMonth;
    const prevMonth = getPreviousMonth(billingMonth);

    const [rooms, currentReadings, previousReadings, settings] = await Promise.all([
      prisma.room.findMany({
        orderBy: [{ floor: "asc" }, { number: "asc" }],
        include: {
          leases: {
            where: { status: "ACTIVE" },
            take: 1,
          },
        },
      }),
      prisma.meterReading.findMany({
        where: { billingMonth },
      }),
      prisma.meterReading.findMany({
        where: { billingMonth: prevMonth },
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
    ]);

    const currMap = new Map(currentReadings.map((r) => [r.roomId, r]));
    const prevMap = new Map(previousReadings.map((r) => [r.roomId, r]));

    const items = rooms.map((room) => {
      const activeLease = room.leases[0] || null;
      const curr = currMap.get(room.id);
      const prev = prevMap.get(room.id);

      const prevWater = curr?.prevWater ?? prev?.currWater ?? 0;
      const currWater = curr?.currWater ?? prevWater;
      const waterUnits = curr?.waterUnits ?? Math.max(0, currWater - prevWater);

      const prevElectric = curr?.prevElectric ?? prev?.currElectric ?? 0;
      const currElectric = curr?.currElectric ?? prevElectric;
      const electricUnits = curr?.electricUnits ?? Math.max(0, currElectric - prevElectric);

      return {
        roomId: room.id,
        roomNumber: room.number,
        roomName: room.name,
        floor: room.floor,
        roomStatus: room.status,
        hasActiveLease: Boolean(activeLease),
        tenantName: activeLease?.tenantName || "-",
        billingMonth,
        prevWater,
        currWater,
        waterUnits,
        prevElectric,
        currElectric,
        electricUnits,
        recordedAt: curr?.recordedAt || null,
        isRecorded: Boolean(curr),
      };
    });

    return NextResponse.json({
      billingMonth,
      prevMonth,
      settings: {
        waterRate: settings?.waterRate ?? 18,
        electricRate: settings?.electricRate ?? 8,
      },
      items,
    });
  } catch (error) {
    console.error("GET /api/meter error:", error);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลมิเตอร์ได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { billingMonth, readings } = body;

    if (!billingMonth || !Array.isArray(readings)) {
      return NextResponse.json(
        { error: "ข้อมูลมิเตอร์หรือรอบเดือนไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    const waterRate = setting?.waterRate ?? 18;
    const electricRate = setting?.electricRate ?? 8;

    for (const item of readings) {
      const prevW = Number(item.prevWater) || 0;
      const currW = Number(item.currWater) || 0;
      const waterUnits = Math.max(0, currW - prevW);

      const prevE = Number(item.prevElectric) || 0;
      const currE = Number(item.currElectric) || 0;
      const electricUnits = Math.max(0, currE - prevE);

      // บันทึกหรืออัปเดต MeterReading
      await prisma.meterReading.upsert({
        where: {
          roomId_billingMonth: {
            roomId: item.roomId,
            billingMonth,
          },
        },
        update: {
          prevWater: prevW,
          currWater: currW,
          waterUnits,
          prevElectric: prevE,
          currElectric: currE,
          electricUnits,
          recordedAt: new Date(),
        },
        create: {
          roomId: item.roomId,
          billingMonth,
          prevWater: prevW,
          currWater: currW,
          waterUnits,
          prevElectric: prevE,
          currElectric: currE,
          electricUnits,
          recordedAt: new Date(),
        },
      });

      // หากมี Invoice ที่ยังไม่ชำระ (UNPAID/OVERDUE) ของห้องนี้ในเดือนนั้น ให้อัปเดตค่าน้ำไฟอัตโนมัติ
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          roomId: item.roomId,
          billingMonth,
          status: { in: ["UNPAID", "OVERDUE"] },
        },
      });

      if (existingInvoice) {
        const waterAmount = waterUnits * waterRate;
        const electricAmount = electricUnits * electricRate;
        const totalAmount =
          existingInvoice.rentAmount +
          waterAmount +
          electricAmount +
          existingInvoice.otherAmount +
          existingInvoice.lateFeeAmount;

        await prisma.invoice.update({
          where: { id: existingInvoice.id },
          data: {
            waterUnits,
            waterRate,
            waterAmount,
            electricUnits,
            electricRate,
            electricAmount,
            totalAmount,
          },
        });
      }
    }

    return NextResponse.json({ ok: true, message: "บันทึกข้อมูลมิเตอร์สำเร็จ" });
  } catch (error) {
    console.error("POST /api/meter error:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกมิเตอร์ได้" }, { status: 500 });
  }
}
