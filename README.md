# EduSaaS - ระบบบริหารจัดการเรียนการสอนและการวัดผล (React + Vite + Firebase)

ระบบแอปพลิเคชันเว็บสำหรับการบริหารจัดการชั้นเรียน เช็คชื่อเข้าเรียน บันทึกคะแนน และสรุปยอดตัดเกรด 100 คะแนนเต็ม ออกแบบมาเพื่อให้คุณครูในแผนกวิชาเทคโนโลยีสารสนเทศสามารถทำงานร่วมกันเป็นทีม ซิงค์ข้อมูลห้องเรียน รายวิชา และคะแนนร่วมกันได้อย่างสมบูรณ์แบบ พร้อมระบบเชื่อมโยงบัญชีนักเรียนอัตโนมัติ (Auto-link) เมื่อนักเรียนสมัครสมาชิก

---

## 🚀 คำแนะนำการติดตั้งสำหรับเครื่องพัฒนาใหม่ (Installation Guide)

หากคุณครูย้ายเครื่องในการพัฒนาใหม่ ให้ปฏิบัติตามขั้นตอนเหล่านี้เพื่อติดตั้งสภาพแวดล้อมการทำงานใหม่ทั้งหมดครับ

### 1. ติดตั้งเครื่องมือระดับ Global (ติดตั้งเพียงครั้งเดียวในเครื่องใหม่)
เปิด Terminal (เช่น Command Prompt, PowerShell หรือ Terminal ใน VS Code) แล้วรันคำสั่ง:
`npm install -g firebase-tools`
*(หากเป็นระบบปฏิบัติการ macOS หรือ Linux แล้วติดสิทธิ์ Error ให้เติม `sudo` ด้านหน้าเป็น `sudo npm install -g firebase-tools`)*

### 2. ติดตั้งไลบรารีและ Dependencies ภายในโปรเจกต์
เข้าไปยังโฟลเดอร์หลักของโปรเจกต์ (โฟลเดอร์ที่มีไฟล์ `package.json`) แล้วใช้คำสั่งนี้เพื่อดาวน์โหลดไลบรารีทั้งหมดที่ระบบจำเป็นต้องใช้งาน:

`npm install`

หรือหากต้องการติดตั้งไลบรารีหลักแยกทีละตัวเพื่อให้มั่นใจว่าเวอร์ชันล่าสุดตรงกัน สามารถใช้คำสั่งนี้ครับ:
`npm install firebase lucide-react xlsx`

### 3. ไลบรารีสำหรับ UI / Styling (Tailwind CSS)
ระบบนี้ขับเคลื่อนด้วย **Tailwind CSS** ในการตกแต่งหน้าจอ หากต้องการตรวจสอบความสมบูรณ์ในการติดตั้งตัวจัดการสไตล์ สามารถใช้คำสั่งนี้ได้ครับ:
`npm install -D tailwindcss postcss autoprefixer`
`npx tailwindcss init -p`

---

## 🛠️ การตั้งค่าระบบสภาพแวดล้อม (Environment Configuration)

ตรวจสอบให้แน่ใจว่าในโฟลเดอร์หลักของโปรเจกต์มีไฟล์ชื่อ `.env` หรือ `.env.local` เพื่อระบุคีย์การเชื่อมต่อกับ Firebase ตัวอย่างโครงสร้างไฟล์:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

## โครงสร้างโฟลเดอร์และการจัดเก็บโค้ด (Project Directory Structure)

├── public/                 # ไฟล์ Static ทั่วไปของระบบ
├── src/
│   ├── components/         # คอมโพเนนต์ UI ส่วนกลางที่ใช้ซ้ำ
│   │   ├── UI.jsx          # รวม Custom Modal, Alert, Input, CheckboxSelect
│   │   └── Sidebar.jsx     # เมนูควบคุมการสลับหน้าจอ (อัปเดตสิทธิ์ Admin/Teacher/Student)
│   ├── context/
│   │   └── firebase.js     # ไฟล์เชื่อมต่อ SDK และตั้งค่า db (Firestore) / auth (Firebase Auth)
│   ├── pages/              # โค้ดหน้าจอหลักแยกตามฟังก์ชันการทำงาน
│   │   ├── AdminDashboard.jsx    # หน้าจัดการสิทธิ์และสมาชิกแอดมิน
│   │   ├── SubjectPage.jsx       # หน้าจัดการรายวิชาและการสั่งงาน (รองรับ Array ห้องเรียน)
│   │   ├── TeacherClassrooms.jsx # หน้าจัดการห้องเรียน, Import Excel, และระบบเลือกกลุ่มลบนักเรียน
│   │   ├── StudentManagement.jsx  # ศูนย์ข้อมูลนักเรียน (ค้นหา, ซ่อนรหัสผ่าน, ยืนยันตัวตนครูด้วย Re-auth)
│   │   ├── TeacherAttendance.jsx # หน้าระบบเช็คชื่อเข้าชั้นเรียนประจำวัน (แบบไม่ล็อคไอดีครู)
│   │   ├── TeacherScores.jsx     # ระบบให้คะแนนงานรายชิ้น และ ตารางสรุปคะแนนตัดเกรด 100 แต้ม
│   │   ├── ScoreReporting.jsx    # หน้าจัดทำและส่งออก (Export) รายงานคะแนนภาพรวม
│   │   └── StudentViews.jsx      # หน้า Dashboard สถิติและงานที่ได้รับมอบหมายของฝั่งนักเรียน
│   ├── App.jsx             # ไฟล์หลักควบคุมระบบ Routing, สถานะการล็อกอิน และระบบสมัครสมาชิกแบบแยกชื่อ-สกุล
│   └── main.jsx            # จุดเริ่มต้นการเรนเดอร์ของแอปพลิเคชัน React
├── firestore.rules         # กฎความปลอดภัยในการเข้าถึงฐานข้อมูลบน Firebase (Security Rules)
├── tailwind.config.js      # ตั้งค่าการแสดงผลสไตล์ของ Tailwind CSS
└── vite.config.js          # ตั้งค่าการคอมไพล์ของระบบ Vite


## 🚀 ขั้นตอนการปล่อยระบบขึ้นออนไลน์ (Production Deployment)

# ขั้นตอนที่ 1: ตรวจสอบความพร้อมและล็อกอินบัญชี (หากยังไม่ได้ทำบนเครื่องใหม่)
firebase login

# ขั้นตอนที่ 2: แปลงโค้ดและรวมไฟล์สำหรับใช้งานจริง (จะเกิดโฟลเดอร์ dist ขึ้น)
npm run build

# ขั้นตอนที่ 3: ปล่อยไฟล์จากโฟลเดอร์ dist ขึ้นระบบ Hosting ออนไลน์ยิงตรงสู่เซิร์ฟเวอร์
firebase deploy