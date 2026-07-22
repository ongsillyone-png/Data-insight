# 📊 Data Insight (Dynamic Report Builder)

แพลตฟอร์ม Data Analytics และ Business Intelligence (BI) แบบ Self-Service ที่ออกแบบมาสำหรับระบบสารสนเทศโรงพยาบาล (HIS) โดยเฉพาะ เครื่องมือนี้ช่วยให้ Data Analyst และผู้ดูแลระบบสามารถสร้างรายงานและ Dashboard แบบไดนามิกได้ด้วยตนเอง เพียงแค่เขียนคำสั่ง SQL `SELECT` โดยไม่จำเป็นต้องพึ่งพานักพัฒนาโปรแกรมในการเขียนหน้าจอใหม่ทุกครั้ง

## ✨ ฟีเจอร์หลัก

- **รองรับหลายฐานข้อมูล (Multi-Database)**: แยกระบบฐานข้อมูลของแอปพลิเคชัน (สำหรับเก็บข้อมูล User, Dashboard) ออกจากฐานข้อมูล HIS (สำหรับดึงข้อมูล) อย่างชัดเจน
- **SQL Editor ประสิทธิภาพสูง**: ผสานการทำงานกับ **Monaco Editor** (ตัวเดียวกับที่ใช้ใน VS Code) รองรับ Syntax Highlighting
- **ความปลอดภัยระดับสูง (SQL Security)**: มี Middleware ดักจับและป้องกันคำสั่งที่แก้ไขข้อมูล (เช่น `INSERT`, `UPDATE`, `DELETE`, `DROP`) ทำให้มั่นใจได้ว่าฐานข้อมูล HIS จะปลอดภัย 100%
- **ระบบเลือกกราฟอัตโนมัติ (Auto Chart Recommendation)**: ระบบจะวิเคราะห์ชนิดของข้อมูล (Data Types) และแนะนำประเภทของกราฟที่เหมาะสมให้โดยอัตโนมัติ (Table, Bar, Pie, Line)
- **ระบบติดตั้งผ่านหน้าเว็บ (Setup Wizard)**: ติดตั้งและตั้งค่าฐานข้อมูลต่างๆ ได้ง่ายๆ ผ่านหน้าเว็บโดยไม่ต้องแก้ไฟล์ Config หรือรัน SQL เอง
- **การแชร์แบบปลอดภัย (Password-Protected Sharing)**: สามารถสร้างลิงก์แชร์รายงานพร้อมตั้งรหัสผ่าน เพื่อส่งให้ผู้บริหารหรือบุคคลภายนอกดูข้อมูลได้อย่างปลอดภัย
- **UI ทันสมัยสำหรับองค์กร**: ออกแบบอย่างสวยงามและใช้งานง่ายด้วย **AdminLTE 4** และ **Bootstrap 5**

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

**Backend:**
- Node.js (v22)
- Express.js
- MySQL2 (Promise-based Connection Pool)
- bcryptjs & crypto (Security)

**Frontend:**
- EJS (Embedded JavaScript templates)
- AdminLTE 4 & Bootstrap 5
- Apache ECharts (Data Visualization)
- Monaco Editor (SQL Editor)

## 🚀 วิธีการติดตั้งและใช้งาน

ทำตามขั้นตอนด้านล่างนี้เพื่อรันโปรเจกต์ในเครื่องของคุณ

### 1. สิ่งที่ต้องมี (Prerequisites)
- Node.js (v18 ขึ้นไป)
- MySQL Server (v8.0+)
- Git

### 2. การรันโปรแกรมครั้งแรก (Setup Wizard)
1. โคลนโปรเจกต์และติดตั้ง Dependencies:
```bash
git clone https://github.com/ongsillyone-png/Data-insight.git
cd Data-insight
npm install
```

2. เริ่มต้น Development Server:
```bash
npm run dev
```

3. เปิดเว็บเบราว์เซอร์ไปที่ `http://localhost:3000`
ระบบจะพาคุณเข้าสู่หน้า **Setup Wizard** โดยอัตโนมัติ 
ให้คุณทำตามขั้นตอนบนหน้าจอเพื่อ:
- ตั้งค่าฐานข้อมูลหลักของโปรแกรม (ระบบจะสร้างตารางให้อัตโนมัติ)
- ตั้งค่าการเชื่อมต่อฐานข้อมูล HIS 
- สร้างบัญชี Admin สำหรับเข้าใช้งานระบบ

4. เมื่อตั้งค่าเสร็จสิ้น ให้ **รีสตาร์ท Server** อีกครั้งโดยกด `Ctrl + C` และพิมพ์ `npm run dev` ใหม่

เท่านี้คุณก็สามารถเข้าสู่หน้า Login และใช้งานระบบ Data Insight ได้ทันที!

## 🛣️ แผนการพัฒนา (Roadmap)

- [x] **Sprint 1:** โครงสร้างหลักของโปรเจกต์, ฐานข้อมูล, ระบบล็อกอิน และ Layout
- [x] **Sprint 2:** Report Builder Engine, ระบบกรอง SQL และกราฟอัตโนมัติ
- [x] **Sprint 3:** Dashboard Builder (ระบบจัดหน้าจอด้วยการลากวาง - Drag & Drop)
- [x] **Sprint 4:** Enterprise Features (การ Export เป็น PDF/Excel, ระบบจำกัดสิทธิ์ และ Audit Logs)
- [x] **Sprint 5:** Link Sharing แบบมีรหัสผ่านป้องกัน และระบบ Web-based Setup Wizard

## 📄 ลิขสิทธิ์ (License)
โปรเจกต์นี้สร้างขึ้นสำหรับใช้งานภายในองค์กรเท่านั้น
