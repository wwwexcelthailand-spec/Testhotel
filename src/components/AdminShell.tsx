"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  CalendarCheck2,
  FileText,
  Gauge,
  Receipt,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const PRIMARY_NAV = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทินห้องพัก", icon: CalendarDays },
  { href: "/rooms", label: "จัดการห้องพัก", icon: BedDouble },
  { href: "/bookings", label: "การจองรายวัน", icon: CalendarCheck2 },
  { href: "/leases", label: "สัญญารายเดือน", icon: FileText },
  { href: "/meter", label: "จดมิเตอร์น้ำ-ไฟ", icon: Gauge },
  { href: "/invoices", label: "บิล & ชำระเงิน", icon: Receipt },
  { href: "/guests", label: "ทะเบียนผู้เช่า/ผู้พัก", icon: Users },
  { href: "/reports", label: "รายงาน & สถิติ", icon: BarChart3 },
  { href: "/settings", label: "ตั้งค่า & Backup", icon: Settings },
];

const MOBILE_BOTTOM_NAV = [
  { href: "/", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/calendar", label: "ปฏิทิน", icon: CalendarDays },
  { href: "/bookings", label: "รายวัน", icon: CalendarCheck2 },
  { href: "/meter", label: "มิเตอร์", icon: Gauge },
  { href: "/invoices", label: "บิล", icon: Receipt },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafafa]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#eeeeee] z-30">
        <div className="p-6 border-b border-[#eeeeee] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5c2484] flex items-center justify-center text-white shadow-sm shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-lg font-bold text-[#222222] truncate">
              The Retford
            </h1>
            <p className="text-xs text-[#666666] truncate">
              ระบบจัดการห้องพัก (Owner Admin)
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#888888]">
            เมนูการจัดการ
          </p>
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  active
                    ? "bg-[#5c2484] text-white shadow-sm"
                    : "text-[#333333] hover:bg-[#f5eef9] hover:text-[#5c2484]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#eeeeee]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-[#666666] hover:text-[#ac2d2d] hover:bg-[#f8e4e4]/60 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#eeeeee] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#5c2484] flex items-center justify-center text-white">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-base text-[#222222]">
            The Retford Admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#222222] hover:bg-[#f5eef9]"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileMenuOpen(false)}>
          <div
            className="w-72 max-w-[80vw] h-full bg-white p-5 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
                <span className="font-serif font-bold text-lg text-[#5c2484]">
                  เมนูจัดการห้องพัก
                </span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-[#666666]" />
                </button>
              </div>
              <div className="space-y-1">
                {PRIMARY_NAV.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        active
                          ? "bg-[#5c2484] text-white"
                          : "text-[#333333] hover:bg-[#f5eef9]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-[#ac2d2d] bg-[#f8e4e4]/60"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:pl-64 pb-20 lg:pb-10">
        {/* Top Header Bar บนคอมพิวเตอร์ มีปุ่มปรับธีมสว่าง/มืด อยู่มุมขวามือ */}
        <div className="sticky top-0 z-20 hidden lg:flex items-center justify-end px-8 py-3 bg-[#fafafa]/85 backdrop-blur-md border-b border-[#eeeeee]">
          <ThemeToggle />
        </div>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#eeeeee] grid grid-cols-5 py-1.5 px-1 shadow-lg">
        {MOBILE_BOTTOM_NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[11px] font-medium transition ${
                active ? "text-[#5c2484]" : "text-[#666666]"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
