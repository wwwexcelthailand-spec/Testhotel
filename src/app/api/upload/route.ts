import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ไม่พบไฟล์ที่ต้องการอัปโหลด" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let fileUrl = "";
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      const timestamp = Date.now();
      const sanitizedOriginal = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filename = `${timestamp}-${sanitizedOriginal}`;
      const filepath = path.join(uploadDir, filename);
      await writeFile(filepath, buffer);
      fileUrl = `/uploads/${filename}`;
    } catch {
      // Serverless (Netlify/Vercel) fallback: แปลงเป็น Data URI เมื่อไฟล์ซิสเต็มเป็นแบบ Read-only
      const base64 = buffer.toString("base64");
      const mime = file.type || "application/octet-stream";
      fileUrl = `data:${mime};base64,${base64}`;
    }

    return NextResponse.json({
      url: fileUrl,
      originalName: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "ไม่สามารถอัปโหลดไฟล์ได้" }, { status: 500 });
  }
}
