"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Save,
  Trash2,
  RotateCcw,
  Building2,
  Zap,
  Clock,
  KeyRound,
  CheckCircle2,
  Database,
  Download,
  Upload,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
  ImageIcon,
  UploadCloud,
  QrCode,
} from "lucide-react";
import { cleanPhoneNumber } from "@/lib/utils";

const PRESET_LOGIN_IMAGES = [
  {
    label: "เรทฟอร์ด บูทีค (ดั้งเดิม)",
    url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
  },
  {
    label: "โมเดิร์น ลักชูรี่ สวีท",
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80",
  },
  {
    label: "ห้องพักไม้ธรรมชาติ อบอุ่น",
    url: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1600&q=80",
  },
  {
    label: "มินิมอล โมเดิร์น คลีน",
    url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=80",
  },
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sampleRoomsCount, setSampleRoomsCount] = useState(0);

  const [form, setForm] = useState({
    propertyName: "",
    propertyAddress: "",
    propertyPhone: "",
    waterRate: "18",
    electricRate: "8",
    lateFeePerDay: "50",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    leaseWarningDays: "30",
    promptPayId: "",
    promptPayQrUrl: "",
    loginImageUrl: "",
    newPassword: "",
  });

  const [uploadingLoginImage, setUploadingLoginImage] = useState(false);
  const [uploadingPromptPayQr, setUploadingPromptPayQr] = useState(false);

  // Backup & Restore
  const [importing, setImporting] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setForm({
          propertyName: data.propertyName || "",
          propertyAddress: data.propertyAddress || "",
          propertyPhone: data.propertyPhone || "",
          waterRate: String(data.waterRate ?? 18),
          electricRate: String(data.electricRate ?? 8),
          lateFeePerDay: String(data.lateFeePerDay ?? 50),
          checkInTime: data.checkInTime || "14:00",
          checkOutTime: data.checkOutTime || "12:00",
          leaseWarningDays: String(data.leaseWarningDays ?? 30),
          promptPayId: data.promptPayId || "",
          promptPayQrUrl: data.promptPayQrUrl || "",
          loginImageUrl: data.loginImageUrl || "",
          newPassword: "",
        });
        setSampleRoomsCount(data.sampleRoomsCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handlePromptPayQrUpload(file: File) {
    if (!file) return;
    setUploadingPromptPayQr(true);
    setMessage("");
    setErrorMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, promptPayQrUrl: data.url }));
        setMessage("อัปโหลดรูปภาพ QR Code พร้อมเพย์สำเร็จ อย่าลืมกด 'บันทึกการตั้งค่าทั้งหมด' ด้านล่างเพื่อยืนยัน");
      } else {
        setErrorMessage(data.error || "อัปโหลดรูปภาพไม่สำเร็จ");
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่ออัปโหลดรูปภาพ");
    } finally {
      setUploadingPromptPayQr(false);
    }
  }

  async function handleLoginImageUpload(file: File) {
    if (!file) return;
    setUploadingLoginImage(true);
    setMessage("");
    setErrorMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm((prev) => ({ ...prev, loginImageUrl: data.url }));
        setMessage("อัปโหลดรูปภาพสำเร็จ อย่าลืมกดปุ่ม 'บันทึกการตั้งค่าทั้งหมด' ด้านล่างเพื่อยืนยัน");
      } else {
        setErrorMessage(data.error || "อัปโหลดรูปภาพไม่สำเร็จ");
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการเชื่อมต่ออัปโหลดรูปภาพ");
    } finally {
      setUploadingLoginImage(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyName: form.propertyName,
          propertyAddress: form.propertyAddress,
          propertyPhone: form.propertyPhone,
          waterRate: Number(form.waterRate),
          electricRate: Number(form.electricRate),
          lateFeePerDay: Number(form.lateFeePerDay),
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
          leaseWarningDays: Number(form.leaseWarningDays),
          promptPayId: form.promptPayId,
          promptPayQrUrl: form.promptPayQrUrl,
          loginImageUrl: form.loginImageUrl,
          ...(form.newPassword ? { newPassword: form.newPassword } : {}),
        }),
      });
      if (res.ok) {
        setMessage("บันทึกการตั้งค่าเรียบร้อยแล้ว");
        setForm((prev) => ({ ...prev, newPassword: "" }));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSampleAction(action: "CLEAR_SAMPLE" | "RESTORE_SAMPLE") {
    if (
      action === "CLEAR_SAMPLE" &&
      !window.confirm(
        "ต้องการลบข้อมูลตัวอย่างทั้งหมด (10 ห้องตัวอย่าง พร้อมการจองและสัญญาตัวอย่าง) ใช่หรือไม่?"
      )
    ) {
      return;
    }
    setSaving(true);
    setMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "ดำเนินการสำเร็จ");
        await loadSettings();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleImportBackup(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBackupFile) return;

    if (
      !window.confirm(
        `คำเตือน: การนำเข้าข้อมูลสำรองจะทำการแทนที่ข้อมูลปัจจุบันด้วยข้อมูลจากไฟล์ "${selectedBackupFile.name}" (ระบบจะสร้าง Auto-backup ของเดิมเก็บไว้ให้อัตโนมัติก่อนเริ่มนำเข้า) ต้องการดำเนินการต่อหรือไม่?`
      )
    ) {
      return;
    }

    setImporting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const fd = new FormData();
      fd.append("file", selectedBackupFile);

      const res = await fetch("/api/backup", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "นำเข้าและกู้คืนข้อมูลสำเร็จ");
        setSelectedBackupFile(null);
        await loadSettings();
      } else {
        setErrorMessage(data.error || "นำเข้าข้อมูลไม่สำเร็จ");
      }
    } catch {
      setErrorMessage("เกิดข้อผิดพลาดในการนำเข้าไฟล์สำรองข้อมูล");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#777777]">
        กำลังโหลดการตั้งค่า...
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 sm:p-6 shadow-sm">
        <h1 className="font-serif text-2xl font-bold text-[#222222]">
          ตั้งค่าระบบ & สำรองข้อมูล (Backup)
        </h1>
        <p className="text-xs text-[#666666] mt-0.5">
          กำหนดชื่อที่พัก เวลาเช็คอิน-เช็คเอาท์ อัตราน้ำ-ไฟ ค่าปรับรายเดือน สำรองข้อมูล และกู้คืนข้อมูล
        </p>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-[#cef5ca] text-[#114e0b] text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage("")}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#f8e4e4] text-[#ac2d2d] text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")}>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* ข้อมูลที่พัก */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eeeeee] pb-3">
            <Building2 className="w-4 h-4 text-[#5c2484]" />
            <h2 className="font-semibold text-sm text-[#222222]">
              ข้อมูลที่พัก (แสดงบนหัวใบเสร็จและใบแจ้งหนี้)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-medium text-[#222222] mb-1">
                ชื่อหอพัก / โรงแรม / ที่พัก
              </label>
              <input
                type="text"
                required
                value={form.propertyName}
                onChange={(e) =>
                  setForm({ ...form, propertyName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#cccccc] text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-[#222222] mb-1">
                ที่อยู่
              </label>
              <input
                type="text"
                value={form.propertyAddress}
                onChange={(e) =>
                  setForm({ ...form, propertyAddress: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#222222] mb-1">
                เบอร์โทรศัพท์ติดต่อที่พัก (เฉพาะตัวเลข 9-10 หลัก)
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="เช่น 0812345678"
                value={form.propertyPhone}
                onChange={(e) =>
                  setForm({ ...form, propertyPhone: cleanPhoneNumber(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] font-mono text-sm"
              />
              <span className="text-[11px] text-[#777777] mt-1 block">
                {form.propertyPhone.length > 0 && form.propertyPhone.length < 9 && (
                  <span className="text-[#ac2d2d]">⚠️ กรุณากรอกเบอร์โทรให้ครบ 9-10 หลัก (ปัจจุบัน {form.propertyPhone.length} หลัก)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* รูปภาพ QR Code พร้อมเพย์ / ธนาคารสำหรับรับเงิน (แสดงในบิล & ใบแจ้งหนี้) */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeeee] pb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#5c2484]" />
              <h2 className="font-semibold text-sm text-[#222222]">
                รูปภาพ QR Code พร้อมเพย์ / ธนาคารสำหรับรับเงิน
              </h2>
            </div>
            {form.promptPayQrUrl ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#cef5ca] text-[#114e0b] border border-[#114e0b]/20">
                ✓ มีรูป QR Code พร้อมใช้งาน
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#fafafa] text-[#777777] border border-[#eeeeee]">
                ยังไม่ได้อัปโหลดรูป QR Code
              </span>
            )}
          </div>

          <p className="text-xs text-[#666666] leading-relaxed">
            อัปโหลดรูปภาพ <strong>QR Code พร้อมเพย์</strong> หรือ <strong>QR Code บัญชีธนาคาร</strong> ของคุณ เพื่อนำไปแสดงในใบแจ้งหนี้ บิลออนไลน์ และเอกสารเรียกเก็บเงิน ให้ผู้เช่าสามารถสแกนชำระเงินผ่านแอปธนาคารได้ทันที
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* กล่องแสดงตัวอย่างรูป QR Code */}
            <div className="p-4 rounded-xl border border-[#eeeeee] bg-[#fafafa] flex flex-col items-center justify-center text-center min-h-[190px]">
              {form.promptPayQrUrl ? (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-2xl border border-[#dddddd] shadow-sm">
                    <img
                      src={form.promptPayQrUrl}
                      alt="PromptPay QR Code"
                      className="w-36 h-36 object-contain rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, promptPayQrUrl: "" }))}
                    className="text-xs text-[#ac2d2d] hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรูปภาพ QR Code</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 text-[#888888]">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-dashed border-[#cccccc] flex items-center justify-center mx-auto text-[#aaaaaa]">
                    <QrCode className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-xs font-medium">ยังไม่มีรูป QR Code รับเงิน</p>
                  <p className="text-[11px] text-[#999999]">
                    เมื่ออัปโหลดแล้ว รูปจะแสดงในหน้าบิลและการแชร์ออนไลน์
                  </p>
                </div>
              )}
            </div>

            {/* กล่องปุ่มอัปโหลดรูป QR Code */}
            <div className="space-y-3 flex flex-col justify-center">
              <label className="block text-xs font-semibold text-[#222222]">
                อัปโหลดรูป QR Code ใหม่
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploadingPromptPayQr}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePromptPayQrUpload(file);
                  }}
                  className="w-full text-xs text-[#666666] file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#5c2484] file:text-white hover:file:bg-[#421861] cursor-pointer border border-[#cccccc] rounded-xl p-1.5 bg-white"
                />
              </div>
              <p className="text-[11px] text-[#777777]">
                รองรับไฟล์ PNG, JPG, WEBP (แนะนำรูปถ่ายหน้าจอหรือภาพเซฟ QR จากแอปธนาคารของคุณ)
              </p>

              <div className="pt-2 border-t border-[#eeeeee]">
                <label className="block text-xs font-semibold text-[#555555] mb-1">
                  ข้อความเพิ่มเติม / เลขที่บัญชีสำหรับคัดลอก (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ธ.กสิกรไทย 123-4-56789-0 นายสมชาย"
                  value={form.promptPayId}
                  onChange={(e) =>
                    setForm({ ...form, promptPayId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* อัตราน้ำ-ไฟ และค่าปรับล่าช้ารายเดือน */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eeeeee] pb-3">
            <Zap className="w-4 h-4 text-[#5c2484]" />
            <h2 className="font-semibold text-sm text-[#222222]">
              อัตราค่าน้ำ-ค่าไฟ และค่าปรับล่าช้า (สำหรับสัญญารายเดือน)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#222222] mb-1">
                ค่าน้ำประปา (บาท / หน่วย)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.waterRate}
                onChange={(e) => setForm({ ...form, waterRate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-[#222222] mb-1">
                ค่าไฟฟ้า (บาท / หน่วย)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={form.electricRate}
                onChange={(e) =>
                  setForm({ ...form, electricRate: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-[#222222] mb-1">
                ค่าปรับจ่ายบิลรายเดือนล่าช้า (บาท / วัน)
              </label>
              <input
                type="number"
                min="0"
                value={form.lateFeePerDay}
                onChange={(e) =>
                  setForm({ ...form, lateFeePerDay: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm font-semibold text-[#ac2d2d]"
              />
            </div>
          </div>
        </div>

        {/* เวลาเช็คอิน-เช็คเอาท์รายวัน */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eeeeee] pb-3">
            <Clock className="w-4 h-4 text-[#5c2484]" />
            <h2 className="font-semibold text-sm text-[#222222]">
              เวลาเช็คอิน-เช็คเอาท์รายวัน & การแจ้งเตือนสัญญา
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#222222] mb-1">
                เวลาเช็คอินรายวัน (ค่าเริ่มต้น 14:00)
              </label>
              <input
                type="time"
                value={form.checkInTime}
                onChange={(e) =>
                  setForm({ ...form, checkInTime: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#222222] mb-1">
                เวลาเช็คเอาท์รายวัน (ค่าเริ่มต้น 12:00)
              </label>
              <input
                type="time"
                value={form.checkOutTime}
                onChange={(e) =>
                  setForm({ ...form, checkOutTime: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm"
              />
            </div>

            <div>
              <label className="block font-medium text-[#222222] mb-1">
                แจ้งเตือนสัญญารายเดือนก่อนหมด (วัน)
              </label>
              <input
                type="number"
                min="1"
                value={form.leaseWarningDays}
                onChange={(e) =>
                  setForm({ ...form, leaseWarningDays: e.target.value })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc] text-sm"
              />
            </div>
          </div>
        </div>

        {/* รูปภาพหน้าเข้าสู่ระบบ (Login Background Image) */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eeeeee] pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#5c2484]" />
              <h2 className="font-semibold text-sm text-[#222222]">
                รูปภาพหน้าเข้าสู่ระบบ (Login Background Image)
              </h2>
            </div>
            {form.loginImageUrl ? (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#f5eef9] text-[#5c2484] border border-[#5c2484]/20">
                ✓ กำลังใช้รูปภาพที่กำหนดเอง
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#fafafa] text-[#777777] border border-[#eeeeee]">
                ใช้รูปภาพมาตรฐาน (Default)
              </span>
            )}
          </div>

          <p className="text-xs text-[#666666] leading-relaxed">
            คุณสามารถอัปโหลดรูปภาพห้องพักหรืออาคารของคุณเอง เพื่อนำไปแสดงเป็นภาพพื้นหลังขนาดใหญ่ในหน้าเข้าสู่ระบบ (Login) หรือเลือกใช้รูปภาพสไตล์บูทีคที่คัดสรรไว้
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* กล่อง Preview แบบจำลองหน้าล็อกอิน */}
            <div>
              <label className="block text-xs font-semibold text-[#222222] mb-1.5">
                ตัวอย่างการแสดงผลบนหน้า Login (Live Preview)
              </label>
              <div className="relative aspect-[16/10] rounded-xl overflow-hidden border border-[#eeeeee] shadow-sm bg-[#1a0926]">
                <img
                  src={
                    form.loginImageUrl ||
                    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80"
                  }
                  alt="Login Background Preview"
                  className="w-full h-full object-cover transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2a0e3d]/95 via-[#5c2484]/75 to-[#1a0926]/50" />
                <div className="absolute inset-0 p-4 flex flex-col justify-between text-white pointer-events-none">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Building2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="font-serif text-xs font-bold leading-tight uppercase tracking-wider">
                        {form.propertyName || "THE RETFORD RESIDENCE"}
                      </p>
                      <p className="text-[10px] text-white/80">
                        Property Management Suite
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-white/20 backdrop-blur-sm mb-1 border border-white/20">
                      ระบบบริหารห้องพักรายวัน & รายเดือน
                    </span>
                    <p className="font-serif text-sm font-semibold">
                      จัดการห้องพัก & บิลรายเดือนในที่เดียว
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* แผงควบคุมการอัปโหลดและเลือกภาพ */}
            <div className="space-y-3.5 text-xs flex flex-col justify-between">
              {/* ปุ่มอัปโหลดไฟล์ */}
              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">
                  1. อัปโหลดรูปภาพใหม่จากเครื่องของคุณ
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#cccccc] hover:border-[#5c2484] rounded-xl p-3.5 cursor-pointer bg-[#fafafa] hover:bg-[#f5eef9]/40 transition group">
                  <UploadCloud className="w-6 h-6 text-[#777777] group-hover:text-[#5c2484] transition" />
                  <span className="text-xs font-semibold text-[#5c2484] mt-1">
                    {uploadingLoginImage ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกไฟล์รูปภาพ (JPG / PNG / WebP)"}
                  </span>
                  <span className="text-[10px] text-[#777777]">
                    รูปจะถูกบันทึกลงในเครื่องเซิร์ฟเวอร์ของคุณอัตโนมัติ
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingLoginImage}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLoginImageUpload(file);
                    }}
                  />
                </label>
              </div>

              {/* ระบุ URL รูปภาพ หรือ ล้างรูปภาพ */}
              <div>
                <label className="block font-semibold text-[#222222] mb-1">
                  2. หรือระบุ URL รูปภาพโดยตรง
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... หรือ /uploads/..."
                    value={form.loginImageUrl}
                    onChange={(e) =>
                      setForm({ ...form, loginImageUrl: e.target.value })
                    }
                    className="flex-1 px-3 py-2 rounded-xl border border-[#cccccc] text-xs font-mono"
                  />
                  {form.loginImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm({ ...form, loginImageUrl: "" });
                        setMessage("รีเซ็ตรูปภาพหน้าเข้าสู่ระบบเป็นค่าเริ่มต้นแล้ว (อย่าลืมกดบันทึก)");
                      }}
                      className="px-3 py-2 rounded-xl border border-[#dddddd] bg-white hover:bg-[#f8e4e4] hover:text-[#ac2d2d] transition text-xs font-medium shrink-0"
                    >
                      ใช้รูปเริ่มต้น
                    </button>
                  )}
                </div>
              </div>

              {/* เลือกจากพรีเซ็ตสำเร็จรูป */}
              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">
                  3. หรือเลือกธีมรูปภาพบูทีคที่จัดเตรียมไว้
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_LOGIN_IMAGES.map((preset, idx) => {
                    const isSelected = form.loginImageUrl === preset.url || (!form.loginImageUrl && idx === 0);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, loginImageUrl: preset.url });
                        }}
                        className={`text-left p-2 rounded-xl border text-[11px] flex items-center gap-2 transition ${
                          isSelected
                            ? "border-[#5c2484] bg-[#f5eef9] font-semibold text-[#5c2484] ring-1 ring-[#5c2484]"
                            : "border-[#eeeeee] hover:border-[#cccccc] bg-white text-[#444444]"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* เปลี่ยนรหัสผ่านผู้ดูแลระบบ */}
        <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-[#eeeeee] pb-3">
            <KeyRound className="w-4 h-4 text-[#5c2484]" />
            <h2 className="font-semibold text-sm text-[#222222]">
              เปลี่ยนรหัสผ่านผู้ดูแลระบบ (Single Admin Password)
            </h2>
          </div>

          <div className="max-w-md text-xs">
            <label className="block font-medium text-[#222222] mb-1">
              รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
            </label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร..."
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-[#cccccc]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่าทั้งหมด"}</span>
          </button>
        </div>
      </form>

      {/* ระบบสำรองและกู้คืนข้อมูล (Backup & Restore) */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-[#eeeeee] pb-3">
          <HardDrive className="w-4 h-4 text-[#5c2484]" />
          <h2 className="font-semibold text-sm text-[#222222]">
            ระบบสำรองและกู้คืนข้อมูล (Export / Import Backup)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* ส่วนส่งออกข้อมูล (Export Backup) */}
          <div className="p-4 rounded-xl bg-[#fafafa] border border-[#eeeeee] space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#5c2484]" />
                <span>ส่งออกข้อมูลสำรอง (Export)</span>
              </h3>
              <p className="text-[#666666] leading-relaxed">
                ดาวน์โหลดข้อมูลทั้งหมดในระบบ (ห้องพัก, การจอง, สัญญา, มิเตอร์, บิล,
                ลูกค้า, และการตั้งค่า) เก็บไว้ในเครื่องหรือย้ายไปเครื่องอื่น
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <a
                href="/api/backup?format=json"
                download
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white font-semibold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดสำรอง (.json)</span>
              </a>

              <a
                href="/api/backup?format=sqlite"
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#dddddd] bg-white text-[#444444] hover:bg-[#f5eef9] hover:text-[#5c2484] font-medium transition"
              >
                <Database className="w-3.5 h-3.5" />
                <span>ดาวน์โหลด SQLite (.db)</span>
              </a>
            </div>
          </div>

          {/* ส่วนนำเข้าข้อมูลสำรอง (Import & Restore) */}
          <form
            onSubmit={handleImportBackup}
            className="p-4 rounded-xl bg-[#fafafa] border border-[#eeeeee] space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-1.5">
              <h3 className="font-bold text-sm text-[#222222] flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#5c2484]" />
                <span>นำเข้าและกู้คืนข้อมูล (Import)</span>
              </h3>
              <p className="text-[#666666] leading-relaxed">
                เลือกไฟล์สำรองข้อมูล JSON เพื่อนำเข้า (ระบบจะสำรองข้อมูลเดิมเก็บไว้ใน{" "}
                <code className="text-[#5c2484] font-semibold">
                  prisma/backups/
                </code>{" "}
                ให้อัตโนมัติก่อนเริ่มกู้คืน)
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <input
                type="file"
                accept=".json"
                onChange={(e) =>
                  setSelectedBackupFile(e.target.files?.[0] || null)
                }
                className="w-full text-xs text-[#555555] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#f5eef9] file:text-[#5c2484] hover:file:bg-[#eadcf3] cursor-pointer"
              />

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!selectedBackupFile || importing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#222222] hover:bg-black text-white font-semibold transition disabled:opacity-40 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {importing ? "กำลังกู้คืนข้อมูล..." : "กู้คืนข้อมูลจากไฟล์"}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* จัดการข้อมูลตัวอย่าง 10 ห้อง */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-[#eeeeee] pb-3">
          <Database className="w-4 h-4 text-[#5c2484]" />
          <h2 className="font-semibold text-sm text-[#222222]">
            จัดการข้อมูลตัวอย่างสำหรับทดสอบ (10 ห้องพักตัวอย่าง)
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <p className="text-[#222222] font-medium">
              ขณะนี้มีห้องพักตัวอย่างในระบบจำนวน{" "}
              <strong className="text-[#5c2484]">{sampleRoomsCount} ห้อง</strong>
            </p>
            <p className="text-[#666666]">
              คุณสามารถลบข้อมูลตัวอย่างทั้งหมดออกในคลิกเดียวเมื่อต้องการเริ่มใช้งานจริง
              หรือกดสร้างข้อมูลตัวอย่างใหม่เพื่อทดสอบได้ตลอดเวลา
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSampleAction("RESTORE_SAMPLE")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#5c2484] text-[#5c2484] hover:bg-[#f5eef9] font-semibold transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>รีเซ็ต/โหลดข้อมูลตัวอย่าง 10 ห้อง</span>
            </button>

            <button
              type="button"
              disabled={saving || sampleRoomsCount === 0}
              onClick={() => handleSampleAction("CLEAR_SAMPLE")}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#f8e4e4] text-[#ac2d2d] hover:bg-[#f3d1d1] font-semibold transition disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
              <span>ลบข้อมูลตัวอย่างทั้งหมด</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
