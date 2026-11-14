"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  BedDouble,
  Receipt,
  Upload,
  Download,
  Trash2,
  X,
  CreditCard,
  ShieldAlert,
  History,
  MessageSquare,
} from "lucide-react";
import {
  formatCurrency,
  formatThaiDate,
  BOOKING_STATUS_MAP,
  LEASE_STATUS_MAP,
  cleanIdCard,
  cleanPhoneNumber,
} from "@/lib/utils";

interface GuestItem {
  id: string;
  fullName: string;
  phone: string;
  idCardNumber: string;
  email: string;
  lineId: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  idCardDocUrl: string;
  notes: string;
  isSample: boolean;
  createdAt: string;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    paidAmount: number;
    status: string;
    room: { number: string; name: string };
  }>;
  leases: Array<{
    id: string;
    leaseNumber: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    status: string;
    room: { number: string; name: string };
    invoices: Array<{
      id: string;
      billingMonth: string;
      totalAmount: number;
      paidAmount: number;
      status: string;
    }>;
  }>;
}

function GuestsContent() {
  const [guests, setGuests] = useState<GuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "TENANTS" | "DAILY">("ALL");

  // Modal เพิ่ม/แก้ไข
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    idCardNumber: "",
    email: "",
    lineId: "",
    address: "",
    emergencyName: "",
    emergencyPhone: "",
    idCardDocUrl: "",
    notes: "",
  });

  // Modal ดูประวัติอย่างละเอียด (History Drawer/Modal)
  const [selectedGuest, setSelectedGuest] = useState<GuestItem | null>(null);

  const loadGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/guests", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setGuests(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  function openCreateModal() {
    setEditingGuest(null);
    setForm({
      fullName: "",
      phone: "",
      idCardNumber: "",
      email: "",
      lineId: "",
      address: "",
      emergencyName: "",
      emergencyPhone: "",
      idCardDocUrl: "",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEditModal(g: GuestItem) {
    setEditingGuest(g);
    setForm({
      fullName: g.fullName,
      phone: g.phone || "",
      idCardNumber: g.idCardNumber || "",
      email: g.email || "",
      lineId: g.lineId || "",
      address: g.address || "",
      emergencyName: g.emergencyName || "",
      emergencyPhone: g.emergencyPhone || "",
      idCardDocUrl: g.idCardDocUrl || "",
      notes: g.notes || "",
    });
    setModalOpen(true);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, idCardDocUrl: data.url }));
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveGuest(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingGuest ? `/api/guests/${editingGuest.id}` : "/api/guests";
      const method = editingGuest ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        await loadGuests();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGuest(g: GuestItem) {
    if (
      !window.confirm(
        `ต้องการลบข้อมูลคุณ "${g.fullName}" ออกจากทะเบียนหรือไม่?`
      )
    ) {
      return;
    }
    await fetch(`/api/guests/${g.id}`, { method: "DELETE" });
    await loadGuests();
  }

  const filteredGuests = guests.filter((g) => {
    if (filterType === "TENANTS" && (g.leases || []).length === 0) return false;
    if (filterType === "DAILY" && (g.bookings || []).length === 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        g.fullName.toLowerCase().includes(q) ||
        g.phone.toLowerCase().includes(q) ||
        g.idCardNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#222222]">
            ทะเบียนผู้เช่า & ผู้เข้าพัก ({guests.length} ราย)
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            บันทึกข้อมูลติดต่อ สำเนาบัตรประชาชน/เอกสาร และประวัติการเข้าพักรายวันและสัญญารายเดือน
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มข้อมูลผู้พัก/ผู้เช่า</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-[#eeeeee] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เบอร์โทรศัพท์ หรือเลขบัตรประชาชน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#dddddd] text-xs focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "ทั้งหมด" },
            { key: "TENANTS", label: "ผู้เช่ารายเดือน" },
            { key: "DAILY", label: "ผู้พักรายวัน" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterType(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === tab.key
                  ? "bg-[#5c2484] text-white"
                  : "bg-[#fafafa] text-[#555555] hover:bg-[#f5eef9]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* รายการผู้เข้าพัก/ผู้เช่า */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดทะเบียนผู้เข้าพัก...
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-12 text-center text-xs text-[#777777]">
          ไม่พบรายชื่อตามเงื่อนไขที่ค้นหา
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGuests.map((g) => {
            const hasActiveLease = (g.leases || []).some(
              (l) => l.status === "ACTIVE"
            );
            const totalBookings = (g.bookings || []).length;
            const totalLeases = (g.leases || []).length;

            return (
              <div
                key={g.id}
                className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 border-b border-[#eeeeee] pb-3">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#222222]">
                        {g.fullName}
                      </h3>
                      <p className="text-xs text-[#666666] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-[#5c2484]" />
                        <span>{g.phone || "-"}</span>
                      </p>
                    </div>

                    {hasActiveLease ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#cef5ca] text-[#114e0b] font-semibold text-[11px]">
                        ผู้เช่าปัจจุบัน
                      </span>
                    ) : totalLeases > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#eeeeee] text-[#555555] font-semibold text-[11px]">
                        เคยเช่ารายเดือน
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#d9e5ff] text-[#080331] font-semibold text-[11px]">
                        ผู้พักรายวัน
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-[#555555]">
                    {g.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-[#555555]">
                        <Phone className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                        <span>{g.phone}</span>
                      </p>
                    )}
                    {g.lineId && (
                      <p className="flex items-center gap-1.5 text-xs">
                        <MessageSquare className="w-3.5 h-3.5 text-[#06c755] shrink-0" />
                        <a
                          href={
                            g.lineId.startsWith("http")
                              ? g.lineId
                              : `https://line.me/ti/p/~${g.lineId.replace(/^@/, "")}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#06c755] hover:underline"
                        >
                          LINE: {g.lineId}
                        </a>
                      </p>
                    )}
                    {g.idCardNumber && (
                      <p className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                        <span className="font-mono">{g.idCardNumber}</span>
                      </p>
                    )}
                    {g.address && (
                      <p className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#888888] shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{g.address}</span>
                      </p>
                    )}
                    {g.emergencyName && (
                      <p className="text-[11px] text-[#777777]">
                        ติดต่อฉุกเฉิน: {g.emergencyName} ({g.emergencyPhone || "-"})
                      </p>
                    )}

                    {/* สรุปสถิติการเข้าพัก */}
                    <div className="pt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-lg bg-[#fafafa] border border-[#eeeeee]">
                        <span className="text-[#777777]">ประวัติรายวัน:</span>
                        <p className="font-bold text-[#222222]">
                          {totalBookings} รายการ
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-[#fafafa] border border-[#eeeeee]">
                        <span className="text-[#777777]">ประวัติรายเดือน:</span>
                        <p className="font-bold text-[#5c2484]">
                          {totalLeases} สัญญา
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#eeeeee] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGuest(g)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5eef9] hover:bg-[#eadcf3] text-[#5c2484] text-xs font-semibold transition"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>ดูประวัติทั้งหมด</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {g.idCardDocUrl && (
                      <a
                        href={g.idCardDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-[#dddddd] text-[#5c2484] hover:bg-[#fafafa]"
                        title="ดูสำเนาเอกสาร/บัตรประชาชน"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(g)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#dddddd] text-xs font-medium text-[#444444] hover:bg-[#fafafa]"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGuest(g)}
                      className="p-1.5 rounded-lg border border-[#dddddd] text-[#ac2d2d] hover:bg-[#f8e4e4]"
                      title="ลบข้อมูล"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal ดูประวัติการเข้าพักทั้งหมด (Guest History Drawer) */}
      {selectedGuest && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedGuest(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#eeeeee] pb-4">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#222222]">
                  ประวัติการเข้าพัก - คุณ{selectedGuest.fullName}
                </h3>
                <p className="text-xs text-[#666666] mt-0.5">
                  โทร: {selectedGuest.phone || "-"} · บัตรประชาชน:{" "}
                  {selectedGuest.idCardNumber || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="p-1.5 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ประวัติสัญญารายเดือน */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#5c2484] flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>ประวัติสัญญารายเดือน</span>
              </h4>

              {(selectedGuest.leases || []).length === 0 ? (
                <p className="text-xs text-[#888888] bg-[#fafafa] p-3 rounded-xl border border-[#eeeeee]">
                  ไม่มีประวัติสัญญารายเดือน
                </p>
              ) : (
                <div className="divide-y divide-[#eeeeee] border border-[#eeeeee] rounded-xl overflow-hidden text-xs">
                  {selectedGuest.leases.map((l) => {
                    const st =
                      LEASE_STATUS_MAP[l.status] || LEASE_STATUS_MAP.ACTIVE;
                    return (
                      <div
                        key={l.id}
                        className="p-3.5 bg-white flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-[#222222]">
                            ห้อง {l.room.number} ({l.room.name}) · ค่าเช่า{" "}
                            {formatCurrency(l.monthlyRent)}/เดือน
                          </p>
                          <p className="text-[#666666] text-[11px] mt-0.5">
                            {formatThaiDate(l.startDate)} ถึง{" "}
                            {formatThaiDate(l.endDate)} · สัญญา {l.leaseNumber}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ประวัติการจองรายวัน */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#2d62ff] flex items-center gap-1.5">
                <BedDouble className="w-4 h-4" />
                <span>ประวัติการจองห้องพักรายวัน</span>
              </h4>

              {(selectedGuest.bookings || []).length === 0 ? (
                <p className="text-xs text-[#888888] bg-[#fafafa] p-3 rounded-xl border border-[#eeeeee]">
                  ไม่มีประวัติการจองรายวัน
                </p>
              ) : (
                <div className="divide-y divide-[#eeeeee] border border-[#eeeeee] rounded-xl overflow-hidden text-xs">
                  {selectedGuest.bookings.map((b) => {
                    const st =
                      BOOKING_STATUS_MAP[b.status] || BOOKING_STATUS_MAP.CONFIRMED;
                    return (
                      <div
                        key={b.id}
                        className="p-3.5 bg-white flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-[#222222]">
                            ห้อง {b.room.number} ({b.room.name}) · พัก {b.nights} คืน
                          </p>
                          <p className="text-[#666666] text-[11px] mt-0.5">
                            {formatThaiDate(b.checkInDate)} ถึง{" "}
                            {formatThaiDate(b.checkOutDate)} · ยอดชำระ{" "}
                            {formatCurrency(b.paidAmount)}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="px-5 py-2 rounded-xl bg-[#222222] text-white text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal เพิ่ม/แก้ไขข้อมูลผู้พัก */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#eeeeee] max-w-lg w-full p-6 shadow-xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#222222]">
                {editingGuest ? "แก้ไขข้อมูลผู้พัก/ผู้เช่า" : "เพิ่มข้อมูลผู้พักใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuest} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  ชื่อ-นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณณัฐพล วงศ์สวัสดิ์"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    เบอร์โทรศัพท์ (9-10 หลัก)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="เช่น 0812345678"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: cleanPhoneNumber(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono"
                  />
                  {form.phone.length > 0 && form.phone.length < 9 && (
                    <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                      ⚠️ ต้องมี 9-10 หลัก (ปัจจุบัน {form.phone.length})
                    </span>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    เลขบัตรประชาชน (13 หลัก)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="เฉพาะตัวเลข 13 หลัก"
                    value={form.idCardNumber}
                    onChange={(e) =>
                      setForm({ ...form, idCardNumber: cleanIdCard(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono"
                  />
                  {form.idCardNumber.length > 0 && form.idCardNumber.length < 13 && (
                    <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                      ⚠️ ต้องครบ 13 หลัก (ปัจจุบัน {form.idCardNumber.length}/13)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    LINE ID หรือ ลิงก์ LINE
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น somchai_line หรือ https://line.me/ti/p/..."
                    value={form.lineId}
                    onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-sans"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    อีเมล (ถ้ามี)
                  </label>
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  ที่อยู่ตามทะเบียนบ้าน / ภูมิลำเนา
                </label>
                <input
                  type="text"
                  placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    ชื่อผู้ติดต่อฉุกเฉิน
                  </label>
                  <input
                    type="text"
                    placeholder="ชื่อญาติหรือผู้ติดต่อ..."
                    value={form.emergencyName}
                    onChange={(e) =>
                      setForm({ ...form, emergencyName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    เบอร์โทรผู้ติดต่อฉุกเฉิน (9-10 หลัก)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="เช่น 0891112233"
                    value={form.emergencyPhone}
                    onChange={(e) =>
                      setForm({ ...form, emergencyPhone: cleanPhoneNumber(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono"
                  />
                  {form.emergencyPhone.length > 0 && form.emergencyPhone.length < 9 && (
                    <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                      ⚠️ ต้องมี 9-10 หลัก (ปัจจุบัน {form.emergencyPhone.length})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1 flex items-center justify-between">
                  <span>แนบภาพบัตรประชาชน / เอกสาร (PDF หรือรูปภาพ)</span>
                  {uploading && (
                    <span className="text-[#5c2484] font-semibold">
                      กำลังอัปโหลด...
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="URL เอกสาร..."
                    value={form.idCardDocUrl}
                    onChange={(e) =>
                      setForm({ ...form, idCardDocUrl: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dddddd] bg-[#fafafa] hover:bg-[#f5eef9] hover:text-[#5c2484] cursor-pointer shrink-0 font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    <span>เลือกไฟล์</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดทะเบียนผู้พัก...
        </div>
      }
    >
      <GuestsContent />
    </Suspense>
  );
}
