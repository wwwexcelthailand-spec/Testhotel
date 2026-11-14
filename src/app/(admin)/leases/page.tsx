"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LogOut,
  Upload,
  Download,
  Trash2,
  X,
  Phone,
  CreditCard,
  Building,
  DollarSign,
  ShieldAlert,
} from "lucide-react";
import {
  formatCurrency,
  formatThaiDate,
  toDateString,
  addDays,
  LEASE_STATUS_MAP,
  calculateDepositRefund,
  cleanIdCard,
  cleanPhoneNumber,
} from "@/lib/utils";

interface LeaseItem {
  id: string;
  leaseNumber: string;
  roomId: string;
  room: { id: string; number: string; name: string; floor: number; monthlyRate: number };
  tenantName: string;
  tenantPhone: string;
  tenantIdCard: string;
  tenantLineId?: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  contractFileUrl: string;
  status: string;
  moveOutDate: string | null;
  damageDeduction: number;
  unpaidDeduction: number;
  depositRefunded: number;
  notes: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    billingMonth: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  }>;
}

interface RoomOption {
  id: string;
  number: string;
  name: string;
  monthlyRate: number;
  status: string;
}

interface SettingInfo {
  propertyName: string;
  leaseWarningDays: number;
  lateFeePerDay: number;
}

function LeasesContent() {
  const searchParams = useSearchParams();
  const [leases, setLeases] = useState<LeaseItem[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [setting, setSetting] = useState<SettingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Create/Edit Modal
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const todayStr = toDateString(new Date());

  const [form, setForm] = useState({
    roomId: "",
    tenantName: "",
    tenantPhone: "",
    tenantIdCard: "",
    tenantLineId: "",
    startDate: todayStr,
    endDate: addDays(todayStr, 365), // สัญญา 1 ปีเริ่มต้น
    monthlyRent: "6500",
    securityDeposit: "13000",
    contractFileUrl: "",
    notes: "",
  });

  // Move-Out Modal (ย้ายออกพร้อมคำนวณเงินประกัน)
  const [moveOutLease, setMoveOutLease] = useState<LeaseItem | null>(null);
  const [moveOutDate, setMoveOutDate] = useState(todayStr);
  const [damageDeduction, setDamageDeduction] = useState("0");
  const [unpaidDeduction, setUnpaidDeduction] = useState("0");
  const [moveOutNotes, setMoveOutNotes] = useState("");

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/leases", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setLeases(data.leases || []);
        setRooms(data.rooms || []);
        setSetting(data.settings || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!loading && rooms.length > 0 && searchParams.get("new") === "1") {
      openCreateModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  function openCreateModal() {
    const firstRoom = rooms[0];
    setEditingId(null);
    setFormError("");
    const defaultRent = firstRoom?.monthlyRate || 6500;
    setForm({
      roomId: firstRoom?.id || "",
      tenantName: "",
      tenantPhone: "",
      tenantIdCard: "",
      tenantLineId: "",
      startDate: todayStr,
      endDate: addDays(todayStr, 365),
      monthlyRent: String(defaultRent),
      securityDeposit: String(defaultRent * 2),
      contractFileUrl: "",
      notes: "",
    });
    setFormOpen(true);
  }

  function openEditModal(lease: LeaseItem) {
    setEditingId(lease.id);
    setFormError("");
    setForm({
      roomId: lease.roomId,
      tenantName: lease.tenantName,
      tenantPhone: lease.tenantPhone || "",
      tenantIdCard: lease.tenantIdCard || "",
      tenantLineId: lease.tenantLineId || "",
      startDate: lease.startDate,
      endDate: lease.endDate,
      monthlyRent: String(lease.monthlyRent),
      securityDeposit: String(lease.securityDeposit),
      contractFileUrl: lease.contractFileUrl || "",
      notes: lease.notes || "",
    });
    setFormOpen(true);
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
        setForm((prev) => ({ ...prev, contractFileUrl: data.url }));
      } else {
        alert(data.error || "อัปโหลดไฟล์ไม่สำเร็จ");
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveLease(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    if (form.endDate <= form.startDate) {
      setFormError("วันสิ้นสุดสัญญาต้องอยู่หลังวันเริ่มต้นสัญญา");
      setSaving(false);
      return;
    }
    if (form.tenantIdCard && form.tenantIdCard.length !== 13) {
      setFormError("เลขบัตรประจำตัวประชาชนต้องมีครบ 13 หลักพอดี (ปัจจุบันมี " + form.tenantIdCard.length + " หลัก)");
      setSaving(false);
      return;
    }
    if (form.tenantPhone && form.tenantPhone.length < 9) {
      setFormError("เบอร์โทรศัพท์ต้องมี 9-10 หลัก (ปัจจุบันมี " + form.tenantPhone.length + " หลัก)");
      setSaving(false);
      return;
    }

    try {
      const url = editingId ? `/api/leases/${editingId}` : "/api/leases";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: form.roomId,
          tenantName: form.tenantName,
          tenantPhone: form.tenantPhone,
          tenantIdCard: form.tenantIdCard,
          tenantLineId: form.tenantLineId,
          startDate: form.startDate,
          endDate: form.endDate,
          monthlyRent: Number(form.monthlyRent),
          securityDeposit: Number(form.securityDeposit),
          contractFileUrl: form.contractFileUrl,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "ไม่สามารถบันทึกสัญญาได้");
        setSaving(false);
        return;
      }
      setFormOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  function openMoveOutModal(lease: LeaseItem) {
    setMoveOutLease(lease);
    setMoveOutDate(todayStr);
    setDamageDeduction("0");

    // คำนวณบิลค้างชำระอัตโนมัติ
    const unpaidTotal = (lease.invoices || [])
      .filter((inv) => inv.status === "UNPAID" || inv.status === "OVERDUE" || inv.status === "PARTIAL")
      .reduce((s, inv) => s + Math.max(0, inv.totalAmount - inv.paidAmount), 0);

    setUnpaidDeduction(String(unpaidTotal));
    setMoveOutNotes(
      unpaidTotal > 0 ? `หักบิลค้างชำระ ${formatCurrency(unpaidTotal)}` : "คืนเงินประกันเต็มจำนวน"
    );
  }

  async function handleConfirmMoveOut(e: React.FormEvent) {
    e.preventDefault();
    if (!moveOutLease) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leases/${moveOutLease.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MOVE_OUT",
          moveOutDate,
          damageDeduction: Number(damageDeduction),
          unpaidDeduction: Number(unpaidDeduction),
          notes: moveOutNotes,
        }),
      });
      if (res.ok) {
        setMoveOutLease(null);
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLease(lease: LeaseItem) {
    if (
      !window.confirm(
        `ต้องการลบสัญญา ${lease.leaseNumber} ของ "${lease.tenantName}" ใช่หรือไม่?`
      )
    ) {
      return;
    }
    await fetch(`/api/leases/${lease.id}`, { method: "DELETE" });
    await loadData();
  }

  const warningLimit = addDays(todayStr, setting?.leaseWarningDays ?? 30);

  const filteredLeases = leases.filter((l) => {
    if (statusFilter === "ACTIVE" && l.status !== "ACTIVE") return false;
    if (statusFilter === "MOVED_OUT" && l.status !== "MOVED_OUT") return false;
    if (statusFilter === "EXPIRING") {
      if (l.status !== "ACTIVE") return false;
      if (l.endDate < todayStr || l.endDate > warningLimit) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.tenantName.toLowerCase().includes(q) ||
        l.room.number.toLowerCase().includes(q) ||
        l.leaseNumber.toLowerCase().includes(q) ||
        l.tenantPhone.toLowerCase().includes(q)
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
            สัญญารายเดือน (Monthly Leases)
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            จัดการสัญญาเช่ารายเดือน เงินประกัน แนบไฟล์สัญญา แจ้งเตือนหมดอายุ และบันทึกการย้ายออก
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>ทำสัญญาใหม่</span>
        </button>
      </div>

      {/* Search & Filter Tabs */}
      <div className="bg-white rounded-xl border border-[#eeeeee] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้เช่า, เลขห้อง, เลขสัญญา, เบอร์โทร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#dddddd] text-xs focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ACTIVE", label: "กำลังเช่าอยู่" },
            { key: "EXPIRING", label: `ใกล้หมดอายุ (ใน ${setting?.leaseWarningDays ?? 30} วัน)` },
            { key: "MOVED_OUT", label: "ย้ายออกแล้ว" },
            { key: "ALL", label: "ทั้งหมด" },
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

      {/* ตารางแสดงสัญญา */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#eeeeee] bg-[#fafafa] text-[11px] font-semibold uppercase text-[#666666]">
                <th className="py-3.5 px-4">ห้องพัก / เลขสัญญา</th>
                <th className="py-3.5 px-4">ผู้เช่า</th>
                <th className="py-3.5 px-4">ระยะเวลาสัญญา</th>
                <th className="py-3.5 px-4">ค่าเช่า / เงินประกัน</th>
                <th className="py-3.5 px-4">เอกสารแนบ</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    กำลังโหลดข้อมูลสัญญารายเดือน...
                  </td>
                </tr>
              ) : filteredLeases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    ไม่พบสัญญารายเดือนตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredLeases.map((l) => {
                  const isExpiring =
                    l.status === "ACTIVE" &&
                    l.endDate >= todayStr &&
                    l.endDate <= warningLimit;
                  const st = LEASE_STATUS_MAP[l.status] || LEASE_STATUS_MAP.ACTIVE;

                  return (
                    <tr key={l.id} className="hover:bg-[#fafafa] transition">
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[#222222] text-white font-bold text-xs">
                          ห้อง {l.room.number}
                        </span>
                        <p className="text-[11px] text-[#777777] mt-1">
                          {l.leaseNumber}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-sm text-[#222222]">
                          {l.tenantName}
                        </p>
                        <p className="text-[#666666] flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {l.tenantPhone || "-"}
                        </p>
                        {l.tenantLineId && (
                          <a
                            href={
                              l.tenantLineId.startsWith("http")
                                ? l.tenantLineId
                                : `https://line.me/ti/p/~${l.tenantLineId.replace(/^@/, "")}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#06c755] hover:underline mt-0.5"
                          >
                            <span>LINE: {l.tenantLineId}</span>
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[#222222]">
                          {formatThaiDate(l.startDate)} - {formatThaiDate(l.endDate)}
                        </p>
                        {isExpiring && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5e5515] bg-[#fcf8d8] px-2 py-0.5 rounded-full mt-1">
                            <Clock className="w-3 h-3" />
                            ใกล้หมดสัญญา
                          </span>
                        )}
                        {l.status === "MOVED_OUT" && l.moveOutDate && (
                          <span className="text-[11px] text-[#777777] block mt-0.5">
                            ย้ายออกเมื่อ {formatThaiDate(l.moveOutDate)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-sm text-[#5c2484]">
                          {formatCurrency(l.monthlyRent)}
                          <span className="text-xs font-normal text-[#666666]">
                            {" "}
                            /ด.
                          </span>
                        </p>
                        <p className="text-[11px] text-[#666666]">
                          ประกัน {formatCurrency(l.securityDeposit)}
                        </p>
                        {l.status === "MOVED_OUT" && (
                          <p className="text-[11px] text-[#114e0b] font-medium">
                            คืนแล้ว {formatCurrency(l.depositRefunded)}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {l.contractFileUrl ? (
                          <a
                            href={l.contractFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f5eef9] text-[#5c2484] font-medium"
                          >
                            <Download className="w-3 h-3" />
                            <span>ดูไฟล์</span>
                          </a>
                        ) : (
                          <span className="text-[#999999]">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {l.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => openMoveOutModal(l)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#222222] hover:bg-black text-white font-semibold"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>ย้ายออก</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(l)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f5eef9] text-[#5c2484] font-medium"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLease(l)}
                          className="p-1.5 rounded-lg border border-[#dddddd] text-[#ac2d2d] hover:bg-[#f8e4e4]"
                          title="ลบสัญญา"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal ย้ายออกพร้อมคำนวณเงินประกันคืน (Move-Out & Refund Deposit) */}
      {moveOutLease && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setMoveOutLease(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#222222]">
                  บันทึกการย้ายออก - ห้อง {moveOutLease.room.number}
                </h3>
                <p className="text-xs text-[#666666]">
                  ผู้เช่า: {moveOutLease.tenantName} · สัญญา {moveOutLease.leaseNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoveOutLease(null)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmMoveOut} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  วันที่ย้ายออกจริง *
                </label>
                <input
                  type="date"
                  required
                  value={moveOutDate}
                  onChange={(e) => setMoveOutDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#fafafa] border border-[#eeeeee] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#666666]">เงินประกันความเสียหายที่รับไว้:</span>
                  <span className="font-bold text-sm text-[#222222]">
                    {formatCurrency(moveOutLease.securityDeposit)}
                  </span>
                </div>

                <div className="border-t border-[#eeeeee] pt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#222222] mb-1">
                      หักบิลค้างชำระ (บาท)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={unpaidDeduction}
                      onChange={(e) => setUnpaidDeduction(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-semibold text-[#ac2d2d]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#222222] mb-1">
                      หักค่าเสียหาย/ทำความสะอาด (บาท)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={damageDeduction}
                      onChange={(e) => setDamageDeduction(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-semibold text-[#ac2d2d]"
                    />
                  </div>
                </div>

                {/* คำนวณยอดเงินประกันที่ต้องคืนสุทธิ */}
                {(() => {
                  const refund = calculateDepositRefund({
                    securityDeposit: moveOutLease.securityDeposit,
                    damageDeduction: Number(damageDeduction),
                    unpaidDeduction: Number(unpaidDeduction),
                  });

                  return (
                    <div className="border-t border-[#eeeeee] pt-3 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-[#114e0b] block">
                          ยอดเงินประกันที่ต้องคืนผู้เช่า:
                        </span>
                        <span className="text-[11px] text-[#666666]">
                          (เงินประกัน {formatCurrency(refund.securityDeposit)} -
                          หักรวม{" "}
                          {formatCurrency(
                            refund.damageDeduction + refund.unpaidDeduction
                          )}
                          )
                        </span>
                      </div>
                      <span className="font-serif text-xl font-bold text-[#114e0b]">
                        {formatCurrency(refund.depositRefunded)}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  หมายเหตุ / รายละเอียดการหักค่าใช้จ่าย
                </label>
                <textarea
                  rows={2}
                  value={moveOutNotes}
                  onChange={(e) => setMoveOutNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#fcf8d8] text-[#5e5515] flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  เมื่อบันทึกการย้ายออก ระบบจะปรับสถานะสัญญาเป็น{" "}
                  <strong>MOVED_OUT</strong> และเปลี่ยนสถานะห้องเป็น{" "}
                  <strong>CLEANING (ทำความสะอาด)</strong> โดยอัตโนมัติ
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveOutLease(null)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#222222] hover:bg-black text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "ยืนยันการย้ายออกและคืนเงิน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ทำสัญญาใหม่ / แก้ไขสัญญา */}
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
                {editingId ? "แก้ไขสัญญารายเดือน" : "ทำสัญญาเช่ารายเดือนใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLease} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  เลือกห้องพัก *
                </label>
                <select
                  required
                  value={form.roomId}
                  onChange={(e) => {
                    const r = rooms.find((rm) => rm.id === e.target.value);
                    const rent = r ? r.monthlyRate : Number(form.monthlyRent);
                    setForm({
                      ...form,
                      roomId: e.target.value,
                      monthlyRent: String(rent),
                      securityDeposit: String(rent * 2),
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#cccccc] bg-white text-sm font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      ห้อง {r.number} - {r.name} ({formatCurrency(r.monthlyRate)}/เดือน)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-medium text-[#222222] mb-1">
                    ชื่อ-นามสกุลผู้เช่า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="คุณ..."
                    value={form.tenantName}
                    onChange={(e) =>
                      setForm({ ...form, tenantName: e.target.value })
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
                    value={form.tenantPhone}
                    onChange={(e) =>
                      setForm({ ...form, tenantPhone: cleanPhoneNumber(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono text-sm"
                  />
                  {form.tenantPhone.length > 0 && form.tenantPhone.length < 9 && (
                    <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                      ⚠️ ต้องมี 9-10 หลัก (ปัจจุบัน {form.tenantPhone.length})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  เลขบัตรประจำตัวประชาชน (เฉพาะตัวเลข 13 หลัก)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="เช่น 1100400123456"
                  value={form.tenantIdCard}
                  onChange={(e) =>
                    setForm({ ...form, tenantIdCard: cleanIdCard(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-mono"
                />
                {form.tenantIdCard.length > 0 && form.tenantIdCard.length < 13 && (
                  <span className="text-[10px] text-[#ac2d2d] block mt-0.5">
                    ⚠️ ต้องครบ 13 หลัก (ปัจจุบัน {form.tenantIdCard.length}/13)
                  </span>
                )}
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  LINE ID หรือ ลิงก์ LINE ส่วนตัวของผู้เช่า
                </label>
                <input
                  type="text"
                  placeholder="เช่น somchai_line หรือ https://line.me/ti/p/..."
                  value={form.tenantLineId}
                  onChange={(e) =>
                    setForm({ ...form, tenantLineId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-sans"
                />
                <p className="text-[11px] text-[#777777] mt-1">
                  ใช้สำหรับเปิดห้องแชตตรงไปยัง LINE ของผู้เช่าคนนี้เวลาส่งบิล (ไม่ต้องหาชื่อเอง)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    วันเริ่มสัญญา *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    วันสิ้นสุดสัญญา *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    ค่าเช่ารายเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.monthlyRent}
                    onChange={(e) =>
                      setForm({ ...form, monthlyRent: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-semibold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    เงินประกันความเสียหาย (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.securityDeposit}
                    onChange={(e) =>
                      setForm({ ...form, securityDeposit: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-semibold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1 flex items-center justify-between">
                  <span>แนบไฟล์สัญญา / สำเนาบัตรประชาชน (PDF หรือรูปภาพ)</span>
                  {uploading && (
                    <span className="text-[#5c2484] font-semibold">
                      กำลังอัปโหลด...
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="URL ไฟล์แนบ..."
                    value={form.contractFileUrl}
                    onChange={(e) =>
                      setForm({ ...form, contractFileUrl: e.target.value })
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
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="เช่น ผู้เช่ายื่นเอกสารครบ, จ่ายเงินประกันครบแล้ว..."
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
                  disabled={saving || uploading}
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? "กำลังตรวจสอบคิวห้อง..." : "บันทึกสัญญา"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeasesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดสัญญารายเดือน...
        </div>
      }
    >
      <LeasesContent />
    </Suspense>
  );
}
