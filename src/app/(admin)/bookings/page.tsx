"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  LogIn,
  LogOut,
  Receipt,
  Trash2,
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  formatCurrency,
  formatThaiDate,
  formatThaiDateFull,
  calculateNights,
  toDateString,
  addDays,
  BOOKING_STATUS_MAP,
  cleanIdCard,
  cleanPhoneNumber,
} from "@/lib/utils";

interface BookingCharge {
  id: string;
  description: string;
  amount: number;
}

interface BookingItem {
  id: string;
  bookingNumber: string;
  roomId: string;
  room: { id: string; number: string; name: string; floor: number; dailyRate: number };
  guestName: string;
  guestPhone: string;
  guestIdCard: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  dailyRate: number;
  deposit: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string;
  status: string;
  notes: string;
  charges: BookingCharge[];
}

interface RoomOption {
  id: string;
  number: string;
  name: string;
  dailyRate: number;
  status: string;
}

interface SettingInfo {
  propertyName: string;
  propertyAddress: string;
  propertyPhone: string;
  checkInTime: string;
  checkOutTime: string;
}

function BookingsContent() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [setting, setSetting] = useState<SettingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modal สร้าง/แก้ไขการจอง
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const todayStr = toDateString(new Date());

  const [form, setForm] = useState({
    roomId: "",
    guestName: "",
    guestPhone: "",
    guestIdCard: "",
    checkInDate: todayStr,
    checkOutDate: addDays(todayStr, 1),
    dailyRate: "850",
    deposit: "0",
    discount: "0",
    paidAmount: "850",
    paymentMethod: "CASH",
    status: "CONFIRMED",
    notes: "",
  });

  // Modal จัดการรายละเอียด + ค่าใช้จ่ายเพิ่ม + ใบเสร็จ
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(
    null
  );
  const [newChargeDesc, setNewChargeDesc] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
        setRooms(data.rooms || []);
        setSetting(data.settings || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // รองรับลิงก์ ?new=1 หรือ ?id=... จากหน้าอื่น
  useEffect(() => {
    if (!loading && rooms.length > 0) {
      if (searchParams.get("new") === "1") {
        openCreateModal();
      }
      const targetId = searchParams.get("id");
      if (targetId) {
        const found = bookings.find((b) => b.id === targetId);
        if (found) setSelectedBooking(found);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  function openCreateModal() {
    const firstRoom = rooms[0];
    setEditingId(null);
    setFormError("");
    setForm({
      roomId: firstRoom?.id || "",
      guestName: "",
      guestPhone: "",
      guestIdCard: "",
      checkInDate: todayStr,
      checkOutDate: addDays(todayStr, 1),
      dailyRate: String(firstRoom?.dailyRate || 850),
      deposit: "500",
      discount: "0",
      paidAmount: String(firstRoom?.dailyRate || 850),
      paymentMethod: "PROMPTPAY",
      status: "CONFIRMED",
      notes: "",
    });
    setFormOpen(true);
  }

  function openEditModal(b: BookingItem) {
    setEditingId(b.id);
    setFormError("");
    setForm({
      roomId: b.roomId,
      guestName: b.guestName,
      guestPhone: b.guestPhone || "",
      guestIdCard: b.guestIdCard || "",
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      dailyRate: String(b.dailyRate),
      deposit: String(b.deposit),
      discount: String(b.discount || 0),
      paidAmount: String(b.paidAmount),
      paymentMethod: b.paymentMethod || "CASH",
      status: b.status,
      notes: b.notes || "",
    });
    setFormOpen(true);
  }

  async function handleSaveBooking(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    if (!editingId && form.checkInDate < todayStr) {
      setFormError("ไม่สามารถจองย้อนหลังได้ (วันเช็คอินต้องเป็นวันนี้หรือวันข้างหน้า)");
      setSaving(false);
      return;
    }

    if (form.checkOutDate <= form.checkInDate) {
      setFormError("วันเช็คเอาท์ต้องอยู่หลังวันเช็คอินอย่างน้อย 1 คืน");
      setSaving(false);
      return;
    }
    if (form.guestIdCard && form.guestIdCard.length !== 13) {
      setFormError("เลขบัตรประชาชนต้องมีครบ 13 หลักพอดี (ปัจจุบันมี " + form.guestIdCard.length + " หลัก)");
      setSaving(false);
      return;
    }
    if (form.guestPhone && form.guestPhone.length < 9) {
      setFormError("เบอร์โทรศัพท์ต้องมี 9-10 หลัก (ปัจจุบันมี " + form.guestPhone.length + " หลัก)");
      setSaving(false);
      return;
    }

    try {
      const url = editingId ? `/api/bookings/${editingId}` : "/api/bookings";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: form.roomId,
          guestName: form.guestName,
          guestPhone: form.guestPhone,
          guestIdCard: form.guestIdCard,
          checkInDate: form.checkInDate,
          checkOutDate: form.checkOutDate,
          dailyRate: Number(form.dailyRate),
          deposit: Number(form.deposit),
          discount: Number(form.discount),
          paidAmount: Number(form.paidAmount),
          paymentMethod: form.paymentMethod,
          status: form.status,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "ไม่สามารถบันทึกการจองได้");
        setSaving(false);
        return;
      }
      setFormOpen(false);
      await loadBookings();
      if (selectedBooking && selectedBooking.id === data.id) {
        setSelectedBooking(data);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusAction(
    booking: BookingItem,
    action: "CHECK_IN" | "CHECK_OUT" | "CANCEL"
  ) {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(updated);
      }
    }
  }

  async function handleAddCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking || !newChargeDesc || !newChargeAmount) return;
    const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ADD_CHARGE",
        description: newChargeDesc,
        amount: Number(newChargeAmount),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedBooking(updated);
      setNewChargeDesc("");
      setNewChargeAmount("");
      await loadBookings();
    }
  }

  async function handleRemoveCharge(chargeId: string) {
    if (!selectedBooking) return;
    const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "REMOVE_CHARGE",
        chargeId,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedBooking(updated);
      await loadBookings();
    }
  }

  function computeBookingTotals(b: BookingItem) {
    const roomTotal = b.nights * b.dailyRate;
    const chargesTotal = (b.charges || []).reduce((s, c) => s + c.amount, 0);
    const grandTotal = Math.max(0, roomTotal + chargesTotal - (b.discount || 0));
    const remaining = Math.max(0, grandTotal - (b.paidAmount || 0));
    return { roomTotal, chargesTotal, grandTotal, remaining };
  }

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        b.guestName.toLowerCase().includes(q) ||
        b.room.number.toLowerCase().includes(q) ||
        b.bookingNumber.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const checkInTime = setting?.checkInTime || "14:00";
  const checkOutTime = setting?.checkOutTime || "12:00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#222222]">
            การจองรายวัน (Daily Reservations)
          </h1>
          <p className="text-xs text-[#666666] mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#5c2484]" />
            <span>
              กฎการเข้าพักรายวัน: เช็คอินได้ตั้งแต่ {checkInTime} น. ของวันเข้าพัก
              และเช็คเอาท์ก่อน {checkOutTime} น. ของวันออก
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างการจองรายวัน</span>
        </button>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white rounded-xl border border-[#eeeeee] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า, เลขห้อง, เบอร์โทร หรือรหัสจอง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#dddddd] text-xs focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "ทั้งหมด" },
            { key: "CONFIRMED", label: "รอเช็คอิน" },
            { key: "CHECKED_IN", label: "กำลังพัก" },
            { key: "CHECKED_OUT", label: "เช็คเอาท์แล้ว" },
            { key: "CANCELLED", label: "ยกเลิก" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab.key
                  ? "bg-[#5c2484] text-white"
                  : "bg-[#fafafa] text-[#555555] hover:bg-[#f5eef9]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ตารางรายการจองรายวัน */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eeeeee] bg-[#fafafa] text-[11px] font-semibold uppercase text-[#666666]">
                <th className="py-3.5 px-4">ห้องพัก</th>
                <th className="py-3.5 px-4">ผู้เข้าพัก</th>
                <th className="py-3.5 px-4">เช็คอิน ({checkInTime})</th>
                <th className="py-3.5 px-4">เช็คเอาท์ (ก่อน {checkOutTime})</th>
                <th className="py-3.5 px-4">ยอดรวม / มัดจำ</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    กำลังโหลดข้อมูลการจอง...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    ไม่พบรายการจองรายวันตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const st =
                    BOOKING_STATUS_MAP[b.status] || BOOKING_STATUS_MAP.CONFIRMED;
                  const totals = computeBookingTotals(b);

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-[#fafafa] transition cursor-pointer"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[#f5eef9] text-[#5c2484] font-bold">
                          ห้อง {b.room.number}
                        </span>
                        <p className="text-[11px] text-[#777777] mt-1">
                          {b.bookingNumber}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-sm text-[#222222]">
                          {b.guestName}
                        </p>
                        <p className="text-[#666666]">{b.guestPhone || "-"}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#222222]">
                        {formatThaiDate(b.checkInDate)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#222222]">
                        {formatThaiDate(b.checkOutDate)}{" "}
                        <span className="text-[#666666]">({b.nights} คืน)</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-sm text-[#222222]">
                          {formatCurrency(totals.grandTotal)}
                        </p>
                        <p className="text-[11px] text-[#666666]">
                          ชำระแล้ว {formatCurrency(b.paidAmount)} · มัดจำ{" "}
                          {formatCurrency(b.deposit)}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right space-x-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {b.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(b, "CHECK_IN")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#5c2484] hover:bg-[#421861] text-white font-semibold"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>เช็คอิน</span>
                          </button>
                        )}
                        {b.status === "CHECKED_IN" && (
                          <button
                            type="button"
                            onClick={() => handleStatusAction(b, "CHECK_OUT")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222222] hover:bg-black text-white font-semibold"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>เช็คเอาท์</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(b);
                            setShowReceiptModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f5eef9] text-[#5c2484] font-medium"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>ใบเสร็จ</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* แผงรายละเอียดการจอง + ค่าใช้จ่ายเพิ่ม + ปุ่มใบเสร็จ */}
      {selectedBooking && !showReceiptModal && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#eeeeee] max-w-2xl w-full p-6 shadow-xl space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#eeeeee] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-[#5c2484] text-white text-xs font-bold">
                    ห้อง {selectedBooking.room.number}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#222222]">
                    {selectedBooking.guestName}
                  </h3>
                </div>
                <p className="text-xs text-[#666666] mt-1">
                  เลขที่การจอง {selectedBooking.bookingNumber} · โทร{" "}
                  {selectedBooking.guestPhone || "-"} · บัตรประชาชน{" "}
                  {selectedBooking.guestIdCard || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const totals = computeBookingTotals(selectedBooking);
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#fafafa] p-4 rounded-xl border border-[#eeeeee] text-xs">
                    <div>
                      <p className="text-[#666666]">วันเช็คอิน ({checkInTime})</p>
                      <p className="font-bold text-sm text-[#222222]">
                        {formatThaiDate(selectedBooking.checkInDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#666666]">
                        วันเช็คเอาท์ (ก่อน {checkOutTime})
                      </p>
                      <p className="font-bold text-sm text-[#222222]">
                        {formatThaiDate(selectedBooking.checkOutDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#666666]">ค่าห้อง ({selectedBooking.nights} คืน)</p>
                      <p className="font-bold text-sm text-[#5c2484]">
                        {formatCurrency(totals.roomTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#666666]">เงินมัดจำรับไว้</p>
                      <p className="font-bold text-sm text-[#222222]">
                        {formatCurrency(selectedBooking.deposit)}
                      </p>
                    </div>
                  </div>

                  {/* รายการค่าใช้จ่ายเพิ่มเติม (Extra Charges) */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-[#222222]">
                      ค่าใช้จ่ายเพิ่มเติมระหว่างเข้าพัก (มินิบาร์ / เตียงเสริม / เช็คเอาท์เกินเวลา)
                    </h4>

                    <div className="divide-y divide-[#eeeeee] border border-[#eeeeee] rounded-xl overflow-hidden text-xs">
                      {(selectedBooking.charges || []).length === 0 ? (
                        <div className="p-3.5 text-center text-[#777777]">
                          ยังไม่มีค่าใช้จ่ายเพิ่มเติม
                        </div>
                      ) : (
                        selectedBooking.charges.map((ch) => (
                          <div
                            key={ch.id}
                            className="px-4 py-2.5 flex items-center justify-between bg-white"
                          >
                            <span className="font-medium text-[#222222]">
                              {ch.description}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-[#222222]">
                                {formatCurrency(ch.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCharge(ch.id)}
                                className="text-[#ac2d2d] hover:underline"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleAddCharge} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ระบุรายการ เช่น น้ำดื่ม, เตียงเสริม, ออกเกิน 12:00..."
                        value={newChargeDesc}
                        onChange={(e) => setNewChargeDesc(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                      />
                      <input
                        type="number"
                        placeholder="จำนวนเงิน (บาท)"
                        value={newChargeAmount}
                        onChange={(e) => setNewChargeAmount(e.target.value)}
                        className="w-32 px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#f5eef9] text-[#5c2484] hover:bg-[#eadcf3] text-xs font-semibold shrink-0"
                      >
                        + เพิ่มรายการ
                      </button>
                    </form>
                  </div>

                  {/* สรุปยอดสุทธิ */}
                  <div className="p-4 rounded-xl bg-[#f5eef9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs space-y-0.5">
                      <p className="text-[#5c2484]">
                        ยอดรวมสุทธิ:{" "}
                        <strong className="text-base">
                          {formatCurrency(totals.grandTotal)}
                        </strong>{" "}
                        (ชำระแล้ว {formatCurrency(selectedBooking.paidAmount)})
                      </p>
                      <p className="text-[#666666]">
                        {totals.remaining > 0
                          ? `ค้างชำระอีก ${formatCurrency(totals.remaining)}`
                          : "ชำระครบถ้วนแล้ว"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedBooking.status === "CONFIRMED" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusAction(selectedBooking, "CHECK_IN")
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#5c2484] text-white text-xs font-semibold"
                        >
                          เช็คอินเข้าพัก
                        </button>
                      )}
                      {selectedBooking.status === "CHECKED_IN" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusAction(selectedBooking, "CHECK_OUT")
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#222222] text-white text-xs font-semibold"
                        >
                          เช็คเอาท์ออก
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          openEditModal(selectedBooking);
                          setSelectedBooking(null);
                        }}
                        className="px-3.5 py-2 rounded-xl border border-[#5c2484] text-[#5c2484] bg-white text-xs font-semibold"
                      >
                        แก้ไขข้อมูล/การชำระเงิน
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReceiptModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#dddddd] text-[#222222] text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#5c2484]" />
                        <span>พิมพ์ใบเสร็จ / PDF</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal ใบเสร็จรับเงินรายวัน (Print / Save as PDF) */}
      {selectedBooking && showReceiptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowReceiptModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-4 no-print">
              <h3 className="font-serif text-lg font-bold text-[#222222]">
                ตัวอย่างใบเสร็จรับเงิน (พร้อมพิมพ์ / บันทึกเป็น PDF)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>สั่งพิมพ์ / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1.5 rounded-lg text-[#666666] hover:bg-[#fafafa]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* พื้นที่ใบเสร็จสำหรับพิมพ์ */}
            <div
              id="printable-receipt"
              className="border border-[#eeeeee] rounded-xl p-6 space-y-5 bg-white text-[#222222]"
            >
              <div className="flex items-start justify-between border-b border-[#eeeeee] pb-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-[#5c2484]">
                    {setting?.propertyName || "เดอะ เรทฟอร์ด เรสซิเดนซ์"}
                  </h2>
                  <p className="text-xs text-[#666666] mt-0.5">
                    {setting?.propertyAddress}
                  </p>
                  <p className="text-xs text-[#666666]">
                    โทร: {setting?.propertyPhone}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-lg bg-[#f5eef9] text-[#5c2484] font-bold text-xs">
                    ใบเสร็จรับเงิน / RECEIPT
                  </span>
                  <p className="text-xs font-semibold mt-1">
                    เลขที่: {selectedBooking.bookingNumber}
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    วันที่ออก: {formatThaiDateFull(todayStr)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-[#fafafa] p-3.5 rounded-xl border border-[#eeeeee]">
                <div>
                  <p className="text-[#666666]">ชื่อผู้เข้าพัก</p>
                  <p className="font-bold text-sm">{selectedBooking.guestName}</p>
                  <p className="text-[#666666]">
                    โทร: {selectedBooking.guestPhone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[#666666]">ห้องพัก & กำหนดการ</p>
                  <p className="font-bold text-sm">
                    ห้อง {selectedBooking.room.number} ({selectedBooking.room.name})
                  </p>
                  <p className="text-[#666666]">
                    เข้า {formatThaiDate(selectedBooking.checkInDate)} ({checkInTime}
                    ) - ออก {formatThaiDate(selectedBooking.checkOutDate)} (ก่อน{" "}
                    {checkOutTime})
                  </p>
                </div>
              </div>

              {(() => {
                const totals = computeBookingTotals(selectedBooking);
                return (
                  <>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#dddddd] text-[#666666]">
                          <th className="py-2 text-left">รายการ</th>
                          <th className="py-2 text-right">จำนวนเงิน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eeeeee]">
                        <tr>
                          <td className="py-2.5">
                            ค่าห้องพักรายวัน ห้อง {selectedBooking.room.number} (
                            {selectedBooking.nights} คืน x{" "}
                            {formatCurrency(selectedBooking.dailyRate)})
                          </td>
                          <td className="py-2.5 text-right font-medium">
                            {formatCurrency(totals.roomTotal)}
                          </td>
                        </tr>
                        {(selectedBooking.charges || []).map((c) => (
                          <tr key={c.id}>
                            <td className="py-2.5">{c.description}</td>
                            <td className="py-2.5 text-right font-medium">
                              {formatCurrency(c.amount)}
                            </td>
                          </tr>
                        ))}
                        {selectedBooking.discount > 0 && (
                          <tr>
                            <td className="py-2.5 text-[#114e0b]">ส่วนลด</td>
                            <td className="py-2.5 text-right text-[#114e0b]">
                              -{formatCurrency(selectedBooking.discount)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#222222] font-bold text-sm">
                          <td className="pt-3">ยอดรวมสุทธิ</td>
                          <td className="pt-3 text-right text-[#5c2484]">
                            {formatCurrency(totals.grandTotal)}
                          </td>
                        </tr>
                        <tr className="text-xs text-[#666666]">
                          <td className="pt-1">
                            รับชำระแล้ว ({selectedBooking.paymentMethod}) · เงินมัดจำ{" "}
                            {formatCurrency(selectedBooking.deposit)}
                          </td>
                          <td className="pt-1 text-right font-semibold text-[#222222]">
                            {formatCurrency(selectedBooking.paidAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="pt-6 border-t border-[#eeeeee] flex items-center justify-between text-[11px] text-[#777777]">
                      <span>ขอบคุณที่ใช้บริการ {setting?.propertyName}</span>
                      <span>ผู้รับเงิน: เจ้าของที่พัก (Admin)</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal ฟอร์มสร้าง/แก้ไขการจองรายวัน */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#eeeeee] max-w-lg w-full p-6 shadow-xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#222222]">
                {editingId ? "แก้ไขข้อมูลการจองรายวัน" : "สร้างการจองรายวันใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  เลือกห้องพัก *
                </label>
                <select
                  required
                  value={form.roomId}
                  onChange={(e) => {
                    const r = rooms.find((rm) => rm.id === e.target.value);
                    const rate = r ? r.dailyRate : Number(form.dailyRate);
                    const n = Math.max(
                      1,
                      calculateNights(form.checkInDate, form.checkOutDate)
                    );
                    setForm({
                      ...form,
                      roomId: e.target.value,
                      dailyRate: String(rate),
                      paidAmount: String(rate * n),
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#cccccc] bg-white text-sm font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.number} - {r.name} ({formatCurrency(r.dailyRate)}/คืน)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    วันเช็คอิน (เข้า {checkInTime} น.) *
                  </label>
                  <input
                    type="date"
                    required
                    min={editingId ? undefined : todayStr}
                    value={form.checkInDate}
                    onChange={(e) => {
                      const inDate = e.target.value;
                      const validIn = !editingId && inDate < todayStr ? todayStr : inDate;
                      const outDate =
                        form.checkOutDate <= validIn
                          ? addDays(validIn, 1)
                          : form.checkOutDate;
                      const n = Math.max(1, calculateNights(validIn, outDate));
                      setForm({
                        ...form,
                        checkInDate: validIn,
                        checkOutDate: outDate,
                        paidAmount: String(n * Number(form.dailyRate)),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                  {!editingId && (
                    <span className="text-[10px] text-[#777777] mt-0.5 block">
                      (ไม่สามารถจองย้อนหลังได้ ขั้นต่ำ: {formatThaiDate(todayStr)})
                    </span>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    วันเช็คเอาท์ (ออกก่อน {checkOutTime} น.) *
                  </label>
                  <input
                    type="date"
                    required
                    min={addDays(form.checkInDate || todayStr, 1)}
                    value={form.checkOutDate}
                    onChange={(e) => {
                      const outDate = e.target.value;
                      const n = Math.max(
                        1,
                        calculateNights(form.checkInDate, outDate)
                      );
                      setForm({
                        ...form,
                        checkOutDate: outDate,
                        paidAmount: String(n * Number(form.dailyRate)),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-medium text-[#222222] mb-1">
                    ชื่อ-นามสกุลผู้เข้าพัก *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="คุณ..."
                    value={form.guestName}
                    onChange={(e) =>
                      setForm({ ...form, guestName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-medium text-[#222222] mb-1">
                    เบอร์โทรศัพท์ (9-10 หลัก)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="เช่น 0812345678"
                    value={form.guestPhone}
                    onChange={(e) =>
                      setForm({ ...form, guestPhone: cleanPhoneNumber(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono text-sm"
                  />
                  {form.guestPhone.length > 0 && form.guestPhone.length < 9 && (
                    <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                      ⚠️ ต้องมี 9-10 หลัก (ปัจจุบัน {form.guestPhone.length})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  เลขบัตรประชาชน (เฉพาะตัวเลข 13 หลัก)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="เช่น 1100400123456"
                  value={form.guestIdCard}
                  onChange={(e) =>
                    setForm({ ...form, guestIdCard: cleanIdCard(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono"
                />
                {form.guestIdCard.length > 0 && form.guestIdCard.length < 13 && (
                  <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                    ⚠️ ต้องครบ 13 หลัก (ปัจจุบัน {form.guestIdCard.length}/13)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    ราคาต่อคืน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.dailyRate}
                    onChange={(e) =>
                      setForm({ ...form, dailyRate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    เงินมัดจำ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.deposit}
                    onChange={(e) =>
                      setForm({ ...form, deposit: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    รับชำระแล้ว (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.paidAmount}
                    onChange={(e) =>
                      setForm({ ...form, paidAmount: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    ช่องทางชำระเงิน
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({ ...form, paymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] bg-white"
                  >
                    <option value="PROMPTPAY">PromptPay QR / โอนเงิน</option>
                    <option value="CASH">เงินสด</option>
                    <option value="TRANSFER">โอนเข้าบัญชีธนาคาร</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    สถานะการจอง
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] bg-white"
                  >
                    <option value="CONFIRMED">จองแล้ว (รอเช็คอิน)</option>
                    <option value="CHECKED_IN">เช็คอินแล้ว (เข้าพักทันที)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ขอเตียงเสริม, มาถึงดึก..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                />
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-[#f8e4e4] text-[#ac2d2d] text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? "กำลังตรวจสอบคิวห้อง..." : "บันทึกการจอง"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดหน้าการจองรายวัน...
        </div>
      }
    >
      <BookingsContent />
    </Suspense>
  );
}
