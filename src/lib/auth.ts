import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "rm_admin_session";
const SECRET = process.env.SESSION_SECRET || "room-manager-secret-key-local-2026";

function signToken(payload: string): string {
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return sig === expected && payload.startsWith("admin:");
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  let setting = await prisma.setting.findUnique({ where: { id: 1 } });
  if (!setting) {
    setting = await prisma.setting.create({ data: { id: 1 } });
  }
  if (!setting.passwordHash) {
    return password === "admin1234";
  }
  return bcrypt.compare(password, setting.passwordHash);
}

export async function setAdminSessionCookie() {
  const token = signToken(`admin:${Date.now()}`);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearAdminSessionCookie() {
  cookies().delete(COOKIE_NAME);
}
