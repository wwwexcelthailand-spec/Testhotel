"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  LogIn,
  LogOut,
  BedDouble,
  Wallet,
  AlertCircle,
  Clock,
  CalendarDays,
  Plus,
  CheckCircle2,
  Sparkles,
  FileWarning,
  Phone,
  RotateCcw,
} from "lucide-react";
import {
  formatCurrency,
  formatThaiDate,
  ROOM_STATUS_MAP,
  BOOKING_STATUS_MAP,
} from "@/lib/utils";

interface DashboardData {
  today: string;
  setting: {
    propertyName: string;
    checkInTime: string;
    checkOutTime: string;
    lateFeePerDay: number;
  } | null;
  totalRooms: number;
  statusCounts: {
    AVAILABLE: number;
    OCCUPIED: number;
    RESERVED: number;
    CLEANING: number;
    MAINTENANCE: number;
  };
  checkInsToday: Array<{
    id: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    dailyRate: number;
    paidAmount: number;
    status: string;
    room: { number: string; name: string };
  }>;
  checkOutsToday: Array<{
    id: string;
    bookingNumber: string;
    guestName: string;
    guestPhone: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    dailyRate: number;
    paidAmount: number;
    status: string;
    room: { number: string; name: string };
  }>;
  revenueThisMonth: number;
  dailyRevenueThisMonth: number;
  monthlyRevenueThisMonth: number;
  unpaidInvoices: Array<{
    id: string;
    invoiceNumber: string;
    billingMonth: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    lateDays: number;
    lateFeeAmount: number;
    lease: { tenantName: string; room: { number: string } };
  }>;
  unpaidTotal: number;
  expiringLeases: Array<{
    id: string;
    leaseNumber: string;
    tenantName: string;
    tenantPhone: string;
    endDate: string;
    room: { number: string; name: string };
  }>;
  rooms: Array<{
    id: string;
    number: string;
    name: string;
    floor: number;
    dailyRate: number;
    monthlyRate: number;
    status: string;
    imageUrl: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleBookingAction(
    bookingId: string,
    action: "CHECK_IN" | "CHECK_OUT"
  ) {
    setBusyId(bookingId);
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await loadDashboard();
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickRoomStatus(roomId: string, status: string) {
    setBusyId(roomId);
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-2xl bg-[#eeeeee]" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-28 rounded-2xl bg-white border border-[#eeeeee]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-8 text-center max-w-lg mx-auto my-8 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#f8e4e4] text-[#ac2d2d] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-bold text-[#222222]">
            ไม่สามารถโหลดข้อมูลหน้าหลักได้
          </h2>
          <p className="text-xs text-[#666666]">
            {error || "เกิดข้อผิดพลาดในการดึงข้อมูลจากฐานข้อมูล"}
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-sm font-semibold transition shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ลองโหลดข้อมูลใหม่</span>
        </button>
      </div>
    );
  }

  const checkInTime = data.setting?.checkInTime || "14:00";
  const checkOutTime = data.setting?.checkOutTime || "12:00";

  return (
    <div className="space-y-6">
      {/* Hero Banner สไตล์ Rooms at the Inn Retford */}
      <div className="relative rounded-2xl overflow-hidden border border-[#eeeeee] bg-[#2a0e3d] text-white shadow-sm">
        <img
          src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=80"
          alt="Boutique Hotel Banner"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2a0e3d]/95 via-[#5c2484]/85 to-[#5c2484]/60" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>
                วันนี้ {formatThaiDate(data.today)} · เช็คอิน {checkInTime} น. /
                เช็คเอาท์ก่อน {checkOutTime} น.
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              {data.setting?.propertyName || "เดอะ เรทฟอร์ด เรสซิเดนซ์"}
            </h1>
            <p className="text-xs sm:text-sm text-white/85">
              ภาพรวมการเข้าพักรายวัน สัญญารายเดือน และสถานะห้องพักทั้งหมด {data.totalRooms} ห้อง
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/meter"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-medium transition backdrop-blur-sm"
            >
              <span>จดมิเตอร์น้ำ-ไฟ</span>
            </Link>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-medium transition backdrop-blur-sm"
            >
              <span>บิลรายเดือน</span>
            </Link>
            <Link
              href="/calendar"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs sm:text-sm font-medium transition backdrop-blur-sm"
            >
              <CalendarDays className="w-4 h-4" />
              <span>ปฏิทินลากวาง</span>
            </Link>
            <Link
              href="/bookings?new=1"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#5c2484] hover:bg-[#f5eef9] text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>จองห้องรายวัน</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 5 การ์ดสรุปตัวเลขสำคัญ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between text-[#5c2484] mb-2">
            <span className="text-xs font-medium text-[#666666]">
              เช็คอินวันนี้ ({checkInTime})
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f5eef9] flex items-center justify-center">
              <LogIn className="w-4 h-4 text-[#5c2484]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#222222]">
            {data.checkInsToday.length}{" "}
            <span className="text-xs font-normal text-[#666666]">รายการ</span>
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            รอเข้าพัก{" "}
            {data.checkInsToday.filter((b) => b.status === "CONFIRMED").length} ห้อง
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#666666]">
              เช็คเอาท์วันนี้ (ก่อน {checkOutTime})
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#fcf8d8] flex items-center justify-center">
              <LogOut className="w-4 h-4 text-[#5e5515]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#222222]">
            {data.checkOutsToday.length}{" "}
            <span className="text-xs font-normal text-[#666666]">รายการ</span>
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            รออนุมัติออก{" "}
            {data.checkOutsToday.filter((b) => b.status === "CHECKED_IN").length} ห้อง
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#666666]">ห้องว่างพร้อมขาย</span>
            <div className="w-8 h-8 rounded-lg bg-[#cef5ca] flex items-center justify-center">
              <BedDouble className="w-4 h-4 text-[#114e0b]" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#114e0b]">
            {data.statusCounts.AVAILABLE}{" "}
            <span className="text-xs font-normal text-[#666666]">
              / {data.totalRooms} ห้อง
            </span>
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            มีผู้พัก {data.statusCounts.OCCUPIED} · รอทำความสะอาด{" "}
            {data.statusCounts.CLEANING}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#666666]">รายได้เดือนนี้</span>
            <div className="w-8 h-8 rounded-lg bg-[#f5eef9] flex items-center justify-center">
              <Wallet className="w-4 h-4 text-[#5c2484]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#5c2484]">
            {formatCurrency(data.revenueThisMonth)}
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            รายวัน {formatCurrency(data.dailyRevenueThisMonth)} · รายเดือน{" "}
            {formatCurrency(data.monthlyRevenueThisMonth)}
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-[#eeeeee] p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#666666]">
              บิลค้าง / สัญญาใกล้หมด
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#f8e4e4] flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-[#ac2d2d]" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#ac2d2d]">
            {formatCurrency(data.unpaidTotal)}
          </p>
          <p className="text-[11px] text-[#666666] mt-1">
            ค้าง {data.unpaidInvoices.length} บิล · สัญญาใกล้หมด{" "}
            {data.expiringLeases.length} ห้อง
          </p>
        </div>
      </div>

      {/* คิวเช็คอินวันนี้ & เช็คเอาท์วันนี้ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* เช็คอินวันนี้ */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5c2484]" />
              <h2 className="font-semibold text-sm sm:text-base text-[#222222]">
                รายการเช็คอินวันนี้ (ตั้งแต่ {checkInTime} น.)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f5eef9] text-[#5c2484] font-semibold">
              {data.checkInsToday.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-[#eeeeee]">
            {data.checkInsToday.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#777777]">
                ไม่มีคิวเช็คอินสำหรับวันนี้
              </div>
            ) : (
              data.checkInsToday.map((b) => {
                const st = BOOKING_STATUS_MAP[b.status] || BOOKING_STATUS_MAP.CONFIRMED;
                return (
                  <div
                    key={b.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafafa]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#5c2484] text-white text-xs font-bold">
                          ห้อง {b.room.number}
                        </span>
                        <span className="font-semibold text-sm text-[#222222]">
                          {b.guestName}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666] flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {b.guestPhone || "-"}
                        </span>
                        <span>
                          พัก {b.nights} คืน (ออก {formatThaiDate(b.checkOutDate)})
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.status === "CONFIRMED" ? (
                        <button
                          onClick={() => handleBookingAction(b.id, "CHECK_IN")}
                          disabled={busyId === b.id}
                          className="px-3.5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                        >
                          {busyId === b.id ? "กำลังบันทึก..." : "เช็คอินเข้าพัก"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#114e0b]">
                          <CheckCircle2 className="w-4 h-4" />
                          เช็คอินแล้ว
                        </span>
                      )}
                      <Link
                        href={`/bookings?id=${b.id}`}
                        className="px-3 py-2 rounded-xl border border-[#dddddd] text-xs font-medium text-[#444444] hover:bg-[#f5eef9] hover:text-[#5c2484]"
                      >
                        รายละเอียด
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* เช็คเอาท์วันนี้ */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b49b12]" />
              <h2 className="font-semibold text-sm sm:text-base text-[#222222]">
                รายการเช็คเอาท์วันนี้ (ก่อน {checkOutTime} น.)
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#fcf8d8] text-[#5e5515] font-semibold">
              {data.checkOutsToday.length} รายการ
            </span>
          </div>

          <div className="divide-y divide-[#eeeeee]">
            {data.checkOutsToday.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#777777]">
                ไม่มีคิวเช็คเอาท์สำหรับวันนี้
              </div>
            ) : (
              data.checkOutsToday.map((b) => {
                const st = BOOKING_STATUS_MAP[b.status] || BOOKING_STATUS_MAP.CHECKED_IN;
                return (
                  <div
                    key={b.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#fafafa]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[#222222] text-white text-xs font-bold">
                          ห้อง {b.room.number}
                        </span>
                        <span className="font-semibold text-sm text-[#222222]">
                          {b.guestName}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666]">
                        เข้าพักตั้งแต่ {formatThaiDate(b.checkInDate)} ({b.nights} คืน) ·
                        ชำระแล้ว {formatCurrency(b.paidAmount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {b.status === "CHECKED_IN" ? (
                        <button
                          onClick={() => handleBookingAction(b.id, "CHECK_OUT")}
                          disabled={busyId === b.id}
                          className="px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#000000] text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
                        >
                          {busyId === b.id ? "กำลังบันทึก..." : "เช็คเอาท์ออก"}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#555555]">
                          <CheckCircle2 className="w-4 h-4" />
                          ออกแล้ว
                        </span>
                      )}
                      <Link
                        href={`/bookings?id=${b.id}`}
                        className="px-3 py-2 rounded-xl border border-[#dddddd] text-xs font-medium text-[#444444] hover:bg-[#f5eef9] hover:text-[#5c2484]"
                      >
                        ใบเสร็จ
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* แจ้งเตือนบิลค้างชำระ & สัญญารายเดือนใกล้หมด */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-[#ac2d2d]" />
              <h2 className="font-semibold text-sm sm:text-base text-[#222222]">
                บิลรายเดือนค้างชำระ (ค่าปรับ {data.setting?.lateFeePerDay ?? 50} บ./วัน)
              </h2>
            </div>
            <Link
              href="/invoices?status=UNPAID"
              className="text-xs font-semibold text-[#ac2d2d] hover:underline"
            >
              {data.unpaidInvoices.length} บิล (ดูทั้งหมด →)
            </Link>
          </div>
          <div className="divide-y divide-[#eeeeee]">
            {data.unpaidInvoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#777777]">
                ไม่มีบิลค้างชำระในขณะนี้
              </div>
            ) : (
              data.unpaidInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 sm:px-5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#f8e4e4] text-[#ac2d2d] text-xs font-bold">
                        ห้อง {inv.lease.room.number}
                      </span>
                      <span className="text-sm font-semibold text-[#222222]">
                        {inv.lease.tenantName}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] mt-0.5">
                      รอบเดือน {inv.billingMonth} · ครบกำหนด {formatThaiDate(inv.dueDate)}
                      {inv.lateDays > 0 && (
                        <span className="text-[#ac2d2d] font-medium">
                          {" "}
                          (เกินกำหนด {inv.lateDays} วัน ค่าปรับ{" "}
                          {formatCurrency(inv.lateFeeAmount)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#ac2d2d]">
                      {formatCurrency(inv.totalAmount - inv.paidAmount)}
                    </p>
                    <p className="text-[11px] text-[#777777]">{inv.invoiceNumber}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#5c2484]" />
              <h2 className="font-semibold text-sm sm:text-base text-[#222222]">
                สัญญารายเดือนใกล้หมดอายุ
              </h2>
            </div>
            <Link
              href="/leases"
              className="text-xs font-semibold text-[#5c2484] hover:underline"
            >
              {data.expiringLeases.length} สัญญา (ดูทั้งหมด →)
            </Link>
          </div>
          <div className="divide-y divide-[#eeeeee]">
            {data.expiringLeases.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#777777]">
                ไม่มีสัญญาที่ใกล้หมดอายุในช่วงนี้
              </div>
            ) : (
              data.expiringLeases.map((lease) => (
                <div
                  key={lease.id}
                  className="p-4 sm:px-5 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#f5eef9] text-[#5c2484] text-xs font-bold">
                        ห้อง {lease.room.number}
                      </span>
                      <span className="text-sm font-semibold text-[#222222]">
                        {lease.tenantName}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666] mt-0.5">
                      โทร {lease.tenantPhone || "-"} · เลขสัญญา {lease.leaseNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full bg-[#fcf8d8] text-[#5e5515] text-xs font-semibold">
                      หมดสัญญา {formatThaiDate(lease.endDate)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ผังสถานะห้องพักด่วน (Quick Room Status Overview) */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#222222]">
              ผังสถานะห้องพักทั้งหมด ({data.rooms.length} ห้อง)
            </h2>
            <p className="text-xs text-[#666666]">
              คลิกเปลี่ยนสถานะด่วนได้ทันที เช่น เมื่อแม่บ้านทำความสะอาดเสร็จ
            </p>
          </div>
          <Link
            href="/rooms"
            className="text-xs font-semibold text-[#5c2484] hover:underline"
          >
            จัดการข้อมูลห้องพักทั้งหมด →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {data.rooms.map((room) => {
            const st = ROOM_STATUS_MAP[room.status] || ROOM_STATUS_MAP.AVAILABLE;
            return (
              <div
                key={room.id}
                className="rounded-xl border border-[#eeeeee] overflow-hidden bg-white hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="relative h-28 bg-[#f5eef9]">
                  {room.imageUrl && (
                    <img
                      src={room.imageUrl}
                      alt={room.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-white/95 text-[#222222] font-bold text-xs shadow-sm">
                      ห้อง {room.number}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${st.bg} ${st.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                    <p className="text-xs font-semibold truncate">{room.name}</p>
                    <p className="text-[11px] text-white/85">
                      {formatCurrency(room.dailyRate)}/คืน ·{" "}
                      {formatCurrency(room.monthlyRate)}/ด.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-[#fafafa] border-t border-[#eeeeee] flex items-center justify-between gap-1.5">
                  <select
                    aria-label={`เปลี่ยนสถานะห้อง ${room.number}`}
                    value={room.status}
                    disabled={busyId === room.id}
                    onChange={(e) => handleQuickRoomStatus(room.id, e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-[#dddddd] bg-white text-[#222222] font-medium focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
                  >
                    <option value="AVAILABLE">สถานะ: ว่าง</option>
                    <option value="OCCUPIED">สถานะ: มีผู้พัก</option>
                    <option value="RESERVED">สถานะ: จองแล้ว</option>
                    <option value="CLEANING">สถานะ: ทำความสะอาด</option>
                    <option value="MAINTENANCE">สถานะ: ซ่อมบำรุง</option>
                  </select>
                  {room.status === "CLEANING" && (
                    <button
                      type="button"
                      onClick={() => handleQuickRoomStatus(room.id, "AVAILABLE")}
                      title="ทำเครื่องหมายว่าทำความสะอาดเสร็จแล้ว"
                      className="shrink-0 p-1.5 rounded-lg bg-[#cef5ca] text-[#114e0b] hover:opacity-90"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
