-- ═══════════════════════════════════════════════════════════════
-- SUPABASE SQL EDITOR SCRIPT: ระบบจัดการห้องพัก (Room Manager)
-- คัดลอกเนื้อหาทั้งหมดในไฟล์นี้ไปวางใน Supabase -> SQL Editor แล้วกด RUN
-- ═══════════════════════════════════════════════════════════════

-- 1. สร้างตารางทั้งหมด (Tables & Constraints)

-- ตาราง Setting: ข้อมูลที่พัก, อัตราน้ำ-ไฟ, รหัสผ่าน
CREATE TABLE IF NOT EXISTS "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "propertyName" TEXT NOT NULL DEFAULT 'เดอะ เรทฟอร์ด เรสซิเดนซ์ (The Retford Residence)',
    "propertyAddress" TEXT NOT NULL DEFAULT '88/9 ถนนสุขุมวิท ซอย 38 แขวงพระโขนง เขตคลองเตย กรุงเทพฯ 10110',
    "propertyPhone" TEXT NOT NULL DEFAULT '081-234-5678',
    "waterRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "electricRate" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "lateFeePerDay" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "checkInTime" TEXT NOT NULL DEFAULT '14:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '12:00',
    "leaseWarningDays" INTEGER NOT NULL DEFAULT 30,
    "promptPayId" TEXT NOT NULL DEFAULT '0812345678',
    "promptPayQrUrl" TEXT NOT NULL DEFAULT '',
    "loginImageUrl" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- ตาราง Room: ห้องพักทั้งหมด
CREATE TABLE IF NOT EXISTS "Room" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 1,
    "roomType" TEXT NOT NULL DEFAULT 'Standard',
    "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "monthlyRate" DOUBLE PRECISION NOT NULL DEFAULT 6500,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Room_number_key" ON "Room"("number");

-- ตาราง Guest: ทะเบียนผู้เข้าพัก / ผู้เช่า
CREATE TABLE IF NOT EXISTS "Guest" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "idCardNumber" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "lineId" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "emergencyName" TEXT NOT NULL DEFAULT '',
    "emergencyPhone" TEXT NOT NULL DEFAULT '',
    "idCardDocUrl" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- ตาราง Booking: การจองรายวัน
CREATE TABLE IF NOT EXISTS "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "guestId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL DEFAULT '',
    "guestIdCard" TEXT NOT NULL DEFAULT '',
    "checkInDate" TEXT NOT NULL,
    "checkOutDate" TEXT NOT NULL,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "deposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- ตาราง BookingCharge: ค่าใช้จ่ายเพิ่มเติมของการจองรายวัน
CREATE TABLE IF NOT EXISTS "BookingCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingCharge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookingCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ตาราง Lease: สัญญารายเดือน
CREATE TABLE IF NOT EXISTS "Lease" (
    "id" TEXT NOT NULL,
    "leaseNumber" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "guestId" TEXT,
    "tenantName" TEXT NOT NULL,
    "tenantPhone" TEXT NOT NULL DEFAULT '',
    "tenantIdCard" TEXT NOT NULL DEFAULT '',
    "tenantLineId" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "securityDeposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractFileUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "moveOutDate" TEXT,
    "damageDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unpaidDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositRefunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Lease_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lease_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Lease_leaseNumber_key" ON "Lease"("leaseNumber");

-- ตาราง MeterReading: จดมิเตอร์น้ำ-ไฟ
CREATE TABLE IF NOT EXISTS "MeterReading" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "prevWater" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currWater" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prevElectric" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currElectric" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MeterReading_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MeterReading_roomId_billingMonth_key" ON "MeterReading"("roomId", "billingMonth");

-- ตาราง Invoice: บิลรายเดือน & บันทึกการชำระเงิน
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "issueDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "rentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "waterAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "electricAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherNote" TEXT NOT NULL DEFAULT '',
    "lateDays" INTEGER NOT NULL DEFAULT 0,
    "lateFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Invoice_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- ═══════════════════════════════════════════════════════════════
-- 2. ข้อมูลเริ่มต้น (Initial Data / Sample Rooms)
-- ═══════════════════════════════════════════════════════════════

-- ใส่ข้อมูลการตั้งค่าเริ่มต้น (รหัสผ่านเริ่มต้น: admin1234)
INSERT INTO "Setting" (
    "id", "propertyName", "propertyAddress", "propertyPhone",
    "waterRate", "electricRate", "lateFeePerDay", "checkInTime", "checkOutTime",
    "leaseWarningDays", "promptPayId", "promptPayQrUrl", "passwordHash", "updatedAt"
) VALUES (
    1,
    'เดอะ เรทฟอร์ด เรสซิเดนซ์ (The Retford Residence)',
    '88/9 ถนนสุขุมวิท ซอย 38 แขวงพระโขนง เขตคลองเตย กรุงเทพฯ 10110',
    '081-234-5678',
    18, 8, 50, '14:00', '12:00',
    30, '0812345678', '', '', CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- ข้อมูลตัวอย่าง 10 ห้องพัก (สไตล์ Boutique Inn พร้อมรูปภาพ Unsplash ฟรี)
INSERT INTO "Room" ("id", "number", "name", "floor", "roomType", "dailyRate", "monthlyRate", "status", "imageUrl", "notes", "isSample") VALUES
('room_101', '101', 'The Georgian Standard', 1, 'Standard', 850, 6500, 'OCCUPIED', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80', 'ชั้น 1 ใกล้สวนหย่อม เตียง Queen Size', true),
('room_102', '102', 'The Garden Twin', 1, 'Standard Twin', 900, 6800, 'AVAILABLE', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80', 'เตียงคู่ 2 เตียง วิวสวน', true),
('room_103', '103', 'Courtyard Cozy', 1, 'Standard', 850, 6500, 'AVAILABLE', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80', 'ห้องมุม เงียบสงบ', true),
('room_201', '201', 'Retford Deluxe King', 2, 'Deluxe', 1200, 8500, 'OCCUPIED', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80', 'ระเบียงส่วนตัว เตียง King Size พร้อมอ่างอาบน้ำ', true),
('room_202', '202', 'Heritage Superior', 2, 'Superior', 1050, 7500, 'AVAILABLE', 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=900&q=80', 'ตกแต่งโทนอบอุ่น มีโต๊ะทำงาน', true),
('room_203', '203', 'Classic Studio', 2, 'Studio', 950, 7200, 'CLEANING', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 'เพิ่งเช็คเอาท์ รอแม่บ้านทำความสะอาด', true),
('room_204', '204', 'Plum Velvet Suite', 2, 'Suite', 1500, 11000, 'MAINTENANCE', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80', 'รอช่างล้างแอร์และเปลี่ยนหลอดไฟ', true),
('room_301', '301', 'Longstay Residence A', 3, 'Monthly Studio', 950, 7000, 'OCCUPIED', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80', 'โซนรายเดือน ชั้น 3 มีซิงค์ล้างจาน', true),
('room_302', '302', 'Longstay Residence B', 3, 'Monthly Studio', 950, 7000, 'OCCUPIED', 'https://images.unsplash.com/photo-1540518614846-7ede433c457?auto=format&fit=crop&w=900&q=80', 'โซนรายเดือน ชั้น 3 วิวเมือง', true),
('room_303', '303', 'Penthouse Loft', 3, 'Monthly Deluxe', 1350, 9500, 'OCCUPIED', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80', 'ห้องใหญ่ชั้นบนสุด เพดานสูง', true)
ON CONFLICT ("id") DO NOTHING;

-- ผู้เข้าพัก / ผู้เช่าตัวอย่าง
INSERT INTO "Guest" ("id", "fullName", "phone", "idCardNumber", "email", "lineId", "address", "isSample") VALUES
('guest_001', 'คุณณัฐพล วงศ์สวัสดิ์', '089-111-2233', '1100400123456', 'nattapol@example.com', '@nattapol_w', 'เชียงใหม่', true),
('guest_002', 'คุณพิมพ์ชนก เลิศวิไล', '081-444-5566', '1100500987654', 'pimchanok@example.com', 'pim_lert', 'กรุงเทพฯ', true),
('guest_003', 'คุณธนากร สุขสันต์', '086-777-8899', '1100600554433', 'thanakorn@example.com', '', 'ขอนแก่น', true),
('guest_301', 'คุณกานดา สุขใจ', '084-555-6677', '1100700112233', 'kanda.s@example.com', 'kanda_line', 'กรุงเทพฯ', true),
('guest_302', 'คุณวรเมธ อัศวเดช', '085-888-9900', '1100800334455', 'worameth@example.com', 'worameth_official', 'นนทบุรี', true),
('guest_303', 'คุณนภัสสร รัตนโชติ', '082-333-4455', '1100900778899', 'napassorn@example.com', 'napassorn_r', 'สมุทรปราการ', true)
ON CONFLICT ("id") DO NOTHING;

-- สัญญารายเดือนตัวอย่าง (ห้อง 301, 302, 303)
INSERT INTO "Lease" (
    "id", "leaseNumber", "roomId", "guestId", "tenantName", "tenantPhone", "tenantIdCard", "tenantLineId",
    "startDate", "endDate", "monthlyRent", "securityDeposit", "status", "isSample"
) VALUES
('lease_301', 'LS-2026-301', 'room_301', 'guest_301', 'คุณกานดา สุขใจ', '084-555-6677', '1100700112233', 'kanda_line', '2026-06-01', '2026-11-27', 7000, 14000, 'ACTIVE', true),
('lease_302', 'LS-2026-302', 'room_302', 'guest_302', 'คุณวรเมธ อัศวเดช', '085-888-9900', '1100800334455', 'worameth_official', '2026-08-01', '2027-07-31', 7000, 14000, 'ACTIVE', true),
('lease_303', 'LS-2026-303', 'room_303', 'guest_303', 'คุณนภัสสร รัตนโชติ', '082-333-4455', '1100900778899', 'napassorn_r', '2026-09-01', '2027-02-28', 9500, 19000, 'ACTIVE', true)
ON CONFLICT ("id") DO NOTHING;

-- มิเตอร์น้ำ-ไฟตัวอย่าง (รอบเดือน 2026-11)
INSERT INTO "MeterReading" (
    "id", "roomId", "billingMonth", "prevWater", "currWater", "waterUnits", "prevElectric", "currElectric", "electricUnits", "isSample"
) VALUES
('meter_301_202611', 'room_301', '2026-11', 120, 128, 8, 450, 570, 120, true),
('meter_302_202611', 'room_302', '2026-11', 85, 95, 10, 310, 455, 145, true),
('meter_303_202611', 'room_303', '2026-11', 200, 212, 12, 600, 780, 180, true)
ON CONFLICT ("id") DO NOTHING;

-- บิลรายเดือนตัวอย่าง
INSERT INTO "Invoice" (
    "id", "invoiceNumber", "leaseId", "roomId", "billingMonth", "issueDate", "dueDate",
    "rentAmount", "waterUnits", "waterRate", "waterAmount", "electricUnits", "electricRate", "electricAmount",
    "totalAmount", "paidAmount", "status", "isSample"
) VALUES
('inv_301_202611', 'INV-202611-301', 'lease_301', 'room_301', '2026-11', '2026-11-01', '2026-11-07', 7000, 8, 18, 144, 120, 8, 960, 8104, 8104, 'PAID', true),
('inv_302_202611', 'INV-202611-302', 'lease_302', 'room_302', '2026-11', '2026-11-01', '2026-11-07', 7000, 10, 18, 180, 145, 8, 1160, 8490, 0, 'OVERDUE', true)
ON CONFLICT ("id") DO NOTHING;

-- อัปเดตสถานะบิล 301 ให้ระบุวันที่ชำระแล้ว
UPDATE "Invoice" SET "paidAt" = CURRENT_TIMESTAMP, "paymentMethod" = 'PROMPTPAY' WHERE "id" = 'inv_301_202611';

-- เสร็จสิ้นการเตรียมฐานข้อมูล Supabase สำหรับ Room Manager
