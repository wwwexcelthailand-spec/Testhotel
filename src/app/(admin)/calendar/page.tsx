"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Lock,
  Plus,
  Move,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
} from "lucide-react";
import {
  toDateString,
  addDays,
  calculateNights,
  formatCurrency,
  formatThaiDate,
  ROOM_STATUS_MAP,
  cleanPhoneNumber,
} from "@/lib/utils";

interface Room {
  id: string;
  number: string;
  name: string;
  floor: number;
  dailyRate: number;
  monthlyRate: number;
  status: string;
}

interface Booking {
  id: string;
  bookingNumber: string;
  roomId: string;
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  dailyRate: number;
  deposit: number;
  paidAmount: number;
  status: string;
}

interface Lease {
  id: string;
  leaseNumber: string;
  roomId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: string;
}

const DAYS_TO_SHOW = 14;
const THAI_WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function CalendarPage() {
  const [startDate, setStartDate] = useState<string>(() =>
    addDays(toDateString(new Date()), -2)
  );
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [bannerMsg, setBannerMsg] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  // สถานะการลากวาง (Drag & Drop)
  const [dragBooking, setDragBooking] = useState<{
    booking: Booking;
    mode: "MOVE" | "RESIZE_END";
  } | null>(null);
  const [hoverCell, setHoverCell] = useState<{
    roomId: string;
    dateStr: string;
  } | null>(null);

  // Modal จองด่วนเมื่อคลิกช่องว่างในปฏิทิน
  const [quickModal, setQuickModal] = useState<{
    room: Room;
    checkInDate: string;
    checkOutDate: string;
    guestName: string;
    guestPhone: string;
    deposit: string;
    paidAmount: string;
    status: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "ไม่สามารถโหลดข้อมูลปฏิทินห้องพักได้");
      }
      const data = await res.json();
      setRooms(data.rooms || []);
      setBookings(
        (data.bookings || []).filter(
          (b: Booking) => b.status === "CONFIRMED" || b.status === "CHECKED_IN"
        )
      );
      setLeases(data.leases || []);
    } catch (err: any) {
      setLoadError(err?.message || "ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dateColumns = useMemo(() => {
    return Array.from({ length: DAYS_TO_SHOW }, (_, idx) => {
      const dStr = addDays(startDate, idx);
      const [y, m, d] = dStr.split("-").map(Number);
      const dt = new Date(y, m - 1, d);
      return {
        dateStr: dStr,
        dayNum: d,
        monthNum: m,
        weekday: THAI_WEEKDAYS[dt.getDay()],
        isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
      };
    });
  }, [startDate]);

  const windowEndExclusive = useMemo(
    () => addDays(startDate, DAYS_TO_SHOW),
    [startDate]
  );
  const todayStr = toDateString(new Date());

  // ตรวจสอบว่าห้องและวันนั้นติดสัญญารายเดือนหรือไม่
  function getActiveLeaseForCell(roomId: string, dateStr: string): Lease | undefined {
    return leases.find(
      (l) =>
        l.roomId === roomId &&
        l.status === "ACTIVE" &&
        l.startDate <= dateStr &&
        dateStr <= l.endDate
    );
  }

  // จัดการเมื่อปล่อยเมาส์จากการลากวาง (Drop)
  async function handleDropOnCell(targetRoomId: string, targetDateStr: string) {
    if (!dragBooking) return;
    const { booking, mode } = dragBooking;
    setDragBooking(null);
    setHoverCell(null);
    setBannerMsg(null);

    let newRoomId = booking.roomId;
    let newCheckIn = booking.checkInDate;
    let newCheckOut = booking.checkOutDate;

    if (mode === "MOVE") {
      const duration = Math.max(
        1,
        calculateNights(booking.checkInDate, booking.checkOutDate)
      );
      if (targetDateStr < todayStr && booking.checkInDate >= todayStr) {
        setBannerMsg({
          type: "error",
          text: "ไม่สามารถย้ายวันเช็คอินย้อนหลังไปในอดีตได้",
        });
        return;
      }
      newRoomId = targetRoomId;
      newCheckIn = targetDateStr;
      newCheckOut = addDays(targetDateStr, duration);
    } else if (mode === "RESIZE_END") {
      // ขยายหรือลดวันเช็คเอาท์ (ลากไปที่ช่องวันสุดท้ายที่เข้าพัก -> เช็คเอาท์คือวันถัดไป)
      const candidateOut = addDays(targetDateStr, 1);
      if (candidateOut <= booking.checkInDate) {
        setBannerMsg({
          type: "error",
          text: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอินอย่างน้อย 1 คืน",
        });
        return;
      }
      newCheckOut = candidateOut;
    }

    if (
      newRoomId === booking.roomId &&
      newCheckIn === booking.checkInDate &&
      newCheckOut === booking.checkOutDate
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: newRoomId,
          checkInDate: newCheckIn,
          checkOutDate: newCheckOut,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMsg({
          type: "error",
          text: data.error || "ไม่สามารถย้ายการจองได้เนื่องจากห้องไม่ว่าง",
        });
        return;
      }
      setBannerMsg({
        type: "success",
        text: `อัปเดตตารางจองของ "${booking.guestName}" เป็นห้อง ${data.room.number} (${formatThaiDate(
          newCheckIn
        )} - ${formatThaiDate(newCheckOut)}) เรียบร้อยแล้ว`,
      });
      await loadData();
    } catch {
      setBannerMsg({
        type: "error",
        text: "เกิดข้อผิดพลาดในการบันทึกตารางจอง",
      });
    }
  }

  function handleCellClick(room: Room, dateStr: string) {
    if (dateStr < todayStr) {
      setBannerMsg({
        type: "error",
        text: `วันที่ ${formatThaiDate(dateStr)} เป็นวันในอดีต ไม่สามารถสร้างการจองย้อนหลังได้`,
      });
      return;
    }
    const lease = getActiveLeaseForCell(room.id, dateStr);
    if (lease) {
      setBannerMsg({
        type: "error",
        text: `ห้อง ${room.number} ติดสัญญารายเดือนของ "${lease.tenantName}" ไม่สามารถจองรายวันทับได้`,
      });
      return;
    }
    setQuickModal({
      room,
      checkInDate: dateStr,
      checkOutDate: addDays(dateStr, 1),
      guestName: "",
      guestPhone: "",
      deposit: "0",
      paidAmount: String(room.dailyRate),
      status: dateStr === todayStr ? "CHECKED_IN" : "CONFIRMED",
    });
  }

  async function handleQuickBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickModal) return;
    setSubmitting(true);
    setBannerMsg(null);

    if (quickModal.checkInDate < todayStr) {
      setBannerMsg({
        type: "error",
        text: "ไม่สามารถจองย้อนหลังได้ (วันเช็คอินต้องเป็นวันนี้หรือวันข้างหน้า)",
      });
      setSubmitting(false);
      return;
    }

    if (quickModal.checkOutDate <= quickModal.checkInDate) {
      setBannerMsg({
        type: "error",
        text: "วันเช็คเอาท์ต้องอยู่หลังวันเช็คอินอย่างน้อย 1 คืน",
      });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: quickModal.room.id,
          guestName: quickModal.guestName,
          guestPhone: quickModal.guestPhone,
          checkInDate: quickModal.checkInDate,
          checkOutDate: quickModal.checkOutDate,
          dailyRate: quickModal.room.dailyRate,
          deposit: Number(quickModal.deposit) || 0,
          paidAmount: Number(quickModal.paidAmount) || 0,
          status: quickModal.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMsg({
          type: "error",
          text: data.error || "ไม่สามารถสร้างการจองได้",
        });
        setSubmitting(false);
        return;
      }
      setQuickModal(null);
      setBannerMsg({
        type: "success",
        text: `สร้างการจองรายวัน ห้อง ${quickModal.room.number} สำหรับ "${quickModal.guestName}" สำเร็จ`,
      });
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#222222]">
            ปฏิทินห้องพัก (ลากวางย้ายห้อง/เปลี่ยนวันได้)
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            ห้องแนวตั้ง · วันที่แนวนอน · คลิกช่องว่างเพื่อจองรายวัน ·
            ห้องที่มีสัญญารายเดือนจะถูกล็อกอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStartDate(addDays(startDate, -7))}
            className="p-2 rounded-xl border border-[#dddddd] hover:bg-[#f5eef9] text-[#222222]"
            title="ย้อนหลัง 7 วัน"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setStartDate(addDays(toDateString(new Date()), -1))}
            className="px-3.5 py-2 rounded-xl border border-[#dddddd] hover:bg-[#f5eef9] text-xs font-semibold text-[#5c2484]"
          >
            วันนี้
          </button>
          <div className="relative flex items-center">
            <CalendarIcon className="w-4 h-4 text-[#666666] absolute left-3 pointer-events-none" />
            <input
              type="date"
              aria-label="เลือกวันเริ่มต้นปฏิทิน"
              value={startDate}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl border border-[#dddddd] text-xs font-medium text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
            />
          </div>
          <button
            type="button"
            onClick={() => setStartDate(addDays(startDate, 7))}
            className="p-2 rounded-xl border border-[#dddddd] hover:bg-[#f5eef9] text-[#222222]"
            title="ถัดไป 7 วัน"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <Link
            href="/bookings?new=1"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มการจอง</span>
          </Link>
        </div>
      </div>

      {/* Legend แยกสีชัดเจน */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-[#eeeeee] px-4 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 font-medium text-[#222222]">
            <span className="w-3.5 h-3.5 rounded bg-[#5c2484]" />
            รายวัน: เช็คอินแล้ว (เข้า 14:00 / ออก 12:00)
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-[#222222]">
            <span className="w-3.5 h-3.5 rounded bg-[#2d62ff]" />
            รายวัน: จองแล้ว (รอเช็คอิน)
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-[#222222]">
            <span className="w-3.5 h-3.5 rounded bg-[#222222]" />
            สัญญารายเดือน (บล็อกการจองรายวันอัตโนมัติ)
          </span>
        </div>
        <span className="text-[#666666] inline-flex items-center gap-1.5">
          <Move className="w-3.5 h-3.5 text-[#5c2484]" />
          ลากแถบสีเพื่อย้ายห้อง/วัน หรือลากขอบขวาของแถบเพื่อเพิ่ม-ลดจำนวนคืน
        </span>
      </div>

      {bannerMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium ${
            bannerMsg.type === "error"
              ? "bg-[#f8e4e4] border-[#ac2d2d]/30 text-[#ac2d2d]"
              : "bg-[#cef5ca] border-[#114e0b]/30 text-[#114e0b]"
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === "error" ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ตารางปฏิทิน (Rooms Vertical, Dates Horizontal) */}
      <div className="bg-white rounded-2xl border border-[#dcd4e3] dark:border-[#3d3549] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div id="calendar-grid-container" className="min-w-[1020px]">
            {/* ส่วนหัวตาราง: รายชื่อวันแนวนอน */}
            <div className="flex border-b-2 border-[#c8bcd4] dark:border-[#4a4058] bg-[#fafafa]">
              <div className="w-[210px] shrink-0 p-3.5 font-semibold text-xs text-[#222222] border-r-2 border-[#c8bcd4] dark:border-[#4a4058] sticky left-0 bg-[#fafafa] z-20 flex items-center">
                ห้องพัก / วันที่
              </div>
              <div
                className="flex-1 grid"
                style={{
                  gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(58px, 1fr))`,
                }}
              >
                {dateColumns.map((col) => {
                  const isToday = col.dateStr === todayStr;
                  const isPast = col.dateStr < todayStr;
                  return (
                    <div
                      key={col.dateStr}
                      className={`py-2.5 px-1 text-center border-r border-[#dcd4e3] dark:border-[#3d3549] last:border-r-0 ${
                        isToday
                          ? "bg-[#5c2484] text-white"
                          : isPast
                          ? "bg-[#f4f1f7]/70 dark:bg-[#1e1a24] text-[#999999]"
                          : col.isWeekend
                          ? "bg-[#f5eef9]/60 text-[#222222]"
                          : "text-[#222222]"
                      }`}
                      title={isPast ? `${formatThaiDate(col.dateStr)} (วันในอดีต)` : undefined}
                    >
                      <p
                        className={`text-[10px] font-medium ${
                          isToday ? "text-white/90" : isPast ? "text-[#aaaaaa]" : "text-[#666666]"
                        }`}
                      >
                        {col.weekday}
                      </p>
                      <p className="text-sm font-bold leading-tight">
                        {col.dayNum}/{col.monthNum}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* แถวแต่ละห้องพัก */}
            {loading ? (
              <div className="p-12 text-center text-xs text-[#777777]">
                กำลังโหลดตารางปฏิทินห้องพัก...
              </div>
            ) : loadError ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-[#ac2d2d]">{loadError}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>โหลดตารางใหม่อีกครั้ง</span>
                </button>
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-sm text-[#666666]">
                  ยังไม่มีข้อมูลห้องพักในระบบ กรุณาเพิ่มห้องพักหรือนำเข้าข้อมูลตัวอย่างก่อนใช้งานปฏิทิน
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={loadData}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#dddddd] hover:bg-[#f5eef9] text-xs font-semibold text-[#222222] transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>รีเฟรช</span>
                  </button>
                  <Link
                    href="/rooms"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ไปหน้าจัดการห้องพัก</span>
                  </Link>
                </div>
              </div>
            ) : (
              rooms.map((room) => {
                const roomSt =
                  ROOM_STATUS_MAP[room.status] || ROOM_STATUS_MAP.AVAILABLE;

                // ค้นหาการจองรายวันของห้องนี้ที่อยู่ในช่วง 14 วัน
                const roomBookings = bookings.filter(
                  (b) =>
                    b.roomId === room.id &&
                    b.checkInDate < windowEndExclusive &&
                    b.checkOutDate > startDate
                );

                // ค้นหาสัญญารายเดือนของห้องนี้ที่อยู่ในช่วง 14 วัน
                const roomLeases = leases.filter(
                  (l) =>
                    l.roomId === room.id &&
                    l.status === "ACTIVE" &&
                    l.startDate < windowEndExclusive &&
                    addDays(l.endDate, 1) > startDate
                );

                return (
                  <div
                    key={room.id}
                    className="flex border-b border-[#dcd4e3] dark:border-[#3d3549] last:border-b-0 relative group"
                  >
                    {/* คอลัมน์ซ้าย: ข้อมูลห้องพัก */}
                    <div className="w-[210px] shrink-0 p-3 border-r-2 border-[#c8bcd4] dark:border-[#4a4058] sticky left-0 bg-white z-20 flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-sm text-[#222222]">
                          ห้อง {room.number}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${roomSt.bg} ${roomSt.text}`}
                        >
                          {roomSt.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666] truncate">{room.name}</p>
                      <p className="text-[11px] text-[#5c2484] font-medium mt-0.5">
                        {formatCurrency(room.dailyRate)}/คืน · ชั้น {room.floor}
                      </p>
                    </div>

                    {/* ช่องวันที่ 14 วัน + Overlay แถบการจอง */}
                    <div
                      className="flex-1 grid relative min-h-[68px]"
                      style={{
                        gridTemplateColumns: `repeat(${DAYS_TO_SHOW}, minmax(58px, 1fr))`,
                      }}
                    >
                      {dateColumns.map((col) => {
                        const leaseInCell = getActiveLeaseForCell(
                          room.id,
                          col.dateStr
                        );
                        const isPast = col.dateStr < todayStr;
                        const isHovered =
                          hoverCell?.roomId === room.id &&
                          hoverCell?.dateStr === col.dateStr;

                        return (
                          <div
                            key={col.dateStr}
                            onDragOver={(e) => {
                              if (isPast) return;
                              e.preventDefault();
                              if (
                                hoverCell?.roomId !== room.id ||
                                hoverCell?.dateStr !== col.dateStr
                              ) {
                                setHoverCell({
                                  roomId: room.id,
                                  dateStr: col.dateStr,
                                });
                              }
                            }}
                            onDrop={(e) => {
                              if (isPast) {
                                e.preventDefault();
                                setBannerMsg({
                                  type: "error",
                                  text: "ไม่สามารถย้ายวันเช็คอินย้อนหลังไปในอดีตได้",
                                });
                                return;
                              }
                              e.preventDefault();
                              handleDropOnCell(room.id, col.dateStr);
                            }}
                            onClick={() => handleCellClick(room, col.dateStr)}
                            className={`border-r border-[#dcd4e3] dark:border-[#3d3549] last:border-r-0 h-full transition relative ${
                              leaseInCell
                                ? "bg-[#eeeeee]/70 cursor-not-allowed"
                                : isPast
                                ? "bg-[#f4f1f7]/65 dark:bg-[#1e1a24] cursor-not-allowed hover:bg-[#ece7f2]/60"
                                : isHovered
                                ? "bg-[#f5eef9] cursor-pointer"
                                : col.dateStr === todayStr
                                ? "bg-[#f5eef9]/35 hover:bg-[#f5eef9] cursor-pointer"
                                : "hover:bg-[#fafafa] cursor-pointer"
                            }`}
                            title={
                              leaseInCell
                                ? `ติดสัญญารายเดือน: ${leaseInCell.tenantName}`
                                : isPast
                                ? `วันที่ ${formatThaiDate(col.dateStr)} (วันในอดีต - ไม่สามารถจองย้อนหลังได้)`
                                : `คลิกเพื่อจองห้อง ${room.number} วันที่ ${formatThaiDate(
                                    col.dateStr
                                  )}`
                            }
                          />
                        );
                      })}

                      {/* แถบสัญญารายเดือน (Monthly Lease Block) */}
                      {roomLeases.map((lease) => {
                        const leaseEndEx = addDays(lease.endDate, 1);
                        const visStart =
                          lease.startDate < startDate ? startDate : lease.startDate;
                        const visEnd =
                          leaseEndEx > windowEndExclusive
                            ? windowEndExclusive
                            : leaseEndEx;
                        const offsetDays = calculateNights(startDate, visStart);
                        const spanDays = Math.max(
                          1,
                          calculateNights(visStart, visEnd)
                        );

                        return (
                          <div
                            key={lease.id}
                            style={{
                              left: `${(offsetDays / DAYS_TO_SHOW) * 100}%`,
                              width: `${(spanDays / DAYS_TO_SHOW) * 100}%`,
                            }}
                            className="absolute top-2.5 bottom-2.5 z-10 px-1 pointer-events-none"
                          >
                            <div className="w-full h-full rounded-lg bg-[#222222] text-white px-2.5 flex items-center justify-between gap-2 shadow-sm border border-black/20">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Lock className="w-3.5 h-3.5 text-[#ffaefe] shrink-0" />
                                <span className="text-xs font-semibold truncate">
                                  รายเดือน: {lease.tenantName}
                                </span>
                              </div>
                              <span className="text-[10px] text-white/75 shrink-0 hidden sm:inline">
                                ถึง {formatThaiDate(lease.endDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* แถบการจองรายวัน (Daily Booking Bar - ลากย้าย & ลากขยายวันได้) */}
                      {roomBookings.map((booking) => {
                        const visStart =
                          booking.checkInDate < startDate
                            ? startDate
                            : booking.checkInDate;
                        const visEnd =
                          booking.checkOutDate > windowEndExclusive
                            ? windowEndExclusive
                            : booking.checkOutDate;
                        const offsetDays = calculateNights(startDate, visStart);
                        const spanDays = Math.max(
                          1,
                          calculateNights(visStart, visEnd)
                        );
                        const isCheckedIn = booking.status === "CHECKED_IN";

                        return (
                          <div
                            key={booking.id}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              setDragBooking({ booking, mode: "MOVE" });
                            }}
                            onDragEnd={() => {
                              setDragBooking(null);
                              setHoverCell(null);
                            }}
                            style={{
                              left: `${(offsetDays / DAYS_TO_SHOW) * 100}%`,
                              width: `${(spanDays / DAYS_TO_SHOW) * 100}%`,
                            }}
                            className="absolute top-2 bottom-2 z-10 px-0.5 select-none"
                          >
                            <div
                              className={`w-full h-full rounded-lg px-2.5 flex items-center justify-between gap-1 text-white shadow-sm cursor-grab active:cursor-grabbing transition ${
                                isCheckedIn
                                  ? "bg-[#5c2484] hover:bg-[#421861]"
                                  : "bg-[#2d62ff] hover:bg-[#1e4bd8]"
                              }`}
                            >
                              <Link
                                href={`/bookings?id=${booking.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="min-w-0 flex-1 truncate"
                                title={`${booking.guestName} (${booking.nights} คืน: เข้า 14:00 ${formatThaiDate(
                                  booking.checkInDate
                                )} - ออก 12:00 ${formatThaiDate(
                                  booking.checkOutDate
                                )})`}
                              >
                                <p className="text-xs font-semibold truncate">
                                  {booking.guestName}
                                </p>
                                <p className="text-[10px] text-white/85 truncate">
                                  {booking.nights} คืน ·{" "}
                                  {isCheckedIn ? "พักอยู่" : "จองแล้ว"}
                                </p>
                              </Link>

                              {/* ขอบขวาสำหรับลากยืด/หดจำนวนคืน */}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  setDragBooking({
                                    booking,
                                    mode: "RESIZE_END",
                                  });
                                }}
                                title="ลากขอบขวาเพื่อเพิ่มหรือลดจำนวนคืน"
                                className="w-2.5 h-7 rounded bg-white/25 hover:bg-white/50 cursor-ew-resize shrink-0 flex items-center justify-center"
                              >
                                <span className="w-0.5 h-3.5 bg-white rounded-full" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modal จองรายวันด่วนเมื่อคลิกช่องว่างบนปฏิทิน */}
      {quickModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setQuickModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#eeeeee] max-w-md w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#222222]">
                  จองรายวัน ห้อง {quickModal.room.number} ({quickModal.room.name})
                </h3>
                <p className="text-xs text-[#666666]">
                  เข้าพัก 14:00 น. · เช็คเอาท์ก่อน 12:00 น. · ราคา{" "}
                  {formatCurrency(quickModal.room.dailyRate)}/คืน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickModal(null)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickBookingSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    วันเช็คอิน (14:00) *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={quickModal.checkInDate}
                    onChange={(e) => {
                      const newIn = e.target.value;
                      const validIn = newIn < todayStr ? todayStr : newIn;
                      const validOut =
                        quickModal.checkOutDate <= validIn
                          ? addDays(validIn, 1)
                          : quickModal.checkOutDate;
                      const n = calculateNights(validIn, validOut);
                      setQuickModal({
                        ...quickModal,
                        checkInDate: validIn,
                        checkOutDate: validOut,
                        paidAmount: String(Math.max(1, n) * quickModal.room.dailyRate),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                  />
                  <span className="text-[10px] text-[#777777] mt-0.5 block">
                    (ขั้นต่ำ: วันนี้ {formatThaiDate(todayStr)})
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    วันเช็คเอาท์ (ก่อน 12:00) *
                  </label>
                  <input
                    type="date"
                    required
                    min={addDays(quickModal.checkInDate || todayStr, 1)}
                    value={quickModal.checkOutDate}
                    onChange={(e) => {
                      const newOut = e.target.value;
                      const n = calculateNights(quickModal.checkInDate, newOut);
                      setQuickModal({
                        ...quickModal,
                        checkOutDate: newOut,
                        paidAmount: String(Math.max(1, n) * quickModal.room.dailyRate),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  ชื่อผู้เข้าพัก *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมชาย ใจดี"
                  value={quickModal.guestName}
                  onChange={(e) =>
                    setQuickModal({ ...quickModal, guestName: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    เบอร์โทรศัพท์ (9-10 หลัก)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="เช่น 0812345678"
                    value={quickModal.guestPhone}
                    onChange={(e) =>
                      setQuickModal({ ...quickModal, guestPhone: cleanPhoneNumber(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    สถานะเริ่มต้น
                  </label>
                  <select
                    value={quickModal.status}
                    onChange={(e) =>
                      setQuickModal({ ...quickModal, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs bg-white"
                  >
                    <option value="CONFIRMED">จองล่วงหน้า (รอเช็คอิน)</option>
                    <option value="CHECKED_IN">เช็คอินเข้าพักทันที</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    เงินมัดจำ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quickModal.deposit}
                    onChange={(e) =>
                      setQuickModal({ ...quickModal, deposit: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    ยอดรับชำระแล้ว (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={quickModal.paidAmount}
                    onChange={(e) =>
                      setQuickModal({ ...quickModal, paidAmount: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#f5eef9] text-xs flex items-center justify-between">
                <span className="text-[#5c2484] font-medium">
                  รวม{" "}
                  {calculateNights(
                    quickModal.checkInDate,
                    quickModal.checkOutDate
                  )}{" "}
                  คืน
                </span>
                <span className="font-bold text-sm text-[#5c2484]">
                  {formatCurrency(
                    calculateNights(
                      quickModal.checkInDate,
                      quickModal.checkOutDate
                    ) * quickModal.room.dailyRate
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickModal(null)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] text-xs font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
