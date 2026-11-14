import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function fmtDate(offsetDays: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtMonth(offsetMonths = 0): string {
  const dt = new Date();
  dt.setMonth(dt.getMonth() + offsetMonths);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function clearSampleData() {
  await prisma.invoice.deleteMany({ where: { isSample: true } });
  await prisma.meterReading.deleteMany({ where: { isSample: true } });
  await prisma.booking.deleteMany({ where: { isSample: true } });
  await prisma.lease.deleteMany({ where: { isSample: true } });
  await prisma.guest.deleteMany({ where: { isSample: true } });
  await prisma.room.deleteMany({ where: { isSample: true } });
}

export async function seedSampleData() {
  await clearSampleData();

  const passwordHash = await bcrypt.hash("admin1234", 10);
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      propertyName: "เดอะ เรทฟอร์ด เรสซิเดนซ์ (The Retford Residence)",
      propertyAddress: "88/9 ถนนสุขุมวิท ซอย 38 แขวงพระโขนง เขตคลองเตย กรุงเทพฯ 10110",
      propertyPhone: "081-234-5678",
      waterRate: 18,
      electricRate: 8,
      lateFeePerDay: 50,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      leaseWarningDays: 30,
      promptPayId: "0812345678",
      passwordHash,
    },
  });

  // 10 ห้องพักพร้อมรูปภาพฟรีจาก Unsplash (สไตล์ Boutique Inn)
  const roomsData = [
    {
      number: "101",
      name: "The Georgian Standard",
      floor: 1,
      roomType: "Standard",
      dailyRate: 850,
      monthlyRate: 6500,
      status: "OCCUPIED",
      imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80",
      notes: "ชั้น 1 ใกล้สวนหย่อม เตียง Queen Size",
    },
    {
      number: "102",
      name: "The Garden Twin",
      floor: 1,
      roomType: "Standard Twin",
      dailyRate: 900,
      monthlyRate: 6800,
      status: "RESERVED",
      imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
      notes: "เตียงคู่ 2 เตียง วิวสวน",
    },
    {
      number: "103",
      name: "Courtyard Cozy",
      floor: 1,
      roomType: "Standard",
      dailyRate: 850,
      monthlyRate: 6500,
      status: "AVAILABLE",
      imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80",
      notes: "ห้องมุม เงียบสงบ",
    },
    {
      number: "201",
      name: "Retford Deluxe King",
      floor: 2,
      roomType: "Deluxe",
      dailyRate: 1200,
      monthlyRate: 8500,
      status: "OCCUPIED",
      imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80",
      notes: "ระเบียงส่วนตัว เตียง King Size พร้อมอ่างอาบน้ำ",
    },
    {
      number: "202",
      name: "Heritage Superior",
      floor: 2,
      roomType: "Superior",
      dailyRate: 1050,
      monthlyRate: 7500,
      status: "AVAILABLE",
      imageUrl: "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=900&q=80",
      notes: "ตกแต่งโทนอบอุ่น มีโต๊ะทำงาน",
    },
    {
      number: "203",
      name: "Classic Studio",
      floor: 2,
      roomType: "Studio",
      dailyRate: 950,
      monthlyRate: 7200,
      status: "CLEANING",
      imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
      notes: "เพิ่งเช็คเอาท์ รอแม่บ้านทำความสะอาด",
    },
    {
      number: "204",
      name: "Plum Velvet Suite",
      floor: 2,
      roomType: "Suite",
      dailyRate: 1500,
      monthlyRate: 11000,
      status: "MAINTENANCE",
      imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80",
      notes: "รอช่างล้างแอร์และเปลี่ยนหลอดไฟ",
    },
    {
      number: "301",
      name: "Longstay Residence A",
      floor: 3,
      roomType: "Monthly Studio",
      dailyRate: 950,
      monthlyRate: 7000,
      status: "OCCUPIED",
      imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=900&q=80",
      notes: "โซนรายเดือน ชั้น 3 มีซิงค์ล้างจาน",
    },
    {
      number: "302",
      name: "Longstay Residence B",
      floor: 3,
      roomType: "Monthly Studio",
      dailyRate: 950,
      monthlyRate: 7000,
      status: "OCCUPIED",
      imageUrl: "https://images.unsplash.com/photo-1540518614846-7ede433c457?auto=format&fit=crop&w=900&q=80",
      notes: "โซนรายเดือน ชั้น 3 วิวเมือง",
    },
    {
      number: "303",
      name: "Penthouse Loft",
      floor: 3,
      roomType: "Monthly Deluxe",
      dailyRate: 1350,
      monthlyRate: 9500,
      status: "OCCUPIED",
      imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80",
      notes: "ห้องใหญ่ชั้นบนสุด เพดานสูง",
    },
  ];

  const createdRooms: Record<string, string> = {};
  for (const r of roomsData) {
    const room = await prisma.room.upsert({
      where: { number: r.number },
      update: { ...r, isSample: true },
      create: { ...r, isSample: true },
    });
    createdRooms[r.number] = room.id;
  }

  // สร้างข้อมูลผู้เข้าพัก/ผู้เช่าตัวอย่าง
  const g1 = await prisma.guest.create({
    data: {
      fullName: "คุณณัฐพล วงศ์สวัสดิ์",
      phone: "089-111-2233",
      idCardNumber: "1100400123456",
      address: "เชียงใหม่",
      isSample: true,
    },
  });

  const g2 = await prisma.guest.create({
    data: {
      fullName: "คุณพิมพ์ชนก เลิศวิไล",
      phone: "081-444-5566",
      idCardNumber: "1100500987654",
      address: "กรุงเทพฯ",
      isSample: true,
    },
  });

  const g3 = await prisma.guest.create({
    data: {
      fullName: "คุณศิริพร แสงทอง",
      phone: "086-777-8899",
      idCardNumber: "3100900456123",
      address: "นนทบุรี",
      isSample: true,
    },
  });

  // 1. การจองรายวัน: เช็คเอาท์วันนี้ (ห้อง 101)
  const b1 = await prisma.booking.create({
    data: {
      bookingNumber: "BK-2026-001",
      roomId: createdRooms["101"],
      guestId: g1.id,
      guestName: g1.fullName,
      guestPhone: g1.phone,
      guestIdCard: g1.idCardNumber,
      checkInDate: fmtDate(-2),
      checkOutDate: fmtDate(0), // เช็คเอาท์วันนี้ ก่อน 12:00
      nights: 2,
      dailyRate: 850,
      deposit: 500,
      paidAmount: 1700,
      paymentMethod: "PROMPTPAY",
      status: "CHECKED_IN",
      actualCheckIn: new Date(Date.now() - 2 * 86400000),
      notes: "ขอหมอนเพิ่ม 1 ใบ",
      isSample: true,
    },
  });

  await prisma.bookingCharge.create({
    data: {
      bookingId: b1.id,
      description: "น้ำดื่มและมินิบาร์",
      amount: 120,
    },
  });

  // 2. การจองรายวัน: เช็คอินวันนี้ (ห้อง 102)
  await prisma.booking.create({
    data: {
      bookingNumber: "BK-2026-002",
      roomId: createdRooms["102"],
      guestId: g2.id,
      guestName: g2.fullName,
      guestPhone: g2.phone,
      guestIdCard: g2.idCardNumber,
      checkInDate: fmtDate(0), // เช็คอินวันนี้ 14:00
      checkOutDate: fmtDate(3),
      nights: 3,
      dailyRate: 900,
      deposit: 1000,
      paidAmount: 1000,
      paymentMethod: "TRANSFER",
      status: "CONFIRMED",
      notes: "จะเข้ามาเช็คอินประมาณ 15:30 น.",
      isSample: true,
    },
  });

  // 3. การจองรายวัน: กำลังพักอยู่ (ห้อง 201)
  await prisma.booking.create({
    data: {
      bookingNumber: "BK-2026-003",
      roomId: createdRooms["201"],
      guestId: g3.id,
      guestName: g3.fullName,
      guestPhone: g3.phone,
      guestIdCard: g3.idCardNumber,
      checkInDate: fmtDate(-1),
      checkOutDate: fmtDate(2),
      nights: 3,
      dailyRate: 1200,
      deposit: 1000,
      paidAmount: 3600,
      paymentMethod: "CASH",
      status: "CHECKED_IN",
      actualCheckIn: new Date(Date.now() - 86400000),
      isSample: true,
    },
  });

  // 4. การจองรายวันล่วงหน้า (ห้อง 202)
  await prisma.booking.create({
    data: {
      bookingNumber: "BK-2026-004",
      roomId: createdRooms["202"],
      guestName: "คุณธนกฤต เจริญผล",
      guestPhone: "092-333-4455",
      guestIdCard: "1102000334455",
      checkInDate: fmtDate(2),
      checkOutDate: fmtDate(5),
      nights: 3,
      dailyRate: 1050,
      deposit: 1000,
      paidAmount: 1000,
      paymentMethod: "PROMPTPAY",
      status: "CONFIRMED",
      isSample: true,
    },
  });

  // 5. สัญญารายเดือน 3 ห้อง (301, 302, 303) - บล็อกปฏิทินรายวันอัตโนมัติ
  const lease1 = await prisma.lease.create({
    data: {
      leaseNumber: "LS-2026-301",
      roomId: createdRooms["301"],
      tenantName: "คุณกานดา สุขใจ",
      tenantPhone: "084-555-6677",
      tenantIdCard: "1100700112233",
      startDate: fmtDate(-150),
      endDate: fmtDate(18), // ใกล้หมดสัญญาในอีก 18 วัน
      monthlyRent: 7000,
      securityDeposit: 14000,
      status: "ACTIVE",
      notes: "จ่ายตรงเวลาทุกเดือน",
      isSample: true,
    },
  });

  const lease2 = await prisma.lease.create({
    data: {
      leaseNumber: "LS-2026-302",
      roomId: createdRooms["302"],
      tenantName: "คุณวรเมธ อัศวเดช",
      tenantPhone: "085-888-9900",
      tenantIdCard: "1100800998877",
      startDate: fmtDate(-60),
      endDate: fmtDate(305),
      monthlyRent: 7000,
      securityDeposit: 14000,
      status: "ACTIVE",
      isSample: true,
    },
  });

  await prisma.lease.create({
    data: {
      leaseNumber: "LS-2026-303",
      roomId: createdRooms["303"],
      tenantName: "คุณอารยา พงศ์ไพศาล",
      tenantPhone: "082-999-1100",
      tenantIdCard: "1100900554433",
      startDate: fmtDate(-90),
      endDate: fmtDate(275),
      monthlyRent: 9500,
      securityDeposit: 19000,
      status: "ACTIVE",
      isSample: true,
    },
  });

  // บิลรายเดือนตัวอย่าง (1 จ่ายแล้ว, 1 ค้างชำระ)
  const currentMonth = fmtMonth(0);
  await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${currentMonth.replace("-", "")}-301`,
      leaseId: lease1.id,
      roomId: createdRooms["301"],
      billingMonth: currentMonth,
      issueDate: fmtDate(-5),
      dueDate: fmtDate(2),
      rentAmount: 7000,
      waterUnits: 8,
      waterRate: 18,
      waterAmount: 144,
      electricUnits: 120,
      electricRate: 8,
      electricAmount: 960,
      totalAmount: 8104,
      paidAmount: 8104,
      status: "PAID",
      paidAt: new Date(),
      paymentMethod: "PROMPTPAY",
      isSample: true,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: `INV-${currentMonth.replace("-", "")}-302`,
      leaseId: lease2.id,
      roomId: createdRooms["302"],
      billingMonth: currentMonth,
      issueDate: fmtDate(-7),
      dueDate: fmtDate(-2),
      rentAmount: 7000,
      waterUnits: 10,
      waterRate: 18,
      waterAmount: 180,
      electricUnits: 145,
      electricRate: 8,
      electricAmount: 1160,
      lateDays: 2,
      lateFeeAmount: 100,
      totalAmount: 8440,
      paidAmount: 0,
      status: "OVERDUE",
      isSample: true,
    },
  });
}

async function main() {
  const isClear = process.argv.includes("--clear");
  if (isClear) {
    await clearSampleData();
    console.log("Cleared sample data successfully.");
  } else {
    await seedSampleData();
    console.log("Seeded 10 rooms and sample data successfully.");
  }
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
