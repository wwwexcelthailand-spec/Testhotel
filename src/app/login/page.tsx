"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Building2, ArrowRight, ShieldCheck } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const DEFAULT_LOGIN_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginImageUrl, setLoginImageUrl] = useState("");
  const [propertyName, setPropertyName] = useState("เดอะ เรทฟอร์ด เรสซิเดนซ์");

  useEffect(() => {
    try {
      const cachedName = localStorage.getItem("rm_property_name");
      const cachedImage = localStorage.getItem("rm_login_image");
      if (cachedName) setPropertyName(cachedName);
      if (cachedImage) setLoginImageUrl(cachedImage);
    } catch {
      // ignore storage errors
    }

    async function fetchSettings() {
      try {
        const res = await fetch(`/api/settings?t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.propertyName) {
            setPropertyName(data.propertyName);
            try {
              localStorage.setItem("rm_property_name", data.propertyName);
            } catch {
              // ignore storage errors
            }
          }
          if (data.loginImageUrl) {
            setLoginImageUrl(data.loginImageUrl);
            try {
              localStorage.setItem("rm_login_image", data.loginImageUrl);
            } catch {
              // ignore storage errors
            }
          } else if (data.loginImageUrl === "") {
            setLoginImageUrl("");
            try {
              localStorage.removeItem("rm_login_image");
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch {
        // use cached or default fallback
      }
    }
    fetchSettings();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.detail && data.detail !== data.error) {
          setError(`${data.error}\n(${data.detail})`);
        } else {
          setError(data.error || "รหัสผ่านไม่ถูกต้อง");
        }
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  }

  const activeImage = loginImageUrl || DEFAULT_LOGIN_IMAGE;

  return (
    <div className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
      {/* ปุ่มสลับธีม สว่าง/มืด อยู่มุมบนขวามือ */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
        <ThemeToggle />
      </div>

      {/* ด้านซ้าย: ภาพบรรยากาศห้องพัก (ปรับเปลี่ยนได้จากหน้าตั้งค่า) */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden">
        <img
          src={activeImage}
          alt={propertyName}
          className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2a0e3d]/95 via-[#5c2484]/75 to-[#1a0926]/60" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/25 shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-serif text-xl tracking-wide font-semibold uppercase">
              {propertyName}
            </p>
            <p className="text-xs text-white/80">
              Property Management Suite (Owner Edition)
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-4">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-white/15 border border-white/20 backdrop-blur-sm">
            ระบบบริหารห้องพักรายวัน & รายเดือน
          </span>
          <h1 className="font-serif text-4xl leading-tight font-semibold">
            จัดการห้องพัก ปฏิทินการจอง และบิลรายเดือนในที่เดียว
          </h1>
          <p className="text-sm text-white/85 leading-relaxed">
            ออกแบบสำหรับเจ้าของคนเดียว ข้อมูลทั้งหมดเก็บอยู่ในเครื่องของคุณอย่างปลอดภัย
            พร้อมระบบป้องกันการจองซ้อนทับระหว่างรายวันและสัญญารายเดือนอัตโนมัติ
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/70 border-t border-white/15 pt-4">
          <span>เช็คอินรายวัน 14:00 น. · เช็คเอาท์ก่อน 12:00 น.</span>
          <span>ระบบบริหารจัดการห้องพัก (Owner Edition)</span>
        </div>
      </div>

      {/* ด้านขวา: ฟอร์มรหัสผ่านผู้ดูแลระบบคนเดียว */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-12 bg-[#fafafa]">
        {/* แบนเนอร์แสดงภาพสำหรับอุปกรณ์มือถือ */}
        <div className="lg:hidden w-full max-w-md mb-4 rounded-2xl overflow-hidden relative shadow-sm border border-[#eeeeee]">
          <div className="relative h-32 w-full">
            <img
              src={activeImage}
              alt={propertyName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2a0e3d]/90 via-[#5c2484]/70 to-[#1a0926]/40" />
            <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-white" />
                <p className="font-serif text-sm font-bold uppercase truncate">
                  {propertyName}
                </p>
              </div>
              <p className="text-[11px] text-white/80">ระบบบริหารห้องพักสำหรับเจ้าของ</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md bg-white rounded-2xl border border-[#eeeeee] shadow-sm p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#5c2484] flex items-center justify-center text-white shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#222222]">
                เข้าสู่ระบบเจ้าของหอพัก
              </h2>
              <p className="text-xs text-[#666666]">
                Single Admin Access · เข้าใช้งานด้วย ID: admin
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[#222222] mb-1.5"
              >
                ชื่อผู้ใช้ (Username / ID)
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#cccccc] bg-white text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#5c2484] focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#222222] mb-1.5"
              >
                รหัสผ่าน (Password)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน..."
                autoFocus
                required
                className="w-full px-4 py-2.5 rounded-xl border border-[#cccccc] bg-white text-[#222222] text-sm focus:outline-none focus:ring-2 focus:ring-[#5c2484] focus:border-transparent transition"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-[#f8e4e4] text-[#ac2d2d] text-xs font-medium leading-relaxed border border-[#f1c3c3] whitespace-pre-line">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50"
            >
              <span>{loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#eeeeee] flex items-start gap-3 text-xs text-[#666666]">
            <div className="w-8 h-8 rounded-lg bg-[#5c2484]/10 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4 text-[#5c2484]" />
            </div>
            <div>
              <p className="font-medium text-[#222222]">
                ระบบความปลอดภัยเฉพาะผู้ดูแลระบบ (Single Admin Access)
              </p>
              <p className="mt-0.5 text-[#777777] leading-relaxed text-[11.5px]">
                เข้าสู่ระบบเฉพาะเจ้าของและผู้จัดการหอพักที่ได้รับอนุญาต · ข้อมูลการจอง บิล และประวัติผู้พักทั้งหมดได้รับการปกป้องอย่างปลอดภัย
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
