import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clearSampleData, seedSampleData } from "../../../../prisma/seed";

export async function GET() {
  try {
    let setting = await prisma.setting.findUnique({ where: { id: 1 } });
    if (!setting) {
      setting = await prisma.setting.create({ data: { id: 1 } });
    }
    const sampleRoomsCount = await prisma.room.count({
      where: { isSample: true },
    });
    const { passwordHash, ...safeSetting } = setting;
    return NextResponse.json({
      ...safeSetting,
      hasCustomPassword: Boolean(passwordHash),
      sampleRoomsCount,
    });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { 
        error: "ไม่สามารถดึงข้อมูลตั้งค่าได้",
        detail: error?.message || String(error),
      }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyName,
      propertyAddress,
      propertyPhone,
      waterRate,
      electricRate,
      lateFeePerDay,
      checkInTime,
      checkOutTime,
      leaseWarningDays,
      promptPayId,
      promptPayQrUrl,
      loginImageUrl,
      newPassword,
    } = body;

    const data: Record<string, unknown> = {};
    if (propertyName !== undefined) data.propertyName = String(propertyName).trim();
    if (propertyAddress !== undefined) data.propertyAddress = String(propertyAddress).trim();
    if (propertyPhone !== undefined) data.propertyPhone = String(propertyPhone).trim();
    if (waterRate !== undefined) data.waterRate = Number(waterRate);
    if (electricRate !== undefined) data.electricRate = Number(electricRate);
    if (lateFeePerDay !== undefined) data.lateFeePerDay = Number(lateFeePerDay);
    if (checkInTime !== undefined) data.checkInTime = String(checkInTime);
    if (checkOutTime !== undefined) data.checkOutTime = String(checkOutTime);
    if (leaseWarningDays !== undefined) data.leaseWarningDays = Number(leaseWarningDays);
    if (promptPayId !== undefined) data.promptPayId = String(promptPayId).trim();
    if (promptPayQrUrl !== undefined) data.promptPayQrUrl = String(promptPayQrUrl).trim();
    if (loginImageUrl !== undefined) data.loginImageUrl = String(loginImageUrl).trim();

    if (newPassword && String(newPassword).trim().length >= 4) {
      const hashed = await bcrypt.hash(String(newPassword).trim(), 10);
      data.passwordHash = hashed;
      try {
        await prisma.adminUser.upsert({
          where: { username: "admin" },
          update: { passwordHash: hashed },
          create: {
            id: "admin",
            username: "admin",
            passwordHash: hashed,
            name: "เจ้าของหอพัก (Admin)",
            role: "ADMIN",
          },
        });
      } catch (e) {
        console.warn("Could not sync to AdminUser table:", e);
      }
    }

    const updated = await prisma.setting.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    const { passwordHash, ...safeSetting } = updated;
    return NextResponse.json({
      ...safeSetting,
      hasCustomPassword: Boolean(passwordHash),
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการตั้งค่าได้" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "CLEAR_SAMPLE") {
      await clearSampleData();
      return NextResponse.json({ ok: true, message: "ลบข้อมูลตัวอย่างทั้งหมดเรียบร้อยแล้ว" });
    }
    if (body.action === "RESTORE_SAMPLE") {
      await seedSampleData();
      return NextResponse.json({ ok: true, message: "สร้างข้อมูลตัวอย่าง 10 ห้องเรียบร้อยแล้ว" });
    }
    return NextResponse.json({ error: "คำสั่งไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json({ error: "ดำเนินการไม่สำเร็จ" }, { status: 500 });
  }
}
