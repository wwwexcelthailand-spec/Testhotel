"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Receipt,
  Plus,
  Search,
  Sparkles,
  Calendar,
  Copy,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  X,
  Phone,
  QrCode,
  DollarSign,
  MessageSquare,
  ExternalLink,
  Check,
} from "lucide-react";
import {
  formatCurrency,
  formatThaiDate,
  formatThaiDateFull,
  formatMonthThai,
  toDateString,
  addDays,
  INVOICE_STATUS_MAP,
  generateLineBillMessage,
} from "@/lib/utils";

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  leaseId: string;
  lease: {
    id: string;
    leaseNumber: string;
    tenantName: string;
    tenantPhone: string;
    tenantLineId?: string;
    guest?: { id: string; lineId?: string };
    room: { number: string; name: string };
  };
  roomId: string;
  room?: { number: string; name: string };
  billingMonth: string;
  issueDate: string;
  dueDate: string;
  rentAmount: number;
  waterUnits: number;
  waterRate: number;
  waterAmount: number;
  electricUnits: number;
  electricRate: number;
  electricAmount: number;
  otherAmount: number;
  otherNote: string;
  lateDays: number;
  lateFeeAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  paidAt: string | null;
  paymentMethod: string;
}

interface SettingInfo {
  propertyName: string;
  propertyAddress: string;
  propertyPhone: string;
  promptPayId: string;
  promptPayQrUrl?: string;
  waterRate: number;
  electricRate: number;
  lateFeePerDay: number;
}

interface ActiveLeaseOption {
  id: string;
  leaseNumber: string;
  tenantName: string;
  monthlyRent: number;
  room: { id: string; number: string; name: string };
}

function InvoicesContent() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [setting, setSetting] = useState<SettingInfo | null>(null);
  const [activeLeases, setActiveLeases] = useState<ActiveLeaseOption[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = toDateString(new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => todayStr.slice(0, 7));
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal สร้างบิลรายห้อง (Manual)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    leaseId: "",
    billingMonth: selectedMonth,
    dueDate: addDays(todayStr, 7),
    rentAmount: "6500",
    waterUnits: "0",
    electricUnits: "0",
    otherAmount: "0",
    otherNote: "",
  });

  // Modal บันทึกชำระเงิน
  const [payModalInvoice, setPayModalInvoice] = useState<InvoiceItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("PROMPTPAY");
  const [paying, setPaying] = useState(false);

  // Modal ดูใบแจ้งหนี้ / ใบเสร็จรับเงิน (Print & QR Code)
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState(false);

  // Modal ส่งบิลทาง LINE
  const [lineModalInvoice, setLineModalInvoice] = useState<InvoiceItem | null>(null);
  const [lineCustomText, setLineCustomText] = useState("");
  const [lineCopied, setLineCopied] = useState(false);
  const [editingLineId, setEditingLineId] = useState("");
  const [savingLineId, setSavingLineId] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/invoices?month=${selectedMonth}&status=${statusFilter}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        setSetting(data.settings || null);
        setActiveLeases(data.activeLeases || []);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  async function handleBatchGenerate() {
    if (
      !window.confirm(
        `ต้องการสร้างบิลรายเดือนประจำเดือน ${formatMonthThai(
          selectedMonth
        )} สำหรับสัญญารายเดือนที่เปิดใช้งานทั้งหมดหรือไม่? (ระบบจะดึงเลขอัตโนมัติจากที่จดมิเตอร์ไว้)`
      )
    ) {
      return;
    }
    setBatchLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_MONTH",
          billingMonth: selectedMonth,
          dueDate: addDays(todayStr, 7),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToastMsg(data.message || "สร้างบิลสำเร็จ");
        await loadInvoices();
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการสร้างบิล");
      }
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleCreateSingleInvoice(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_SINGLE",
          ...createForm,
        }),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        setToastMsg("สร้างบิลเรียบร้อยแล้ว");
        await loadInvoices();
      } else {
        const err = await res.json();
        alert(err.error || "สร้างบิลไม่สำเร็จ");
      }
    } catch {
      alert("เกิดข้อผิดพลาด");
    }
  }

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!payModalInvoice) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/invoices/${payModalInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "PAY",
          paidAmount: Number(payAmount),
          paymentMethod: payMethod,
        }),
      });
      if (res.ok) {
        setPayModalInvoice(null);
        setToastMsg("บันทึกการชำระเงินเรียบร้อยแล้ว");
        await loadInvoices();
      }
    } finally {
      setPaying(false);
    }
  }

  async function handleDeleteInvoice(inv: InvoiceItem) {
    if (
      !window.confirm(
        `ต้องการลบบิล ${inv.invoiceNumber} (ห้อง ${inv.lease.room.number}) ใช่หรือไม่?`
      )
    ) {
      return;
    }
    await fetch(`/api/invoices/${inv.id}`, { method: "DELETE" });
    await loadInvoices();
  }

  function handleOpenLineModal(inv: InvoiceItem) {
    const text = generateLineBillMessage({
      propertyName: setting?.propertyName || "เดอะ เรทฟอร์ด เรสซิเดนซ์",
      tenantName: inv.lease.tenantName,
      roomNumber: inv.lease.room.number,
      billingMonth: inv.billingMonth,
      dueDate: inv.dueDate,
      rentAmount: inv.rentAmount,
      waterUnits: inv.waterUnits,
      waterRate: inv.waterRate,
      waterAmount: inv.waterAmount,
      electricUnits: inv.electricUnits,
      electricRate: inv.electricRate,
      electricAmount: inv.electricAmount,
      otherAmount: inv.otherAmount,
      otherNote: inv.otherNote,
      lateFeeAmount: inv.lateFeeAmount,
      totalAmount: inv.totalAmount,
      promptPayId: setting?.promptPayId,
    });
    const currentLine = inv.lease.tenantLineId || inv.lease.guest?.lineId || "";
    setEditingLineId(currentLine);
    setLineCustomText(text);
    setLineModalInvoice(inv);
    setLineCopied(false);
  }

  async function handleSaveLineId() {
    if (!lineModalInvoice) return;
    setSavingLineId(true);
    try {
      const res = await fetch(`/api/invoices/${lineModalInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_LINE_ID",
          tenantLineId: editingLineId.trim(),
        }),
      });
      if (res.ok) {
        setLineModalInvoice((prev) =>
          prev
            ? {
                ...prev,
                lease: {
                  ...prev.lease,
                  tenantLineId: editingLineId.trim(),
                },
              }
            : null
        );
        setToastMsg("บันทึก LINE ID ของผู้เช่าเรียบร้อยแล้ว");
        await loadInvoices();
      }
    } finally {
      setSavingLineId(false);
    }
  }

  function handleOpenDirectChat() {
    if (!lineCustomText || !lineModalInvoice) return;
    const targetLineId = lineModalInvoice.lease.tenantLineId || editingLineId;
    if (!targetLineId) return;

    // คัดลอกข้อความบิลเข้าคลิปบอร์ดให้อัตโนมัติ เพื่อให้พอเข้าห้องแชตแล้วกดวางได้ทันที
    navigator.clipboard.writeText(lineCustomText);
    setLineCopied(true);

    const clean = targetLineId.trim();
    const chatUrl = clean.startsWith("http")
      ? clean
      : `https://line.me/ti/p/~${clean.replace(/^@/, "")}`;

    window.open(chatUrl, "_blank");
    setToastMsg(
      `คัดลอกข้อความบิลแล้ว และเปิดแชต LINE ของคุณ${lineModalInvoice.lease.tenantName} เรียบร้อย (กด Ctrl+V หรือแตะวางเพื่อส่ง)`
    );
  }

  function handleSendToLineApp() {
    if (!lineCustomText) return;
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(lineCustomText)}`;
    window.open(url, "_blank");
  }

  function handleCopyModalLineText() {
    if (!lineCustomText) return;
    navigator.clipboard.writeText(lineCustomText);
    setLineCopied(true);
    setToastMsg("คัดลอกข้อความบิลสำหรับส่ง LINE เรียบร้อยแล้ว");
    setTimeout(() => setLineCopied(false), 3000);
  }

  async function openViewInvoice(inv: InvoiceItem) {
    setViewInvoice(inv);
    setLoadingQr(true);
    setQrDataUrl("");
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        setQrDataUrl(data.qrDataUrl || "");
      }
    } finally {
      setLoadingQr(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inv.lease.tenantName.toLowerCase().includes(q) ||
        inv.lease.room.number.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q)
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
            บิลรายเดือน & บันทึกการชำระเงิน
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            รวมค่าเช่า ค่าน้ำ ค่าไฟ ค่าปรับล่าช้าอัตโนมัติ · สร้าง PDF · PromptPay
            QR · ปุ่มคัดลอกส่ง LINE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* เลือกรอบเดือน */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dddddd] bg-[#fafafa]">
            <Calendar className="w-4 h-4 text-[#5c2484]" />
            <input
              type="month"
              aria-label="เลือกรอบเดือนของบิล"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#222222] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleBatchGenerate}
            disabled={batchLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {batchLoading ? "กำลังสร้างบิล..." : "สร้างบิลเดือนนี้ทั้งหมด"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const firstLease = activeLeases[0];
              setCreateForm({
                leaseId: firstLease?.id || "",
                billingMonth: selectedMonth,
                dueDate: addDays(todayStr, 7),
                rentAmount: String(firstLease?.monthlyRent || 6500),
                waterUnits: "0",
                electricUnits: "0",
                otherAmount: "0",
                otherNote: "",
              });
              setCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#5c2484] text-[#5c2484] hover:bg-[#f5eef9] text-xs sm:text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างบิลรายห้อง</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-[#cef5ca] text-[#114e0b] text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="bg-white rounded-xl border border-[#eeeeee] p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาชื่อผู้เช่า, เลขห้อง, เลขที่บิล..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#dddddd] text-xs focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: "ALL", label: "ทั้งหมด" },
            { key: "UNPAID", label: "รอชำระ" },
            { key: "OVERDUE", label: "เกินกำหนด" },
            { key: "PAID", label: "ชำระแล้ว" },
            { key: "PARTIAL", label: "ชำระบางส่วน" },
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

      {/* รายการบิล */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#eeeeee] bg-[#fafafa] text-[11px] font-semibold uppercase text-[#666666]">
                <th className="py-3.5 px-4">ห้องพัก / เลขที่บิล</th>
                <th className="py-3.5 px-4">ผู้เช่า</th>
                <th className="py-3.5 px-4">รอบเดือน / ครบกำหนด</th>
                <th className="py-3.5 px-4">ค่าเช่า / น้ำ-ไฟ</th>
                <th className="py-3.5 px-4">ยอดรวมสุทธิ</th>
                <th className="py-3.5 px-4">สถานะ</th>
                <th className="py-3.5 px-4 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeeee]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    กำลังโหลดรายการบิล...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#777777]">
                    ไม่พบบิลตามเงื่อนไขที่เลือก (กดปุ่ม &quot;สร้างบิลเดือนนี้ทั้งหมด&quot; เพื่อออกบิลอัตโนมัติ)
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const st =
                    INVOICE_STATUS_MAP[inv.status] || INVOICE_STATUS_MAP.UNPAID;
                  const remaining = Math.max(0, inv.totalAmount - inv.paidAmount);

                  return (
                    <tr key={inv.id} className="hover:bg-[#fafafa] transition">
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-[#222222] text-white font-bold text-xs">
                          ห้อง {inv.lease.room.number}
                        </span>
                        <p className="text-[11px] text-[#777777] mt-1 font-mono">
                          {inv.invoiceNumber}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-sm text-[#222222]">
                          {inv.lease.tenantName}
                        </p>
                        <p className="text-[#666666] text-xs">{inv.lease.tenantPhone || "-"}</p>
                        {(inv.lease.tenantLineId || inv.lease.guest?.lineId) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#06c755] bg-[#06c755]/10 px-1.5 py-0.5 rounded mt-0.5">
                            LINE: {inv.lease.tenantLineId || inv.lease.guest?.lineId}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#222222]">
                          {formatMonthThai(inv.billingMonth)}
                        </p>
                        <p className="text-[#666666] text-[11px]">
                          ครบกำหนด {formatThaiDate(inv.dueDate)}
                        </p>
                        {inv.lateDays > 0 && inv.status !== "PAID" && (
                          <span className="inline-block text-[11px] font-semibold text-[#ac2d2d] bg-[#f8e4e4] px-2 py-0.5 rounded-full mt-1">
                            เกิน {inv.lateDays} วัน (+
                            {formatCurrency(inv.lateFeeAmount)})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-[#222222]">
                          ค่าเช่า {formatCurrency(inv.rentAmount)}
                        </p>
                        <p className="text-[11px] text-[#666666]">
                          น้ำ {inv.waterUnits} หน่วย ({formatCurrency(inv.waterAmount)}) ·
                          ไฟ {inv.electricUnits} หน่วย (
                          {formatCurrency(inv.electricAmount)})
                        </p>
                        {inv.otherAmount > 0 && (
                          <p className="text-[11px] text-[#5c2484]">
                            {inv.otherNote || "อื่นๆ"}:{" "}
                            {formatCurrency(inv.otherAmount)}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-serif text-base font-bold text-[#5c2484]">
                          {formatCurrency(inv.totalAmount)}
                        </p>
                        {inv.paidAmount > 0 && (
                          <p className="text-[11px] text-[#114e0b] font-medium">
                            ชำระแล้ว {formatCurrency(inv.paidAmount)}
                          </p>
                        )}
                        {remaining > 0 && inv.status !== "UNPAID" && (
                          <p className="text-[11px] text-[#ac2d2d]">
                            ค้างชำระ {formatCurrency(remaining)}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.bg} ${st.text}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* ปุ่มส่ง LINE (เปิดหน้าต่างส่ง/คัดลอก) */}
                        <button
                          type="button"
                          onClick={() => handleOpenLineModal(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#06c755]/40 bg-[#06c755]/10 hover:bg-[#06c755] hover:text-white text-[#06c755] text-xs font-semibold transition shadow-xs"
                          title="ส่งบิลทาง LINE (เปิดแอป LINE หรือคัดลอกข้อความ)"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>ส่ง LINE</span>
                        </button>

                        {/* ปุ่มบันทึกการชำระเงิน */}
                        {inv.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => {
                              setPayModalInvoice(inv);
                              setPayAmount(String(remaining));
                              setPayMethod("PROMPTPAY");
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#5c2484] hover:bg-[#421861] text-white font-semibold"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>รับชำระ</span>
                          </button>
                        )}

                        {/* ปุ่มดูใบแจ้งหนี้ / ใบเสร็จรับเงิน PDF พร้อม QR Code */}
                        <button
                          type="button"
                          onClick={() => openViewInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f5eef9] text-[#5c2484] font-medium"
                          title="ดูใบแจ้งหนี้/ใบเสร็จ และ QR Code พร้อมเพย์"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{inv.status === "PAID" ? "ใบเสร็จ" : "ใบแจ้งหนี้"}</span>
                        </button>

                        {/* ปุ่มลบบิล */}
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv)}
                          className="p-1.5 rounded-lg border border-[#dddddd] text-[#ac2d2d] hover:bg-[#f8e4e4]"
                          title="ลบบิล"
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

      {/* Modal รับชำระเงิน (Record Payment) */}
      {payModalInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPayModalInvoice(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#222222]">
                  บันทึกรับชำระเงิน - ห้อง {payModalInvoice.lease.room.number}
                </h3>
                <p className="text-xs text-[#666666]">
                  {payModalInvoice.lease.tenantName} · บิล{" "}
                  {payModalInvoice.invoiceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayModalInvoice(null)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#eeeeee] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#666666]">ยอดรวมในบิล:</span>
                  <span className="font-semibold text-[#222222]">
                    {formatCurrency(payModalInvoice.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666666]">ชำระแล้วก่อนหน้า:</span>
                  <span className="font-semibold text-[#114e0b]">
                    {formatCurrency(payModalInvoice.paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-[#eeeeee] pt-1 font-bold">
                  <span className="text-[#ac2d2d]">ยอดคงค้าง:</span>
                  <span className="text-sm text-[#ac2d2d]">
                    {formatCurrency(
                      Math.max(
                        0,
                        payModalInvoice.totalAmount - payModalInvoice.paidAmount
                      )
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  จำนวนเงินที่รับชำระครั้งนี้ (บาท) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#cccccc] font-semibold text-base"
                />
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  ช่องทางการชำระเงิน
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] bg-white font-medium"
                >
                  <option value="PROMPTPAY">PromptPay QR / พร้อมเพย์</option>
                  <option value="TRANSFER">โอนเงินเข้าบัญชีธนาคาร</option>
                  <option value="CASH">เงินสด</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModalInvoice(null)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold shadow-sm disabled:opacity-50"
                >
                  {paying ? "กำลังบันทึก..." : "ยืนยันรับชำระเงิน"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ดูใบแจ้งหนี้ / ใบเสร็จรับเงิน PDF & PromptPay QR */}
      {viewInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setViewInvoice(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar (ซ่อนเมื่อสั่งพิมพ์) */}
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-4 no-print">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#222222]">
                  {viewInvoice.status === "PAID"
                    ? "ใบเสร็จรับเงิน (Official Receipt)"
                    : "ใบแจ้งค่าเช่าและสาธารณูปโภค (Invoice)"}
                </h3>
                <p className="text-xs text-[#666666]">
                  พิมพ์หรือบันทึกเป็น PDF เพื่อส่งให้ผู้เช่า
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์ / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewInvoice(null)}
                  className="p-1.5 rounded-lg text-[#666666] hover:bg-[#fafafa]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* เอกสารใบแจ้งหนี้/ใบเสร็จ (Printable Area) */}
            <div
              id="printable-receipt"
              className="border border-[#eeeeee] rounded-xl p-6 sm:p-7 space-y-5 bg-white text-[#222222]"
            >
              {/* Header ที่พัก */}
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
                  <span
                    className={`inline-block px-3 py-1 rounded-lg font-bold text-xs ${
                      viewInvoice.status === "PAID"
                        ? "bg-[#cef5ca] text-[#114e0b]"
                        : "bg-[#f5eef9] text-[#5c2484]"
                    }`}
                  >
                    {viewInvoice.status === "PAID"
                      ? "ใบเสร็จรับเงิน / RECEIPT"
                      : "ใบแจ้งหนี้ / INVOICE"}
                  </span>
                  <p className="text-xs font-semibold mt-1">
                    เลขที่: {viewInvoice.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    ประจำเดือน: {formatMonthThai(viewInvoice.billingMonth)}
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    ออกเมื่อ: {formatThaiDateFull(viewInvoice.issueDate)}
                  </p>
                </div>
              </div>

              {/* ข้อมูลผู้เช่า */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-[#fafafa] p-3.5 rounded-xl border border-[#eeeeee]">
                <div>
                  <p className="text-[#666666]">ชื่อผู้เช่า</p>
                  <p className="font-bold text-sm text-[#222222]">
                    คุณ{viewInvoice.lease.tenantName}
                  </p>
                  <p className="text-[#666666]">
                    โทร: {viewInvoice.lease.tenantPhone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[#666666]">ห้องพัก / กำหนดชำระ</p>
                  <p className="font-bold text-sm text-[#5c2484]">
                    ห้อง {viewInvoice.lease.room.number} (
                    {viewInvoice.lease.room.name})
                  </p>
                  <p className="text-[#666666]">
                    กรุณาชำระภายใน:{" "}
                    <strong>{formatThaiDate(viewInvoice.dueDate)}</strong>
                  </p>
                </div>
              </div>

              {/* ตารางแจกแจงรายการ */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#dddddd] text-[#666666]">
                    <th className="py-2 text-left">รายการ</th>
                    <th className="py-2 text-right">จำนวนหน่วย</th>
                    <th className="py-2 text-right">ราคา/หน่วย</th>
                    <th className="py-2 text-right">รวมเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeeeee]">
                  <tr>
                    <td className="py-2.5 font-medium">ค่าเช่าห้องพัก</td>
                    <td className="py-2.5 text-right text-[#666666]">1 เดือน</td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {formatCurrency(viewInvoice.rentAmount)}
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatCurrency(viewInvoice.rentAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium">ค่าน้ำประปา</td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {viewInvoice.waterUnits} หน่วย
                    </td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {viewInvoice.waterRate} บ.
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatCurrency(viewInvoice.waterAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium">ค่าไฟฟ้า</td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {viewInvoice.electricUnits} หน่วย
                    </td>
                    <td className="py-2.5 text-right text-[#666666]">
                      {viewInvoice.electricRate} บ.
                    </td>
                    <td className="py-2.5 text-right font-medium">
                      {formatCurrency(viewInvoice.electricAmount)}
                    </td>
                  </tr>
                  {viewInvoice.otherAmount > 0 && (
                    <tr>
                      <td className="py-2.5 font-medium">
                        {viewInvoice.otherNote || "ค่าใช้จ่ายอื่น ๆ"}
                      </td>
                      <td className="py-2.5 text-right text-[#666666]">1</td>
                      <td className="py-2.5 text-right text-[#666666]">
                        {formatCurrency(viewInvoice.otherAmount)}
                      </td>
                      <td className="py-2.5 text-right font-medium">
                        {formatCurrency(viewInvoice.otherAmount)}
                      </td>
                    </tr>
                  )}
                  {viewInvoice.lateFeeAmount > 0 && (
                    <tr className="text-[#ac2d2d]">
                      <td className="py-2.5 font-medium">
                        ค่าปรับชำระล่าช้า ({viewInvoice.lateDays} วัน x{" "}
                        {setting?.lateFeePerDay ?? 50} บ.)
                      </td>
                      <td className="py-2.5 text-right text-[#ac2d2d]">
                        {viewInvoice.lateDays} วัน
                      </td>
                      <td className="py-2.5 text-right text-[#ac2d2d]">
                        {setting?.lateFeePerDay ?? 50} บ.
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        {formatCurrency(viewInvoice.lateFeeAmount)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#222222] font-bold text-sm">
                    <td colSpan={3} className="pt-3">
                      ยอดรวมที่ต้องชำระ
                    </td>
                    <td className="pt-3 text-right text-[#5c2484]">
                      {formatCurrency(viewInvoice.totalAmount)}
                    </td>
                  </tr>
                  {viewInvoice.paidAmount > 0 && (
                    <tr className="text-xs text-[#114e0b]">
                      <td colSpan={3} className="pt-1">
                        รับชำระแล้ว ({viewInvoice.paymentMethod})
                      </td>
                      <td className="pt-1 text-right font-semibold">
                        {formatCurrency(viewInvoice.paidAmount)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>

              {/* ส่วน PromptPay QR Code สแกนจ่ายเงิน (ถ้ายังค้างชำระ) */}
              {viewInvoice.status !== "PAID" && (
                <div className="pt-3 border-t border-[#eeeeee] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#fafafa] p-4 rounded-xl">
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-sm text-[#5c2484] flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" />
                      <span>{setting?.promptPayQrUrl ? "สแกนจ่ายผ่าน QR Code รับเงิน" : "สแกนจ่ายผ่าน PromptPay QR"}</span>
                    </p>
                    <p className="text-[#666666]">
                      ยอดชำระ:{" "}
                      <strong className="text-sm text-[#222222]">
                        {formatCurrency(
                          Math.max(
                            0,
                            viewInvoice.totalAmount - viewInvoice.paidAmount
                          )
                        )}
                      </strong>
                    </p>
                    {setting?.promptPayId && (
                      <p className="text-[#666666]">
                        ข้อมูลบัญชี / พร้อมเพย์:{" "}
                        <span className="font-mono font-semibold">
                          {setting.promptPayId}
                        </span>
                      </p>
                    )}
                  </div>

                  {qrDataUrl && (
                    <div className="flex flex-col items-center">
                      <img
                        src={qrDataUrl}
                        alt="PromptPay QR Code"
                        className="w-32 h-32 rounded-lg border border-[#dddddd] shadow-sm bg-white p-1"
                      />
                      <span className="text-[10px] text-[#777777] mt-1">
                        สแกนผ่านแอปธนาคารได้ทันที
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ท้ายเอกสาร */}
              <div className="pt-4 border-t border-[#eeeeee] flex items-center justify-between text-[11px] text-[#777777]">
                <span>ขอบคุณที่ไว้วางใจ {setting?.propertyName}</span>
                <span>ผู้รับเงิน / ผู้ดูแลระบบ</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal สร้างบิลรายห้อง (Manual Single Invoice) */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setCreateModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#eeeeee] max-w-lg w-full p-6 shadow-xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#222222]">
                สร้างบิลรายห้อง (ออกบิลแบบกำหนดเอง)
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSingleInvoice} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  เลือกสัญญา / ห้องพัก *
                </label>
                <select
                  required
                  value={createForm.leaseId}
                  onChange={(e) => {
                    const l = activeLeases.find((ls) => ls.id === e.target.value);
                    setCreateForm({
                      ...createForm,
                      leaseId: e.target.value,
                      rentAmount: String(l?.monthlyRent || 6500),
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#cccccc] bg-white text-sm font-medium"
                >
                  {activeLeases.map((l) => (
                    <option key={l.id} value={l.id}>
                      ห้อง {l.room.number} - {l.tenantName} (ค่าเช่า{" "}
                      {formatCurrency(l.monthlyRent)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    รอบเดือนของบิล *
                  </label>
                  <input
                    type="month"
                    required
                    value={createForm.billingMonth}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, billingMonth: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    วันครบกำหนดชำระ *
                  </label>
                  <input
                    type="date"
                    required
                    value={createForm.dueDate}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, dueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#222222] mb-1">
                  ค่าเช่าห้อง (บาท)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={createForm.rentAmount}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, rentAmount: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] font-semibold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    จำนวนหน่วยน้ำที่ใช้ (หน่วย)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.waterUnits}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, waterUnits: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    จำนวนหน่วยไฟที่ใช้ (หน่วย)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.electricUnits}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        electricUnits: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    ค่าใช้จ่ายอื่น ๆ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.otherAmount}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, otherAmount: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#222222] mb-1">
                    หมายเหตุค่าใช้จ่ายอื่น
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ค่าที่จอดรถ, ส่วนกลาง..."
                    value={createForm.otherNote}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, otherNote: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold shadow-sm"
                >
                  บันทึกและออกบิล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ส่งบิลทาง LINE (LINE Bill Sharing Modal) */}
      {lineModalInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setLineModalInvoice(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#06c755] flex items-center justify-center text-white shadow-sm shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#222222]">
                    ส่งบิลทาง LINE - ห้อง {lineModalInvoice.lease.room.number}
                  </h3>
                  <p className="text-xs text-[#666666]">
                    ผู้เช่า: คุณ{lineModalInvoice.lease.tenantName} · โทร {lineModalInvoice.lease.tenantPhone || "-"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLineModalInvoice(null)}
                className="p-1.5 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* กล่องคำอธิบายว่าทำงานอย่างไร */}
            <div className="p-3.5 rounded-xl bg-[#f0fbf3] border border-[#06c755]/25 text-xs text-[#0e5c26] space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-[#06c755]">
                <span>💡</span>
                <span>ส่งบิลผ่าน LINE ส่วนตัว (ฟรี 100% ไม่ต้องสมัคร LINE API)</span>
              </p>
              <p className="text-[11px] leading-relaxed text-[#1d6b35]">
                ระบบจะสรุปยอดค่าน้ำ-ไฟ และเลข PromptPay ให้อัตโนมัติ สามารถกด <strong>"เปิดห้องแชตผู้เช่าโดยตรง"</strong> เพื่อส่งข้อความได้ทันที หรือกด <strong>"คัดลอกข้อความ"</strong> ไปวางในแชตได้ตามสะดวก
              </p>
            </div>

            {/* ส่วนระบุ LINE ID ผู้เช่า (แนวทางที่ 2: แชตตรงรายบุคคล) */}
            {lineModalInvoice.lease.tenantLineId ? (
              <div className="p-3.5 rounded-xl bg-[#f5fbf7] border border-[#06c755]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#06c755] flex items-center justify-center text-white shrink-0 shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#222222]">
                      LINE ID ผู้เช่า:{" "}
                      <span className="font-mono text-[#06c755] font-bold">
                        {lineModalInvoice.lease.tenantLineId}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#666666]">
                      กดปุ่มเพื่อเปิดห้องแชตผู้เช่าคนนี้ทันที (ระบบจะคัดลอกบิลให้พร้อมวาง)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenDirectChat}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06c755] hover:bg-[#05b04a] text-white font-bold text-xs shadow-sm transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดห้องแชตผู้เช่า</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#fafafa] border border-[#eeeeee] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-[#222222] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#06c755]" />
                    <span>บันทึก LINE ID ของคุณ{lineModalInvoice.lease.tenantName}:</span>
                  </p>
                  <span className="text-[10px] text-[#888888]">บันทึกครั้งเดียวใช้ได้ตลอด</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เช่น somchai_line หรือ https://line.me/ti/p/..."
                    value={editingLineId}
                    onChange={(e) => setEditingLineId(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-[#cccccc] font-sans text-xs bg-white text-[#222222]"
                  />
                  <button
                    type="button"
                    disabled={!editingLineId.trim() || savingLineId}
                    onClick={handleSaveLineId}
                    className="px-4 py-1.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold text-xs transition disabled:opacity-40 shrink-0"
                  >
                    {savingLineId ? "กำลังบันทึก..." : "บันทึก LINE ID"}
                  </button>
                </div>
                <p className="text-[11px] text-[#777777]">
                  เมื่อบันทึกแล้ว จะสามารถกดเปิดห้องแชตของผู้เช่าคนนี้ได้โดยตรงในคลิกเดียวทันที
                </p>
              </div>
            )}

            {/* กล่องข้อความที่เตรียมส่ง (แก้ไขเพิ่มเติมได้ก่อนส่ง) */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[#222222]">
                  ข้อความสรุปบิล (แก้ไขเพิ่มเติมได้ตามต้องการ):
                </label>
                <span className="text-[11px] font-bold text-[#5c2484]">
                  ยอดรวม {formatCurrency(lineModalInvoice.totalAmount)}
                </span>
              </div>
              <textarea
                rows={8}
                value={lineCustomText}
                onChange={(e) => setLineCustomText(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#cccccc] font-sans text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#06c755] bg-[#fafafa]"
              />
            </div>

            {/* ปุ่มกดดำเนินการ */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#eeeeee]">
              <button
                type="button"
                onClick={handleCopyModalLineText}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#dddddd] bg-white hover:bg-[#fafafa] text-[#222222] text-xs font-semibold transition"
              >
                {lineCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[#06c755]" />
                    <span className="text-[#06c755]">คัดลอกเรียบร้อยแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#555555]" />
                    <span>คัดลอกข้อความ</span>
                  </>
                )}
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLineModalInvoice(null)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-medium text-[#666666] hover:bg-[#fafafa]"
                >
                  ปิด
                </button>

                {lineModalInvoice.lease.tenantLineId ? (
                  <button
                    type="button"
                    onClick={handleOpenDirectChat}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#06c755] hover:bg-[#05b04a] text-white text-xs font-semibold shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>เปิดห้องแชตผู้เช่าโดยตรง</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendToLineApp}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#06c755] hover:bg-[#05b04a] text-white text-xs font-semibold shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>เปิดแอป LINE เพื่อส่ง</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดรายการบิล...
        </div>
      }
    >
      <InvoicesContent />
    </Suspense>
  );
}
