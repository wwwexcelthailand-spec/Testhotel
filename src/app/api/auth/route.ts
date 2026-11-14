import { NextResponse } from "next/server";
import {
  verifyAdminPassword,
  setAdminSessionCookie,
  clearAdminSessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username = "admin", password } = body;
    if (!password) {
      return NextResponse.json({ error: "กรุณากรอกรหัสผ่าน" }, { status: 400 });
    }
    const valid = await verifyAdminPassword(password, username);
    if (!valid) {
      return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
    await setAdminSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Login error:", error);
    const errorMsg = error?.message || String(error);
    let userHint = "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
    
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || "";
    if (dbUrl.startsWith("https://")) {
      userHint = "ค่า DATABASE_URL ใน Netlify เป็น https:// (REST API) ซึ่งไม่ถูกต้อง ต้องใช้ Connection string ของ PostgreSQL ที่ขึ้นต้นด้วย postgresql:// (ดูได้จาก Supabase -> Database -> Connection string -> URI)";
    } else if (errorMsg.includes("Environment variable not found: DATABASE_URL") || !dbUrl) {
      userHint = "ยังไม่ได้ตั้งค่า DATABASE_URL ใน Environment Variables ของ Netlify กรุณาเพิ่มที่ Netlify Site configuration -> Environment variables";
    } else if (errorMsg.includes("does not exist") || errorMsg.includes("relation") || errorMsg.includes("Table")) {
      userHint = "ยังไม่ได้สร้างตารางใน Supabase กรุณานำโค้ดในไฟล์ supabase-schema.sql ไปวางใน Supabase -> SQL Editor แล้วกด Run";
    } else if (errorMsg.includes("Can't reach database server") || errorMsg.includes("Authentication failed")) {
      userHint = "ไม่สามารถเชื่อมต่อ Supabase ได้ กรุณาตรวจสอบรหัสผ่านใน DATABASE_URL หรือโหมด Connection Pooler (พอร์ต 6543)";
    } else if (errorMsg.includes("42P05") || errorMsg.includes("prepared statement")) {
      userHint = "การเชื่อมต่อฐานข้อมูล Pooler เกิดการชนกัน (42P05) กรุณาเพิ่ม ?pgbouncer=true ต่อท้าย DATABASE_URL ใน Netlify หรือลองเข้าสู่ระบบใหม่อีกครั้ง";
    } else if (errorMsg.includes("Query engine") || errorMsg.includes("binaryTargets")) {
      userHint = "Prisma Query Engine ไม่ตรงกับระบบ Netlify กรุณาตรวจสอบ schema.prisma และ netlify.toml";
    }

    return NextResponse.json(
      { 
        error: userHint,
        detail: errorMsg,
      }, 
      { status: 500 }
    );
  }
}

export async function DELETE() {
  await clearAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
