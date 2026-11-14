"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Gauge,
  Droplets,
  Zap,
  Save,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Table as TableIcon,
  Sparkles,
  Info,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  formatMonthThai,
  toDateString,
} from "@/lib/utils";

interface MeterItem {
  roomId: string;
  roomNumber: string;
  roomName: string;
  floor: number;
  roomStatus: string;
  hasActiveLease: boolean;
  tenantName: string;
  billingMonth: string;
  prevWater: number;
  currWater: number;
  waterUnits: number;
  prevElectric: number;
  currElectric: number;
  electricUnits: number;
  recordedAt: string | null;
  isRecorded: boolean;
}

export default function MeterPage() {
  const [billingMonth, setBillingMonth] = useState(() =>
    toDateString(new Date()).slice(0, 7)
  );
  const [items, setItems] = useState<MeterItem[]>([]);
  const [rates, setRates] = useState<{ waterRate: number; electricRate: number }>({
    waterRate: 18,
    electricRate: 8,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // สลับมุมมอง: "TABLE" (ตารางรวม) หรือ "MOBILE_CARD" (การ์ดเดินจดทีละห้อง)
  const [viewMode, setViewMode] = useState<"TABLE" | "MOBILE_CARD">("MOBILE_CARD");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const loadMeterData = useCallback(async (month: string) => {
    setLoading(true);
    setSavedSuccess(false);
    try {
      const res = await fetch(`/api/meter?month=${month}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.settings) {
          setRates(data.settings);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeterData(billingMonth);
  }, [billingMonth, loadMeterData]);

  function handleWaterChange(roomId: string, value: string) {
    const val = value === "" ? 0 : Number(value);
    setItems((prev) =>
      prev.map((item) => {
        if (item.roomId !== roomId) return item;
        const currWater = val;
        const waterUnits = Math.max(0, currWater - item.prevWater);
        return { ...item, currWater, waterUnits };
      })
    );
  }

  function handleElectricChange(roomId: string, value: string) {
    const val = value === "" ? 0 : Number(value);
    setItems((prev) =>
      prev.map((item) => {
        if (item.roomId !== roomId) return item;
        const currElectric = val;
        const electricUnits = Math.max(0, currElectric - item.prevElectric);
        return { ...item, currElectric, electricUnits };
      })
    );
  }

  async function handleSaveAll() {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billingMonth,
          readings: items.map((it) => ({
            roomId: it.roomId,
            prevWater: it.prevWater,
            currWater: it.currWater,
            prevElectric: it.prevElectric,
            currElectric: it.currElectric,
          })),
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        await loadMeterData(billingMonth);
      }
    } finally {
      setSaving(false);
    }
  }

  const activeLeaseItems = useMemo(
    () => items.filter((it) => it.hasActiveLease),
    [items]
  );

  const floors = useMemo(() => {
    const map = new Map<number, MeterItem[]>();
    items.forEach((item) => {
      const list = map.get(item.floor) || [];
      list.push(item);
      map.set(item.floor, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [items]);

  const recordedCount = useMemo(
    () =>
      items.filter(
        (it) => it.isRecorded || it.currWater > 0 || it.currElectric > 0
      ).length,
    [items]
  );

  const currentCardItem = items[currentStepIndex] || items[0];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#222222]">
            จดมิเตอร์น้ำ-ไฟรายเดือน
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            กรอกเลขมิเตอร์ได้รวดเร็วบนมือถือ · คำนวณหน่วยและค่าบริการอัตโนมัติ (น้ำ{" "}
            <strong>{rates.waterRate} บ./หน่วย</strong>, ไฟ{" "}
            <strong>{rates.electricRate} บ./หน่วย</strong>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* เลือกเดือน */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dddddd] bg-[#fafafa]">
            <Calendar className="w-4 h-4 text-[#5c2484]" />
            <input
              type="month"
              aria-label="เลือกรอบเดือนที่จดมิเตอร์"
              value={billingMonth}
              onChange={(e) => e.target.value && setBillingMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#222222] focus:outline-none"
            />
          </div>

          {/* สลับโหมดตาราง / โหมดการ์ดมือถือ */}
          <div className="flex items-center rounded-xl border border-[#dddddd] bg-[#fafafa] p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("MOBILE_CARD")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === "MOBILE_CARD"
                  ? "bg-[#5c2484] text-white shadow-sm"
                  : "text-[#666666] hover:text-[#222222]"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>การ์ดเดินจด</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium transition ${
                viewMode === "TABLE"
                  ? "bg-[#5c2484] text-white shadow-sm"
                  : "text-[#666666] hover:text-[#222222]"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>ตารางรวม</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "กำลังบันทึก..." : "บันทึกมิเตอร์ทั้งหมด"}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-[#cef5ca] text-[#114e0b] text-xs font-semibold flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              บันทึกข้อมูลมิเตอร์ประจำเดือน {formatMonthThai(billingMonth)}{" "}
              เรียบร้อยแล้ว! (หากมีบิลของเดือนนี้ ยอดค่าน้ำไฟจะถูกอัปเดตอัตโนมัติ)
            </span>
          </div>
        </div>
      )}

      {/* สรุปอัตราค่าบริการ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-white p-4 rounded-xl border border-[#eeeeee] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#d9e5ff] flex items-center justify-center text-[#2d62ff]">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[#666666]">อัตราค่าน้ำประปา</p>
            <p className="text-base font-bold text-[#222222]">
              {rates.waterRate} บาท / หน่วย
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#eeeeee] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#fcf8d8] flex items-center justify-center text-[#5e5515]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[#666666]">อัตราค่าไฟฟ้า</p>
            <p className="text-base font-bold text-[#222222]">
              {rates.electricRate} บาท / หน่วย
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#eeeeee] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#f5eef9] flex items-center justify-center text-[#5c2484]">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[#666666]">ห้องที่มีผู้เช่ารายเดือน</p>
            <p className="text-base font-bold text-[#5c2484]">
              {activeLeaseItems.length} / {items.length} ห้อง
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดข้อมูลมิเตอร์ประจำเดือน...
        </div>
      ) : viewMode === "MOBILE_CARD" && currentCardItem ? (
        /* โหมดการ์ดเดินจดทีละห้อง (กว้างเท่ากับกรอบด้านบน & เลือกห้องแบบกริดแยกชั้น ไม่ต้องเลื่อน) */
        <div className="w-full space-y-5">
          {/* แผงเลือกห้องพักทั้งหมด (แสดงครบทุกห้อง ไม่ต้องเลื่อนแถบแนวนอน) */}
          <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeeee] pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#5c2484]" />
                <h3 className="font-semibold text-sm text-[#222222]">
                  เลือกห้องพักสำหรับจดมิเตอร์
                </h3>
                <span className="text-xs text-[#777777]">
                  (คลิกเลือกห้องได้ทันที ไม่ต้องเลื่อนแถบ)
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f5eef9] text-[#5c2484]">
                  จดแล้ว {recordedCount} / {items.length} ห้อง
                </span>

                {/* ดรอปดาวน์เลือกห้องด่วน */}
                <select
                  aria-label="เลือกห้องพักสำหรับจดมิเตอร์"
                  value={currentStepIndex}
                  onChange={(e) => setCurrentStepIndex(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-[#dddddd] bg-[#fafafa] text-xs font-semibold text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#5c2484]"
                >
                  {items.map((room, idx) => (
                    <option key={room.roomId} value={idx}>
                      ห้อง {room.roomNumber} - {room.roomName} (ชั้น {room.floor})
                      {room.isRecorded ? " ✓ จดแล้ว" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* รายการห้องพักแยกตามชั้น (เห็นครบทุกห้องในหน้าเดียว) */}
            <div className="space-y-2.5">
              {floors.map(([floorNum, floorRooms]) => (
                <div
                  key={floorNum}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs"
                >
                  <span className="font-semibold text-[#666666] w-14 shrink-0">
                    ชั้น {floorNum}:
                  </span>
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    {floorRooms.map((room) => {
                      const idx = items.findIndex((i) => i.roomId === room.roomId);
                      const isSelected = currentStepIndex === idx;
                      return (
                        <button
                          key={room.roomId}
                          type="button"
                          onClick={() => setCurrentStepIndex(idx)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs ${
                            isSelected
                              ? "bg-[#5c2484] text-white shadow-sm ring-2 ring-[#5c2484]/30 scale-102"
                              : room.isRecorded
                              ? "bg-[#cef5ca] text-[#114e0b] border border-[#114e0b]/25 hover:bg-[#bbf0b6]"
                              : "bg-white border border-[#dddddd] text-[#333333] hover:border-[#5c2484] hover:bg-[#f5eef9]"
                          }`}
                        >
                          <span>ห้อง {room.roomNumber}</span>
                          {room.isRecorded ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#114e0b]" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#cccccc]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ดจดมิเตอร์ห้องปัจจุบัน (กว้างเท่ากรอบด้านบน & ช่องค่าน้ำค่าไฟสมดุลกัน) */}
          <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#eeeeee] pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="px-3.5 py-1 rounded-xl bg-[#5c2484] text-white font-bold text-base shadow-xs">
                    ห้อง {currentCardItem.roomNumber}
                  </span>
                  <span className="font-serif text-2xl font-bold text-[#222222]">
                    {currentCardItem.roomName}
                  </span>
                </div>
                <p className="text-xs text-[#666666] mt-1.5">
                  ผู้เช่ารายเดือน:{" "}
                  <strong className="text-[#222222]">
                    {currentCardItem.tenantName || "ห้องว่าง / เช่ารายวัน"}
                  </strong>{" "}
                  · ชั้น {currentCardItem.floor} · สถานะห้อง: {currentCardItem.roomStatus}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-[#777777]">ลำดับห้อง</span>
                <span className="px-3 py-1 rounded-xl bg-[#fafafa] border border-[#dddddd] font-bold text-sm text-[#5c2484]">
                  {currentStepIndex + 1} / {items.length}
                </span>
              </div>
            </div>

            {/* กล่องกรอกค่าน้ำและค่าไฟ (เท่ากัน สมดุลกัน ซ้าย-ขวา บนจอใหญ่ หรือต่อกันบนจอมือถือ) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ส่วนจดมิเตอร์น้ำ */}
              <div className="p-5 rounded-2xl bg-[#fafafa] border border-[#eeeeee] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2d62ff]">
                    <div className="w-8 h-8 rounded-xl bg-[#d9e5ff] flex items-center justify-center shrink-0">
                      <Droplets className="w-4 h-4 text-[#2d62ff]" />
                    </div>
                    <div>
                      <p className="text-sm">มิเตอร์น้ำประปา</p>
                      <p className="text-[11px] font-normal text-[#555555]">
                        อัตรา {rates.waterRate} บาท / หน่วย
                      </p>
                    </div>
                  </div>
                  <div className="text-right bg-white px-3 py-1 rounded-xl border border-[#eeeeee]">
                    <span className="text-[10px] text-[#777777] block">เลขเดือนก่อน</span>
                    <strong className="font-mono text-xs text-[#222222]">
                      {currentCardItem.prevWater}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-end">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#333333]">
                      เลขมิเตอร์ปัจจุบัน (ครั้งนี้) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min={currentCardItem.prevWater}
                      value={currentCardItem.currWater || ""}
                      onChange={(e) =>
                        handleWaterChange(currentCardItem.roomId, e.target.value)
                      }
                      placeholder="กรอกเลขมิเตอร์..."
                      className="w-full h-11 px-3.5 rounded-xl border border-[#cccccc] font-mono text-base font-bold text-[#222222] bg-white focus:outline-none focus:ring-2 focus:ring-[#2d62ff]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#555555]">
                      คำนวณการใช้น้ำจริง
                    </label>
                    <div className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#eeeeee] flex items-center justify-between">
                      <span className="text-xs text-[#666666]">ใช้น้ำ:</span>
                      <p className="font-bold text-sm text-[#2d62ff]">
                        {currentCardItem.waterUnits} หน่วย (
                        {formatCurrency(currentCardItem.waterUnits * rates.waterRate)})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ส่วนจดมิเตอร์ไฟ */}
              <div className="p-5 rounded-2xl bg-[#fafafa] border border-[#eeeeee] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#b49b12]">
                    <div className="w-8 h-8 rounded-xl bg-[#fcf8d8] flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-[#b49b12]" />
                    </div>
                    <div>
                      <p className="text-sm text-[#5e5515]">มิเตอร์ไฟฟ้า</p>
                      <p className="text-[11px] font-normal text-[#555555]">
                        อัตรา {rates.electricRate} บาท / หน่วย
                      </p>
                    </div>
                  </div>
                  <div className="text-right bg-white px-3 py-1 rounded-xl border border-[#eeeeee]">
                    <span className="text-[10px] text-[#777777] block">เลขเดือนก่อน</span>
                    <strong className="font-mono text-xs text-[#222222]">
                      {currentCardItem.prevElectric}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs items-end">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#333333]">
                      เลขมิเตอร์ปัจจุบัน (ครั้งนี้) *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min={currentCardItem.prevElectric}
                      value={currentCardItem.currElectric || ""}
                      onChange={(e) =>
                        handleElectricChange(currentCardItem.roomId, e.target.value)
                      }
                      placeholder="กรอกเลขมิเตอร์..."
                      className="w-full h-11 px-3.5 rounded-xl border border-[#cccccc] font-mono text-base font-bold text-[#222222] bg-white focus:outline-none focus:ring-2 focus:ring-[#b49b12]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#555555]">
                      คำนวณการใช้ไฟจริง
                    </label>
                    <div className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#eeeeee] flex items-center justify-between">
                      <span className="text-xs text-[#666666]">ใช้ไฟ:</span>
                      <p className="font-bold text-sm text-[#5e5515]">
                        {currentCardItem.electricUnits} หน่วย (
                        {formatCurrency(
                          currentCardItem.electricUnits * rates.electricRate
                        )}
                        )
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ยอดรวมค่าน้ำ+ไฟของห้องนี้ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#f5eef9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#5c2484]/20">
              <div>
                <span className="text-sm text-[#5c2484] font-bold block">
                  รวมค่าน้ำ + ค่าไฟห้อง {currentCardItem.roomNumber}:
                </span>
                <span className="text-xs text-[#666666]">
                  น้ำ {formatCurrency(currentCardItem.waterUnits * rates.waterRate)} +
                  ไฟ {formatCurrency(currentCardItem.electricUnits * rates.electricRate)}
                </span>
              </div>
              <span className="font-serif text-2xl font-bold text-[#5c2484]">
                {formatCurrency(
                  currentCardItem.waterUnits * rates.waterRate +
                    currentCardItem.electricUnits * rates.electricRate
                )}
              </span>
            </div>

            {/* ปุ่มเลื่อนห้องก่อนหน้า / บันทึก / ถัดไป */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={currentStepIndex === 0}
                onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#dddddd] text-xs font-semibold text-[#555555] hover:bg-[#fafafa] disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ห้องก่อนหน้า</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold shadow-sm transition"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกมิเตอร์ทั้งหมด</span>
              </button>

              <button
                type="button"
                disabled={currentStepIndex === items.length - 1}
                onClick={() =>
                  setCurrentStepIndex((prev) =>
                    Math.min(items.length - 1, prev + 1)
                  )
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#dddddd] text-xs font-semibold text-[#555555] hover:bg-[#fafafa] disabled:opacity-40 transition"
              >
                <span>ห้องถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* โหมดตารางรวมทุกห้อง (Full Table View) */
        <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#eeeeee] bg-[#fafafa] text-[11px] font-semibold uppercase text-[#666666]">
                  <th className="py-3.5 px-4">ห้องพัก</th>
                  <th className="py-3.5 px-4">ผู้เช่า</th>
                  <th className="py-3.5 px-3">น้ำเดิม</th>
                  <th className="py-3.5 px-3">น้ำใหม่ *</th>
                  <th className="py-3.5 px-3">หน่วยน้ำ (บ.)</th>
                  <th className="py-3.5 px-3">ไฟเดิม</th>
                  <th className="py-3.5 px-3">ไฟใหม่ *</th>
                  <th className="py-3.5 px-3">หน่วยไฟ (บ.)</th>
                  <th className="py-3.5 px-4 text-right">รวมน้ำ-ไฟ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eeeeee]">
                {items.map((room) => {
                  const waterCost = room.waterUnits * rates.waterRate;
                  const electricCost = room.electricUnits * rates.electricRate;
                  const totalUtility = waterCost + electricCost;

                  return (
                    <tr key={room.roomId} className="hover:bg-[#fafafa]">
                      <td className="py-3 px-4 font-bold text-sm text-[#222222]">
                        <span className="px-2 py-0.5 rounded bg-[#f5eef9] text-[#5c2484]">
                          {room.roomNumber}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#444444]">
                        {room.tenantName}
                      </td>
                      <td className="py-3 px-3 text-[#777777] font-mono">
                        {room.prevWater}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="1"
                          min={room.prevWater}
                          value={room.currWater || ""}
                          onChange={(e) =>
                            handleWaterChange(room.roomId, e.target.value)
                          }
                          className="w-24 px-2 py-1.5 rounded-lg border border-[#cccccc] font-mono text-xs font-semibold"
                        />
                      </td>
                      <td className="py-3 px-3 text-[#2d62ff] font-medium">
                        {room.waterUnits} ({formatCurrency(waterCost)})
                      </td>
                      <td className="py-3 px-3 text-[#777777] font-mono">
                        {room.prevElectric}
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="number"
                          step="1"
                          min={room.prevElectric}
                          value={room.currElectric || ""}
                          onChange={(e) =>
                            handleElectricChange(room.roomId, e.target.value)
                          }
                          className="w-24 px-2 py-1.5 rounded-lg border border-[#cccccc] font-mono text-xs font-semibold"
                        />
                      </td>
                      <td className="py-3 px-3 text-[#5e5515] font-medium">
                        {room.electricUnits} ({formatCurrency(electricCost)})
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#5c2484]">
                        {formatCurrency(totalUtility)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
