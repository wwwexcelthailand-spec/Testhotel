"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Download,
  Wallet,
  TrendingUp,
  AlertCircle,
  BedDouble,
  Droplets,
  Zap,
  Clock,
  CheckCircle2,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  formatMonthThai,
  formatThaiDate,
  toDateString,
} from "@/lib/utils";

interface ReportData {
  selectedMonth: string;
  settings: {
    propertyName: string;
    lateFeePerDay: number;
  };
  revenue: {
    totalRevenue: number;
    dailyRevenue: number;
    monthlyPaidRevenue: number;
    monthlyTotalBilled: number;
    breakdown: {
      rentRevenue: number;
      waterRevenue: number;
      electricRevenue: number;
      lateFeeRevenue: number;
      otherRevenue: number;
    };
  };
  occupancy: {
    averageOccupancyRate: number;
    totalOccupiedDays: number;
    totalRoomCapacityDays: number;
    daysInMonth: number;
    roomOccupancyList: Array<{
      roomId: string;
      roomNumber: string;
      roomName: string;
      floor: number;
      roomType: string;
      occupiedDays: number;
      daysInMonth: number;
      occupancyRate: number;
    }>;
  };
  unpaid: {
    totalOutstanding: number;
    unpaidCount: number;
    unpaidInvoices: Array<{
      id: string;
      invoiceNumber: string;
      roomNumber: string;
      tenantName: string;
      tenantPhone: string;
      billingMonth: string;
      dueDate: string;
      totalAmount: number;
      paidAmount: number;
      outstandingAmount: number;
      lateDays: number;
      lateFeeAmount: number;
      status: string;
    }>;
  };
  monthlyTrends: Array<{
    month: string;
    dailyRevenue: number;
    monthlyRevenue: number;
    totalRevenue: number;
  }>;
}

function ReportsContent() {
  const todayStr = toDateString(new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => todayStr.slice(0, 7));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?month=${month}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(selectedMonth);
  }, [selectedMonth, loadReport]);

  const maxTrend = data?.monthlyTrends
    ? Math.max(1, ...data.monthlyTrends.map((t) => t.totalRevenue))
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#222222]">
            รายงานผลประกอบการ & สถิติ
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            สรุปรายได้ Occupancy อัตราการเข้าพัก และยอดค้างชำระ พร้อมส่งออกเป็นไฟล์
            Excel (.xlsx)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* เลือกเดือน */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#dddddd] bg-[#fafafa]">
            <Calendar className="w-4 h-4 text-[#5c2484]" />
            <input
              type="month"
              aria-label="เลือกรอบเดือนรายงาน"
              value={selectedMonth}
              onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-[#222222] focus:outline-none"
            />
          </div>

          {/* ปุ่มส่งออก Excel */}
          <a
            href={`/api/reports/export?month=${selectedMonth}`}
            download={`room-manager-report-${selectedMonth}.xlsx`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-16 text-center text-xs text-[#777777]">
          กำลังประมวลผลข้อมูลรายงานและสถิติ...
        </div>
      ) : (
        <>
          {/* 4 การ์ดสรุปตัวเลขหลัก */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#666666]">
                <span className="text-xs font-medium">รายได้รวมเดือนนี้</span>
                <div className="w-8 h-8 rounded-lg bg-[#f5eef9] flex items-center justify-center text-[#5c2484]">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-bold text-[#5c2484]">
                {formatCurrency(data.revenue.totalRevenue)}
              </p>
              <p className="text-[11px] text-[#666666]">
                รายวัน {formatCurrency(data.revenue.dailyRevenue)} · รายเดือน{" "}
                {formatCurrency(data.revenue.monthlyPaidRevenue)}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#666666]">
                <span className="text-xs font-medium">อัตราเข้าพักเฉลี่ย</span>
                <div className="w-8 h-8 rounded-lg bg-[#cef5ca] flex items-center justify-center text-[#114e0b]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-bold text-[#114e0b]">
                {data.occupancy.averageOccupancyRate}%
              </p>
              <p className="text-[11px] text-[#666666]">
                เข้าพัก {data.occupancy.totalOccupiedDays} /{" "}
                {data.occupancy.totalRoomCapacityDays} ห้อง-คืน
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#666666]">
                <span className="text-xs font-medium">ยอดบิลค้างชำระ</span>
                <div className="w-8 h-8 rounded-lg bg-[#f8e4e4] flex items-center justify-center text-[#ac2d2d]">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-bold text-[#ac2d2d]">
                {formatCurrency(data.unpaid.totalOutstanding)}
              </p>
              <p className="text-[11px] text-[#666666]">
                จำนวน {data.unpaid.unpaidCount} บิลค้างชำระ
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#666666]">
                <span className="text-xs font-medium">ค่าน้ำ-ค่าไฟที่เรียกเก็บ</span>
                <div className="w-8 h-8 rounded-lg bg-[#fcf8d8] flex items-center justify-center text-[#5e5515]">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <p className="font-serif text-2xl font-bold text-[#222222]">
                {formatCurrency(
                  data.revenue.breakdown.waterRevenue +
                    data.revenue.breakdown.electricRevenue
                )}
              </p>
              <p className="text-[11px] text-[#666666]">
                น้ำ {formatCurrency(data.revenue.breakdown.waterRevenue)} · ไฟ{" "}
                {formatCurrency(data.revenue.breakdown.electricRevenue)}
              </p>
            </div>
          </div>

          {/* สัดส่วนรายได้ & แนวโน้มย้อนหลัง 6 เดือน */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* รายละเอียดสัดส่วนรายได้ */}
            <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-[#222222] border-b border-[#eeeeee] pb-3">
                สัดส่วนโครงสร้างรายรับ ประจำเดือน {formatMonthThai(selectedMonth)}
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-[#222222]">
                      1. ค่าเช่าห้องพักรายวัน (Daily Bookings)
                    </span>
                    <span className="font-bold text-[#5c2484]">
                      {formatCurrency(data.revenue.dailyRevenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eeeeee] overflow-hidden">
                    <div
                      className="h-full bg-[#5c2484] rounded-full"
                      style={{
                        width: `${
                          data.revenue.totalRevenue > 0
                            ? (data.revenue.dailyRevenue /
                                data.revenue.totalRevenue) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-[#222222]">
                      2. ค่าเช่าห้องพักรายเดือน (Monthly Rent)
                    </span>
                    <span className="font-bold text-[#222222]">
                      {formatCurrency(data.revenue.breakdown.rentRevenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eeeeee] overflow-hidden">
                    <div
                      className="h-full bg-[#222222] rounded-full"
                      style={{
                        width: `${
                          data.revenue.totalRevenue > 0
                            ? (data.revenue.breakdown.rentRevenue /
                                data.revenue.totalRevenue) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-[#222222]">
                      3. ค่าน้ำประปา (Water Utility)
                    </span>
                    <span className="font-bold text-[#2d62ff]">
                      {formatCurrency(data.revenue.breakdown.waterRevenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eeeeee] overflow-hidden">
                    <div
                      className="h-full bg-[#2d62ff] rounded-full"
                      style={{
                        width: `${
                          data.revenue.totalRevenue > 0
                            ? (data.revenue.breakdown.waterRevenue /
                                data.revenue.totalRevenue) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-[#222222]">
                      4. ค่าไฟฟ้า (Electricity Utility)
                    </span>
                    <span className="font-bold text-[#5e5515]">
                      {formatCurrency(data.revenue.breakdown.electricRevenue)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#eeeeee] overflow-hidden">
                    <div
                      className="h-full bg-[#b49b12] rounded-full"
                      style={{
                        width: `${
                          data.revenue.totalRevenue > 0
                            ? (data.revenue.breakdown.electricRevenue /
                                data.revenue.totalRevenue) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {data.revenue.breakdown.lateFeeRevenue > 0 && (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-[#ac2d2d]">
                        5. ค่าปรับชำระล่าช้า (Late Fees)
                      </span>
                      <span className="font-bold text-[#ac2d2d]">
                        {formatCurrency(data.revenue.breakdown.lateFeeRevenue)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#eeeeee] overflow-hidden">
                      <div
                        className="h-full bg-[#ac2d2d] rounded-full"
                        style={{
                          width: `${
                            data.revenue.totalRevenue > 0
                              ? (data.revenue.breakdown.lateFeeRevenue /
                                  data.revenue.totalRevenue) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* แนวโน้มรายได้ย้อนหลัง 6 เดือน */}
            <div className="bg-white rounded-2xl border border-[#eeeeee] p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#222222] border-b border-[#eeeeee] pb-3">
                  แนวโน้มรายรับย้อนหลัง 6 เดือน
                </h2>
                <p className="text-xs text-[#666666] mt-2">
                  เปรียบเทียบผลประกอบการรายวันและรายเดือนย้อนหลัง
                </p>
              </div>

              <div className="h-48 flex items-end justify-between gap-3 pt-6">
                {data.monthlyTrends.map((t) => {
                  const heightPct = Math.round((t.totalRevenue / maxTrend) * 100);
                  const isCurrent = t.month === selectedMonth;

                  return (
                    <div
                      key={t.month}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end group"
                    >
                      <div className="text-[10px] text-[#666666] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {formatCurrency(t.totalRevenue)}
                      </div>
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          isCurrent
                            ? "bg-[#5c2484]"
                            : "bg-[#eadcf3] hover:bg-[#5c2484]/70"
                        }`}
                        style={{ height: `${Math.max(12, heightPct)}%` }}
                      />
                      <span
                        className={`text-[11px] font-semibold truncate ${
                          isCurrent ? "text-[#5c2484]" : "text-[#777777]"
                        }`}
                      >
                        {formatMonthThai(t.month).split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ตารางอัตราการเข้าพักแยกรายห้อง (Occupancy by Room) */}
          <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-[#222222]">
                  อัตราการเข้าพักแยกรายห้อง (Occupancy by Room)
                </h2>
                <p className="text-xs text-[#666666]">
                  คำนวณจากจำนวนวันที่ห้องถูกใช้งานทั้งรายวันและสัญญารายเดือน
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#cef5ca] text-[#114e0b]">
                เฉลี่ยรวม {data.occupancy.averageOccupancyRate}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {data.occupancy.roomOccupancyList.map((rm) => (
                <div
                  key={rm.roomId}
                  className="p-4 rounded-xl border border-[#eeeeee] bg-[#fafafa] space-y-2 hover:bg-white hover:shadow-sm transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#5c2484] text-white font-bold text-xs">
                      ห้อง {rm.roomNumber}
                    </span>
                    <span className="font-serif text-base font-bold text-[#5c2484]">
                      {rm.occupancyRate}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#222222] truncate">
                    {rm.roomName}
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    เข้าพัก {rm.occupiedDays} / {rm.daysInMonth} วัน
                  </p>
                  <div className="h-1.5 rounded-full bg-[#dddddd] overflow-hidden">
                    <div
                      className="h-full bg-[#5c2484] rounded-full"
                      style={{ width: `${rm.occupancyRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ตารางลูกหนี้ค้างชำระ (Overdue & Unpaid Receivables) */}
          <div className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#eeeeee] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#ac2d2d]" />
                <h2 className="font-serif text-lg font-bold text-[#222222]">
                  รายการลูกหนี้ & บิลค้างชำระ (Overdue Receivables)
                </h2>
              </div>
              <span className="text-xs font-bold text-[#ac2d2d]">
                ยอดค้างรวม {formatCurrency(data.unpaid.totalOutstanding)} (
                {data.unpaid.unpaidCount} รายการ)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#eeeeee] bg-[#fafafa] text-[11px] font-semibold uppercase text-[#666666]">
                    <th className="py-3 px-4">เลขที่บิล / ห้อง</th>
                    <th className="py-3 px-4">ผู้เช่า</th>
                    <th className="py-3 px-4">รอบเดือน</th>
                    <th className="py-3 px-4">วันครบกำหนด</th>
                    <th className="py-3 px-4">เกินกำหนด (วัน)</th>
                    <th className="py-3 px-4">ค่าปรับล่าช้า</th>
                    <th className="py-3 px-4">ยอดค้างชำระ</th>
                    <th className="py-3 px-4 text-right">เปิดดู</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eeeeee]">
                  {data.unpaid.unpaidInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#777777]">
                        ยอดเยี่ยม! ไม่มีบิลค้างชำระในขณะนี้
                      </td>
                    </tr>
                  ) : (
                    data.unpaid.unpaidInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#fafafa]">
                        <td className="py-3 px-4 font-semibold text-[#222222]">
                          <span className="px-2 py-0.5 rounded bg-[#f8e4e4] text-[#ac2d2d] font-bold mr-1.5">
                            ห้อง {inv.roomNumber}
                          </span>
                          <span className="font-mono text-[11px]">
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#222222]">
                            {inv.tenantName}
                          </p>
                          <p className="text-[#666666] text-[11px]">
                            {inv.tenantPhone || "-"}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {formatMonthThai(inv.billingMonth)}
                        </td>
                        <td className="py-3 px-4 text-[#666666]">
                          {formatThaiDate(inv.dueDate)}
                        </td>
                        <td className="py-3 px-4">
                          {inv.lateDays > 0 ? (
                            <span className="text-[#ac2d2d] font-bold">
                              เกิน {inv.lateDays} วัน
                            </span>
                          ) : (
                            <span className="text-[#666666]">ยังไม่เกิน</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#ac2d2d] font-semibold">
                          {formatCurrency(inv.lateFeeAmount)}
                        </td>
                        <td className="py-3 px-4 font-serif text-sm font-bold text-[#ac2d2d]">
                          {formatCurrency(inv.outstandingAmount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href="/invoices"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f5eef9] text-[#5c2484] font-medium"
                          >
                            <span>จัดการบิล</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดรายงานและสถิติ...
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
