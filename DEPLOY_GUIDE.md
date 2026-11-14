# คู่มือการติดตั้งและใช้งานจริงผ่าน Netlify + Supabase + GitHub

โปรเจกต์: **ระบบจัดการห้องพัก (Room Manager)**  
รองรับ: เช่ารายวัน & รายเดือน, จดมิเตอร์น้ำ-ไฟ, บิลออนไลน์ & ส่ง LINE, QR รับเงิน, สัญญาเช่า

---

## สรุป 3 ขั้นตอนหลัก
1. **Supabase (ฐานข้อมูล):** สร้างโปรเจกต์ฟรี และนำคำสั่งจาก `supabase-schema.sql` ไปรันใน SQL Editor
2. **GitHub (ฝากโค้ด):** แตกไฟล์ `.zip` และ Push โค้ดขึ้น GitHub Repository
3. **Netlify (เปิดใช้งานเว็บ):** เชื่อมกับ GitHub Repo และใส่ค่า Environment Variables 4 ตัว

---

## ขั้นตอนที่ 1: เตรียมฐานข้อมูลบน Supabase (ฟรี)
1. เข้าไปที่ [https://supabase.com](https://supabase.com) แล้วล็อกอิน / สมัครสมาชิก
2. กดปุ่ม **"New Project"**
   - ตั้งชื่อโปรเจกต์ (เช่น `room-manager`)
   - กำหนด **Database Password** (จดรหัสผ่านนี้ไว้ ต้องนำไปใช้ใน connection string)
   - เลือก Region: **Singapore (ap-southeast-1)** (ใกล้ไทยและเร็วที่สุด)
   - กด **Create new project** (รอประมาณ 1-2 นาทีให้ระบบสร้างเสร็จ)
3. **รันคำสั่ง SQL สร้างตารางและข้อมูลเริ่มต้น:**
   - ในแถบเมนูด้านซ้ายของ Supabase คลิกที่ **SQL Editor** (ไอคอนรูป `>_`)
   - กดปุ่ม **"New Query"**
   - เปิดไฟล์ `supabase-schema.sql` ในโฟลเดอร์โปรเจกต์ คัดลอกเนื้อหาทั้งหมดมาวางในช่อง
   - กดปุ่ม **Run** (สีเขียวด้านล่างขวา)
   - ระบบจะสร้างตารางทั้ง 8 ตาราง, ดัชนี, และข้อมูลตัวอย่าง 10 ห้องพักเรียบร้อย
4. **คัดลอก Connection Strings:**
   - ไปที่ **Project Settings** (ไอคอนฟันเฟืองล่างซ้าย) -> เมนู **Database**
   - เลื่อนลงมาที่หัวข้อ **Connection string**:
     - เลือกแท็บ **URI** -> โหมด **Transaction** (พอร์ต 6543): ให้คัดลอกมา นี่คือค่าของ `DATABASE_URL` (อย่าลืมเปลี่ยน `[YOUR-PASSWORD]` เป็นรหัสที่คุณตั้งไว้ และเติม `?pgbouncer=true` ต่อท้าย)
     - เลือกแท็บ **URI** -> โหมด **Session** (พอร์ต 5432): ให้คัดลอกมา นี่คือค่าของ `DIRECT_URL` (เปลี่ยน `[YOUR-PASSWORD]` เช่นกัน)

---

## ขั้นตอนที่ 2: อัปโค้ดขึ้น GitHub
1. แตกไฟล์ `room-manager-production.zip` ในเครื่องของคุณ
2. เปิด Terminal / PowerShell ในโฟลเดอร์ที่แตกออกมา
3. พิมพ์คำสั่ง Git ตามลำดับ:
   ```bash
   git init
   git add .
   git commit -m "feat: Initial commit for Room Manager"
   ```
4. เข้าไปที่ [https://github.com](https://github.com) -> กดสร้าง **New repository** (ตั้งชื่อ เช่น `room-manager`)
5. ทำการเชื่อมและ Push โค้ดขึ้น GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/room-manager.git
   git branch -M main
   git push -u origin main
   ```

---

## ขั้นตอนที่ 3: Deploy ขึ้น Netlify (ฟรี)
1. เข้าไปที่ [https://www.netlify.com](https://www.netlify.com) แล้วล็อกอินด้วย GitHub
2. กดปุ่ม **"Add new site"** -> เลือก **"Import an existing project"**
3. เลือก **GitHub** และค้นหา Repository `room-manager` ที่เพิ่ง Push ขึ้นไป
4. ในหน้าการตั้งค่า Build settings:
   - **Base directory:** เว้นว่างไว้
   - **Build command:** `npm run build` (ระบบจะอ่านจาก netlify.toml ให้อัตโนมัติ)
   - **Publish directory:** `.next`
5. **กรอก Environment Variables (สำคัญที่สุด):**
   - กดปุ่ม **"Add environment variables"** และเพิ่มตัวแปรดังนี้:
     | Key | Value ตัวอย่าง | คำอธิบาย |
     |---|---|---|
     | `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase Transaction Pooler |
     | `DIRECT_URL` | `postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` | Supabase Direct Session |
     | `SESSION_SECRET` | ข้อความสุ่มยาว เช่น `room_manager_super_secret_2026_xyz123abc` | สำหรับเข้ารหัสเซสชันความปลอดภัย |
     | `NEXT_PUBLIC_APP_URL` | URL ของ Netlify เช่น `https://my-room.netlify.app` | ลิงก์สำหรับแชร์บิลออนไลน์ |
6. กดปุ่ม **"Deploy room-manager"**
   - Netlify จะทำการติดตั้งแพ็กเกจ สร้าง Prisma Client และ Build เว็บไซต์ให้ทันที (ใช้เวลาประมาณ 1-2 นาที)

---

## การเข้าสู่ระบบและการใช้งาน
1. เมื่อ Deploy เสร็จ เข้าสู่ลิงก์เว็บไซต์ของ Netlify ที่ได้
2. **ข้อมูลเข้าสู่ระบบเริ่มต้น (สร้างไว้ในฐานข้อมูล AdminUser เรียบร้อยแล้ว):**
   - **ชื่อผู้ใช้ (Username / ID):** `admin`
   - **รหัสผ่าน (Password):** `admin1234`
3. เข้าไปที่เมนู **"ตั้งค่า & Backup"**:
   - สามารถเปลี่ยนรหัสผ่านผู้ดูแลระบบใหม่ได้ตลอดเวลา (ระบบจะอัปเดตทั้งในตาราง AdminUser และ Setting อัตโนมัติ)
   - สามารถเปลี่ยนชื่อที่พัก, เบอร์โทร, เลข PromptPay QR รับเงิน
   - อัปโหลดรูปภาพหน้า Login ให้สวยงามตามสไตล์ของคุณ
   - หากต้องการลบข้อมูลตัวอย่าง 10 ห้องออกแล้วเพิ่มห้องจริง สามารถกดปุ่ม **"ลบข้อมูลตัวอย่างทั้งหมด"** ได้ในคลิกเดียว

---

## การแก้ไขเมื่อพบปัญหา: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ"

ข้อความนี้เป็น **Server Error (HTTP 500)** ซึ่งเกิดขึ้นเมื่อเว็บแอปบน Netlify ไม่สามารถเชื่อมต่อกับฐานข้อมูล Supabase ได้ ให้ตรวจสอบ 3 จุดนี้:

### จุดที่ 1: ตรวจสอบ Environment Variables บน Netlify
1. เข้า [Netlify Dashboard](https://app.netlify.com) -> คลิกเว็บไซต์ของคุณ (เช่น lovely-cactus-6c09cf)
2. ไปที่ **Site configuration** -> เมนู **Environment variables**
3. ดูว่ามีตัวแปรครบทั้ง 3 ตัวนี้หรือยัง:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SESSION_SECRET`
4. หากยังไม่มี หรือชื่อตัวแปรพิมพ์ผิด ให้กด **Add a variable** แล้วกรอกให้ถูกต้อง

### จุดที่ 2: ตรวจสอบรหัสผ่านใน DATABASE_URL
1. รูปแบบของ `DATABASE_URL` จาก Supabase จะเป็น:
   `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
2. **อย่าลืมแทนที่ `[YOUR-PASSWORD]`** ด้วยรหัสผ่านฐานข้อมูลจริงที่คุณตั้งไว้ตอนสร้าง Supabase
3. **กรณีรหัสผ่านมีเครื่องหมายพิเศษ:** หากรหัสผ่านมี `@`, `#`, `%`, `&`, `+` ต้องแปลงเป็น URL Encode เช่น:
   - `@` ให้เขียนเป็น `%40`
   - `#` ให้เขียนเป็น `%23`
   - `%` ให้เขียนเป็น `%25`

### จุดที่ 3: ตรวจสอบว่าได้รัน SQL ใน Supabase หรือยัง
1. เข้าไปที่ [Supabase Dashboard](https://supabase.com) -> เลือกโปรเจกต์ของคุณ
2. คลิกที่แถบเมนูด้านซ้าย **SQL Editor** (ไอคอน `>_`)
3. เปิดไฟล์ `supabase-schema.sql` (ที่อยู่ใน `D:\งานเอ็ก\supabase-schema.sql`)
4. คัดลอกข้อความทั้งหมด วางลงในช่อง SQL Editor แล้วกดปุ่ม **Run** (สีเขียวด้านล่างขวา)
5. ตรวจสอบที่เมนู **Table Editor** จะต้องมีตารางปรากฏขึ้น เช่น `Setting`, `Room`, `Guest`, `Booking`, `Lease`, `Invoice`

### จุดที่ 4: สั่ง Deploy ใหม่อีกครั้ง (Trigger deploy -> Clear cache and deploy site)
เมื่อแก้ไขตัวแปรบน Netlify แล้ว:
1. ไปที่แท็บ **Deploys** บน Netlify
2. กดปุ่ม **Trigger deploy** ด้านขวาบน -> เลือก **Clear cache and deploy site**
3. รอ 1-2 นาที แล้วลองเข้าสู่ระบบด้วย `admin1234` ใหม่อีกครั้ง
