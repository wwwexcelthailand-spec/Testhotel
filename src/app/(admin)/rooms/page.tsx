"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
  Lock,
  CalendarCheck,
} from "lucide-react";
import { formatCurrency, ROOM_STATUS_MAP } from "@/lib/utils";

interface RoomItem {
  id: string;
  number: string;
  name: string;
  floor: number;
  roomType: string;
  dailyRate: number;
  monthlyRate: number;
  status: string;
  imageUrl: string;
  notes: string;
  isSample: boolean;
  leases?: Array<{ id: string; tenantName: string; endDate: string }>;
  bookings?: Array<{
    id: string;
    guestName: string;
    checkInDate: string;
    checkOutDate: string;
  }>;
}

const PRESET_ROOM_IMAGES = [
  {
    label: "Georgian Boutique",
    url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Garden Twin",
    url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Deluxe King",
    url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Plum Suite",
    url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Modern Loft",
    url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
  },
];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFloor, setFilterFloor] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    number: "",
    name: "",
    floor: "1",
    roomType: "Standard",
    dailyRate: "850",
    monthlyRate: "6500",
    status: "AVAILABLE",
    imageUrl: PRESET_ROOM_IMAGES[0].url,
    notes: "",
  });

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  function openCreateModal() {
    setEditingRoom(null);
    setErrorMsg("");
    setForm({
      number: "",
      name: "",
      floor: "1",
      roomType: "Standard",
      dailyRate: "850",
      monthlyRate: "6500",
      status: "AVAILABLE",
      imageUrl: PRESET_ROOM_IMAGES[0].url,
      notes: "",
    });
    setModalOpen(true);
  }

  function openEditModal(room: RoomItem) {
    setEditingRoom(room);
    setErrorMsg("");
    setForm({
      number: room.number,
      name: room.name,
      floor: String(room.floor),
      roomType: room.roomType,
      dailyRate: String(room.dailyRate),
      monthlyRate: String(room.monthlyRate),
      status: room.status,
      imageUrl: room.imageUrl || PRESET_ROOM_IMAGES[0].url,
      notes: room.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSaveRoom(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    try {
      const url = editingRoom ? `/api/rooms/${editingRoom.id}` : "/api/rooms";
      const method = editingRoom ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: form.number,
          name: form.name,
          floor: Number(form.floor),
          roomType: form.roomType,
          dailyRate: Number(form.dailyRate),
          monthlyRate: Number(form.monthlyRate),
          status: form.status,
          imageUrl: form.imageUrl,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "บันทึกข้อมูลไม่สำเร็จ");
        setSaving(false);
        return;
      }
      setModalOpen(false);
      await loadRooms();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRoom(room: RoomItem) {
    if (
      !window.confirm(
        `ต้องการลบห้อง ${room.number} (${room.name}) ใช่หรือไม่? การจองและสัญญาของห้องนี้จะถูกลบไปด้วย`
      )
    ) {
      return;
    }
    await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    await loadRooms();
  }

  async function handleStatusChange(roomId: string, status: string) {
    await fetch(`/api/rooms/${roomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadRooms();
  }

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort(
    (a, b) => a - b
  );

  const filteredRooms = rooms.filter((r) => {
    if (filterFloor !== "ALL" && String(r.floor) !== filterFloor) return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#eeeeee] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#222222]">
            จัดการห้องพัก ({rooms.length} ห้อง)
          </h1>
          <p className="text-xs text-[#666666] mt-0.5">
            กำหนดเลขห้อง ชื่อห้อง ชั้น ราคารายวัน ราคารายเดือน รูปภาพ และสถานะห้องพัก
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs sm:text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มห้องพักใหม่</span>
        </button>
      </div>

      {/* ตัวกรองชั้นและสถานะ */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-[#eeeeee] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#555555] mr-1">ชั้น:</span>
          <button
            type="button"
            onClick={() => setFilterFloor("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterFloor === "ALL"
                ? "bg-[#5c2484] text-white"
                : "bg-[#fafafa] text-[#444444] hover:bg-[#f5eef9]"
            }`}
          >
            ทั้งหมด
          </button>
          {floors.map((fl) => (
            <button
              key={fl}
              type="button"
              onClick={() => setFilterFloor(String(fl))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterFloor === String(fl)
                  ? "bg-[#5c2484] text-white"
                  : "bg-[#fafafa] text-[#444444] hover:bg-[#f5eef9]"
              }`}
            >
              ชั้น {fl}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#555555] mr-1">สถานะ:</span>
          <select
            aria-label="กรองตามสถานะห้อง"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-[#dddddd] text-xs font-medium bg-white"
          >
            <option value="ALL">ทุกสถานะ</option>
            <option value="AVAILABLE">ว่าง</option>
            <option value="OCCUPIED">มีผู้พัก</option>
            <option value="RESERVED">จองแล้ว</option>
            <option value="CLEANING">ทำความสะอาด</option>
            <option value="MAINTENANCE">ซ่อมบำรุง</option>
          </select>
        </div>
      </div>

      {/* การ์ดห้องพัก */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#777777]">
          กำลังโหลดข้อมูลห้องพัก...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const st = ROOM_STATUS_MAP[room.status] || ROOM_STATUS_MAP.AVAILABLE;
            const activeLease = room.leases?.[0];
            const nextBooking = room.bookings?.[0];

            return (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-[#eeeeee] shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="relative h-44 bg-[#f5eef9]">
                    {room.imageUrl && (
                      <img
                        src={room.imageUrl}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-white text-[#222222] font-bold text-xs shadow-sm">
                        ห้อง {room.number}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-black/55 text-white text-xs backdrop-blur-sm">
                        ชั้น {room.floor}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${st.bg} ${st.text}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between">
                      <div>
                        <p className="font-serif text-lg font-bold leading-tight">
                          {room.name}
                        </p>
                        <p className="text-xs text-white/85">{room.roomType}</p>
                      </div>
                      {room.isSample && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm text-white">
                          ข้อมูลตัวอย่าง
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#fafafa] border border-[#eeeeee]">
                      <div>
                        <p className="text-[11px] text-[#666666]">ราคารายวัน</p>
                        <p className="text-sm font-bold text-[#5c2484]">
                          {formatCurrency(room.dailyRate)}
                          <span className="text-xs font-normal text-[#666666]">
                            {" "}
                            /คืน
                          </span>
                        </p>
                      </div>
                      <div className="border-l border-[#eeeeee] pl-3">
                        <p className="text-[11px] text-[#666666]">ราคารายเดือน</p>
                        <p className="text-sm font-bold text-[#222222]">
                          {formatCurrency(room.monthlyRate)}
                          <span className="text-xs font-normal text-[#666666]">
                            {" "}
                            /เดือน
                          </span>
                        </p>
                      </div>
                    </div>

                    {activeLease && (
                      <div className="p-2.5 rounded-xl bg-[#222222] text-white text-xs flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#ffaefe] shrink-0" />
                        <span className="truncate">
                          ผู้เช่ารายเดือน: <strong>{activeLease.tenantName}</strong>
                        </span>
                      </div>
                    )}

                    {!activeLease && nextBooking && (
                      <div className="p-2.5 rounded-xl bg-[#f5eef9] text-[#5c2484] text-xs flex items-center gap-2">
                        <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          คิวรายวัน: <strong>{nextBooking.guestName}</strong>
                        </span>
                      </div>
                    )}

                    {room.notes && (
                      <p className="text-xs text-[#666666] line-clamp-2">
                        หมายเหตุ: {room.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 bg-[#fafafa] border-t border-[#eeeeee] flex items-center justify-between gap-2">
                  <select
                    aria-label={`เปลี่ยนสถานะห้อง ${room.number}`}
                    value={room.status}
                    onChange={(e) => handleStatusChange(room.id, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#dddddd] bg-white text-xs font-medium text-[#222222]"
                  >
                    <option value="AVAILABLE">ว่าง</option>
                    <option value="OCCUPIED">มีผู้พัก</option>
                    <option value="RESERVED">จองแล้ว</option>
                    <option value="CLEANING">ทำความสะอาด</option>
                    <option value="MAINTENANCE">ซ่อมบำรุง</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(room)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f5eef9] hover:text-[#5c2484] text-xs font-medium transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoom(room)}
                      className="p-1.5 rounded-lg border border-[#dddddd] bg-white hover:bg-[#f8e4e4] text-[#ac2d2d] transition"
                      title="ลบห้องพัก"
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

      {/* Modal เพิ่ม/แก้ไขห้องพัก */}
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
                {editingRoom
                  ? `แก้ไขห้องพัก ${editingRoom.number}`
                  : "เพิ่มห้องพักใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-[#666666] hover:bg-[#fafafa]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    เลขห้อง *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 104"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    ชื่อห้อง *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น The Garden Deluxe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    ชั้น
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    ประเภทห้อง
                  </label>
                  <input
                    type="text"
                    value={form.roomType}
                    onChange={(e) =>
                      setForm({ ...form, roomType: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    สถานะ
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs bg-white"
                  >
                    <option value="AVAILABLE">ว่าง</option>
                    <option value="OCCUPIED">มีผู้พัก</option>
                    <option value="RESERVED">จองแล้ว</option>
                    <option value="CLEANING">ทำความสะอาด</option>
                    <option value="MAINTENANCE">ซ่อมบำรุง</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    ราคารายวัน (บาท/คืน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.dailyRate}
                    onChange={(e) =>
                      setForm({ ...form, dailyRate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#222222] mb-1">
                    ราคารายเดือน (บาท/เดือน)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.monthlyRate}
                    onChange={(e) =>
                      setForm({ ...form, monthlyRate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5c2484]" />
                  <span>รูปภาพห้องพัก (เลือกภาพฟรี หรือวาง URL)</span>
                </label>
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs mb-2"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_ROOM_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: img.url })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition ${
                        form.imageUrl === img.url
                          ? "bg-[#5c2484] text-white border-[#5c2484]"
                          : "bg-[#fafafa] text-[#444444] border-[#dddddd]"
                      }`}
                    >
                      {img.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#222222] mb-1">
                  หมายเหตุ / สิ่งอำนวยความสะดวก
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#cccccc] text-xs"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#f8e4e4] text-[#ac2d2d] text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#dddddd] text-xs font-medium text-[#555555]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#5c2484] hover:bg-[#421861] text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกห้องพัก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
