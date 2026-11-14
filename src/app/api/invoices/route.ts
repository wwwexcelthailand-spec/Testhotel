import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  toDateString,
  addDays,
  calculateLateDays,
  calculateLateFee,
} from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const status = searchParams.get("status");

    const today = toDateString(new Date());

    const [invoices, settings, activeLeases] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          ...(month ? { billingMonth: month } : {}),
          ...(status && status !== "ALL" ? { status } : {}),
        },
        orderBy: [{ billingMonth: "desc" }, { dueDate: "asc" }],
        include: {
          lease: {
            include: {
              room: true,
              guest: true,
            },
          },
          room: true,
        },
      }),
      prisma.setting.findUnique({ where: { id: 1 } }),
      prisma.lease.findMany({
        where: { status: "ACTIVE" },
        include: { room: true },
      }),
    ]);

    const lateFeePerDay = settings?.lateFeePerDay ?? 50;

    // คำนวณค่าปรับล่าช้าอัตโนมัติหากเกินกำหนดชำระและยังไม่ชำระ
    const processedInvoices = await Promise.all(
      invoices.map(async (inv) => {
        if (inv.status !== "PAID") {
          const lateDays = calculateLateDays(inv.dueDate, today);
          const lateFeeAmount = calculateLateFee(lateDays, lateFeePerDay);
          const newStatus =
            inv.paidAmount > 0
              ? "PARTIAL"
              : lateDays > 0
              ? "OVERDUE"
              : inv.status;

          const baseTotal =
            inv.rentAmount +
            inv.waterAmount +
            inv.electricAmount +
            inv.otherAmount;
          const updatedTotal = baseTotal + lateFeeAmount;

          if (
            inv.lateDays !== lateDays ||
            inv.lateFeeAmount !== lateFeeAmount ||
            inv.status !== newStatus ||
            inv.totalAmount !== updatedTotal
          ) {
            await prisma.invoice.update({
              where: { id: inv.id },
              data: {
                lateDays,
                lateFeeAmount,
                status: newStatus,
                totalAmount: updatedTotal,
              },
            });
            inv.lateDays = lateDays;
            inv.lateFeeAmount = lateFeeAmount;
            inv.status = newStatus;
            inv.totalAmount = updatedTotal;
          }
        }
        return inv;
      })
    );

    return NextResponse.json({
      today,
      settings,
      invoices: processedInvoices,
      activeLeases,
    });
  } catch (error) {
    console.error("GET /api/invoices error:", error);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลบิลได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const today = toDateString(new Date());
    const setting = await prisma.setting.findUnique({ where: { id: 1 } });
    const waterRate = setting?.waterRate ?? 18;
    const electricRate = setting?.electricRate ?? 8;

    // 1. สร้างบิลอัตโนมัติสำหรับสัญญารายเดือนที่ ACTIVE ทั้งหมดในรอบเดือนนั้น
    if (body.action === "GENERATE_MONTH") {
      const billingMonth = body.billingMonth || today.slice(0, 7);
      const defaultDueDate = body.dueDate || addDays(today, 7);

      const activeLeases = await prisma.lease.findMany({
        where: { status: "ACTIVE" },
        include: { room: true },
      });

      const createdList = [];
      const skippedList = [];

      for (const lease of activeLeases) {
        // ตรวจสอบว่ามีบิลของสัญญานี้ในรอบเดือนนี้หรือยัง
        const existing = await prisma.invoice.findFirst({
          where: {
            leaseId: lease.id,
            billingMonth,
          },
        });

        if (existing) {
          skippedList.push(lease.room.number);
          continue;
        }

        // ดึงเลขมิเตอร์น้ำไฟของห้องนี้ในรอบเดือนนี้
        const meter = await prisma.meterReading.findUnique({
          where: {
            roomId_billingMonth: {
              roomId: lease.roomId,
              billingMonth,
            },
          },
        });

        const waterUnits = meter?.waterUnits ?? 0;
        const electricUnits = meter?.electricUnits ?? 0;
        const waterAmount = waterUnits * waterRate;
        const electricAmount = electricUnits * electricRate;
        const rentAmount = lease.monthlyRent;
        const totalAmount = rentAmount + waterAmount + electricAmount;

        const cleanMonth = billingMonth.replace("-", "");
        const invoiceNumber = `INV-${cleanMonth}-${lease.room.number}`;

        const inv = await prisma.invoice.create({
          data: {
            invoiceNumber,
            leaseId: lease.id,
            roomId: lease.roomId,
            billingMonth,
            issueDate: today,
            dueDate: defaultDueDate,
            rentAmount,
            waterUnits,
            waterRate,
            waterAmount,
            electricUnits,
            electricRate,
            electricAmount,
            totalAmount,
            paidAmount: 0,
            status: "UNPAID",
            isSample: false,
          },
        });

        createdList.push(inv);
      }

      return NextResponse.json({
        ok: true,
        createdCount: createdList.length,
        skippedRooms: skippedList,
        message: `สร้างบิลสำเร็จ ${createdList.length} รายการ (ข้ามห้องที่มีบิลแล้ว ${skippedList.length} ห้อง)`,
      });
    }

    // 2. สร้างบิลเดี่ยวสำหรับสัญญาที่เลือก
    if (body.action === "CREATE_SINGLE") {
      const {
        leaseId,
        billingMonth,
        dueDate,
        rentAmount,
        waterUnits,
        electricUnits,
        otherAmount,
        otherNote,
      } = body;

      if (!leaseId || !billingMonth) {
        return NextResponse.json(
          { error: "กรุณาเลือกสัญญาและระบุรอบเดือนของบิล" },
          { status: 400 }
        );
      }

      const lease = await prisma.lease.findUnique({
        where: { id: leaseId },
        include: { room: true },
      });
      if (!lease) {
        return NextResponse.json({ error: "ไม่พบข้อมูลสัญญา" }, { status: 404 });
      }

      const wUnits = Number(waterUnits) || 0;
      const eUnits = Number(electricUnits) || 0;
      const wAmt = wUnits * waterRate;
      const eAmt = eUnits * electricRate;
      const rAmt = rentAmount !== undefined ? Number(rentAmount) : lease.monthlyRent;
      const oAmt = Number(otherAmount) || 0;
      const totalAmount = rAmt + wAmt + eAmt + oAmt;

      const cleanMonth = billingMonth.replace("-", "");
      const invoiceNumber = `INV-${cleanMonth}-${lease.room.number}-${Date.now().toString().slice(-3)}`;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          leaseId: lease.id,
          roomId: lease.roomId,
          billingMonth,
          issueDate: today,
          dueDate: dueDate || addDays(today, 7),
          rentAmount: rAmt,
          waterUnits: wUnits,
          waterRate,
          waterAmount: wAmt,
          electricUnits: eUnits,
          electricRate,
          electricAmount: eAmt,
          otherAmount: oAmt,
          otherNote: otherNote || "",
          totalAmount,
          paidAmount: 0,
          status: "UNPAID",
          isSample: false,
        },
        include: { lease: { include: { room: true, guest: true } }, room: true },
      });

      return NextResponse.json(invoice, { status: 201 });
    }

    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/invoices error:", error);
    return NextResponse.json({ error: "ไม่สามารถสร้างบิลได้" }, { status: 500 });
  }
}
