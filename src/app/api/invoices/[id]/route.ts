import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePromptPayDataUrl } from "@/lib/qrcode";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const [invoice, settings] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: params.id },
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
    ]);

    if (!invoice) {
      return NextResponse.json({ error: "ไม่พบบิลที่ต้องการ" }, { status: 404 });
    }

    const remainingAmount = Math.max(0, invoice.totalAmount - invoice.paidAmount);
    // หากเจ้าของอัปโหลดรูป QR Code รับเงิน (PromptPay / Bank QR) ไว้ ให้ใช้รูปภาพนั้นเป็นหลัก
    const qrDataUrl =
      settings?.promptPayQrUrl ||
      (await generatePromptPayDataUrl(
        settings?.promptPayId || "",
        remainingAmount
      ));

    return NextResponse.json({
      invoice,
      settings,
      qrDataUrl,
    });
  } catch (error) {
    console.error("GET /api/invoices/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลบิลได้" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const existing = await prisma.invoice.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบบิลที่ต้องการ" }, { status: 404 });
    }

    // ฟังก์ชันบันทึก LINE ID ของผู้เช่าอย่างรวดเร็ว
    if (body.action === "UPDATE_LINE_ID") {
      const lineId = String(body.tenantLineId || "").trim();
      const lease = await prisma.lease.update({
        where: { id: existing.leaseId },
        data: { tenantLineId: lineId },
        include: { guest: true, room: true },
      });
      if (lease.guestId) {
        await prisma.guest.update({
          where: { id: lease.guestId },
          data: { lineId },
        });
      }
      return NextResponse.json({ ok: true, tenantLineId: lineId });
    }

    // ฟังก์ชันบันทึกการชำระเงิน (Record Payment)
    if (body.action === "PAY") {
      const incomingPaid = Number(body.paidAmount);
      if (isNaN(incomingPaid) || incomingPaid <= 0) {
        return NextResponse.json(
          { error: "กรุณาระบุจำนวนเงินที่ชำระให้ถูกต้อง" },
          { status: 400 }
        );
      }

      const totalPaid = (existing.paidAmount || 0) + incomingPaid;
      const isFull = totalPaid >= existing.totalAmount;

      const updated = await prisma.invoice.update({
        where: { id: params.id },
        data: {
          paidAmount: totalPaid,
          paymentMethod: body.paymentMethod || "PROMPTPAY",
          status: isFull ? "PAID" : "PARTIAL",
          paidAt: isFull ? new Date() : existing.paidAt,
        },
        include: {
          lease: { include: { room: true, guest: true } },
          room: true,
        },
      });

      return NextResponse.json(updated);
    }

    // กรณีแก้ไขรายละเอียดบิลทั่วไป
    const rentAmount = body.rentAmount !== undefined ? Number(body.rentAmount) : existing.rentAmount;
    const waterUnits = body.waterUnits !== undefined ? Number(body.waterUnits) : existing.waterUnits;
    const waterRate = body.waterRate !== undefined ? Number(body.waterRate) : existing.waterRate;
    const waterAmount = waterUnits * waterRate;

    const electricUnits = body.electricUnits !== undefined ? Number(body.electricUnits) : existing.electricUnits;
    const electricRate = body.electricRate !== undefined ? Number(body.electricRate) : existing.electricRate;
    const electricAmount = electricUnits * electricRate;

    const otherAmount = body.otherAmount !== undefined ? Number(body.otherAmount) : existing.otherAmount;
    const otherNote = body.otherNote !== undefined ? body.otherNote : existing.otherNote;
    const lateFeeAmount = body.lateFeeAmount !== undefined ? Number(body.lateFeeAmount) : existing.lateFeeAmount;

    const totalAmount = rentAmount + waterAmount + electricAmount + otherAmount + lateFeeAmount;
    const paidAmount = body.paidAmount !== undefined ? Number(body.paidAmount) : existing.paidAmount;

    let status = existing.status;
    if (paidAmount >= totalAmount && totalAmount > 0) {
      status = "PAID";
    } else if (paidAmount > 0) {
      status = "PARTIAL";
    }

    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        dueDate: body.dueDate || existing.dueDate,
        rentAmount,
        waterUnits,
        waterRate,
        waterAmount,
        electricUnits,
        electricRate,
        electricAmount,
        otherAmount,
        otherNote,
        lateFeeAmount,
        totalAmount,
        paidAmount,
        status: body.status || status,
        paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : existing.paymentMethod,
      },
      include: {
        lease: { include: { room: true, guest: true } },
        room: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/invoices/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถอัปเดตบิลได้" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.invoice.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/invoices/[id] error:", error);
    return NextResponse.json({ error: "ไม่สามารถลบบิลได้" }, { status: 500 });
  }
}
