# Codex Design Brief — Construction Tech SaaS UI

## เป้าหมาย
สร้าง Landing Page และ App Shell สำหรับแพลตฟอร์ม **Construction Tech SaaS** ตามภาพอ้างอิงที่แนบ โดยโฟกัสการใช้งานง่ายสำหรับวิศวกร/ผู้ควบคุมงาน/ผู้รับเหมา/ผู้บริหาร และรองรับโครงสร้างแพ็กเกจ Subscription

## ไฟล์ภาพอ้างอิง
ใช้ภาพในโฟลเดอร์นี้เป็น visual reference:
- `00_full_flow_reference.png` = ภาพรวม flow ทั้งหมด
- `01_landing_login.png` = หน้า Landing + Login
- `02_program_selector.png` = หน้าเลือกโปรแกรมตามแพ็กเกจ
- `03_user_dashboard.png` = หน้าใช้งานของผู้ใช้ทั่วไป
- `04_admin_dashboard.png` = หน้า Admin Dashboard

## โครงสร้าง Flow ที่ต้องทำ
1. Public Landing Page
2. Login Page / Login Card
3. Program Selector หลัง Login
4. User Workspace / Dashboard ของโปรแกรมที่เลือก
5. Admin Dashboard สำหรับผู้ดูแลระบบ
6. Floating Help Chatbot ด้านขวาล่างทุกหน้าหลังเข้าสู่ระบบ
7. Navigation:
   - จาก Login → Program Selector
   - จาก Program Selector → User Workspace
   - จาก User Workspace → กลับไปเลือกโปรแกรม
   - ทุกหน้าหลัง Login มีปุ่ม Logout
   - Admin เข้าหน้า Admin แยกตาม role

## Stack แนะนำ
ถ้าโปรเจกต์เป็น React:
- React + TypeScript
- Tailwind CSS
- lucide-react สำหรับ icons
- recharts สำหรับ chart / gauge / donut
- ใช้ mock data ก่อน ยังไม่ต้องเชื่อม backend จริง

ถ้าโปรเจกต์เป็น HTML เดิม:
- HTML + CSS + Vanilla JS
- แยกไฟล์ `index.html`, `styles.css`, `app.js`
- ใช้ mock state เพื่อ simulate login/package/role

## Theme / Design System
ใช้ mood ตามภาพ:
- Primary: navy blue `#0B3A75`
- Secondary: teal `#0EA5A4`
- Accent: orange `#F97316`
- Success: green `#16A34A`
- Danger: red `#DC2626`
- Background: very light blue/gray `#F5F9FF`
- Card: white with soft border `#D7E3F5`
- Radius: 16–24px
- Shadow: soft, subtle, corporate SaaS style
- Font: ใช้ system font หรือ `Noto Sans Thai` ถ้ามี

## Layout Requirements
- Desktop first แต่ต้อง responsive
- Mobile layout ต้อง stack เป็น column
- ปุ่มใหญ่ ใช้ง่าย สำหรับ field engineer
- ใช้ card-based UI
- อย่าให้ข้อมูลแน่นเกินไป
- ทำ sidebar สำหรับ dashboard
- ใช้ top bar แสดง current plan/package และ navigation

---

# Screen 1 — Landing + Login

## Content
Hero:
- Logo: Construction Tech SaaS
- Headline: `Construction Tech SaaS`
- Subtitle: `แพลตฟอร์มบริหารงานก่อสร้างครบวงจร สำหรับวิศวกร ผู้ควบคุมงาน ผู้รับเหมา และองค์กร`

Feature pills:
- Offline-First — `ใช้งานได้แม้ไม่มีอินเทอร์เน็ต`
- Mobile-First — `ออกแบบเพื่อมือถือ`
- Excel-Friendly — `นำเข้า-ส่งออก Excel`
- LINE Notification — `แจ้งเตือนผ่าน LINE`

CTA:
- `เข้าสู่ระบบ`
- `ทดลองใช้ฟรี 14 วัน`

Trust badges:
- `ปลอดภัย มั่นใจได้`
- `ใช้งานง่าย`
- `รองรับทุกองค์กร`

Login Card:
- Email
- Password
- Remember me
- Forgot password
- Login button
- Package summary card:
  - Current plan: Team
  - Users: 10
  - Storage: 100GB
  - Status: Active

## Interaction
- Login button should set mock user state and navigate to `/programs`
- Trial button can show alert/modal mockup

---

# Screen 2 — Program Selector

## Header
- Title: `เลือกโปรแกรมที่ต้องการใช้งาน`
- Current package badge เช่น `แพ็กเกจปัจจุบัน: Team`
- Button: `กลับหน้าเข้าสู่ระบบ`
- Button: `ออกจากระบบ`

## Module Cards
Create cards with status based on package permission:

1. `ควบคุมงานก่อสร้าง`
   - enabled for Team
   - description: `ติดตามความคืบหน้า งาน ปริมาณงาน และงบประมาณแบบเรียลไทม์`

2. `ราคากลาง / BOQ`
   - enabled for Team
   - description: `จัดทำ BOQ และราคากลาง คำนวณต้นทุน และประมาณการอย่างแม่นยำ`

3. `รายงานหน้างาน`
   - enabled for Team
   - description: `บันทึกรายงานประจำวัน ปัญหา อุปสรรค และรูปภาพจากหน้างาน`

4. `Dashboard ผู้บริหาร`
   - locked unless Enterprise
   - show lock state and text `ต้องใช้แพ็กเกจ Enterprise`

5. `AI Assistant`
   - enabled or beta depending package
   - description: `ผู้ช่วยอัจฉริยะ แนะนำงาน ค้นหาข้อมูล และสรุปรายงานอย่างรวดเร็ว`

## Interaction
- Clicking enabled module navigates to `/app/construction-control`
- Clicking locked module opens upgrade modal
- Logout clears mock user state

---

# Screen 3 — User Workspace / Dashboard

## Top Bar
- Project dropdown: `อาคารสำนักงาน ABC`
- Current package: `Team`
- Help button
- Button: `กลับไปเลือกโปรแกรม`
- Button: `ออกจากระบบ`

## Sidebar Menu
- หน้าหลัก
- โครงการของฉัน
- รายงานหน้างาน
- ปัญหา / อุปสรรค
- การอนุมัติ
- เอกสาร
- รูปภาพหน้างาน
- BOQ & ต้นทุน
- ตั้งค่า

## Dashboard Cards
1. Project progress:
   - 68% overall
   - Plan 72%
   - Actual 68%
   - Delay -4%

2. Daily report:
   - date: 23 พ.ค. 2568
   - งานที่ทำ 12 รายการ
   - คนงาน 28 คน
   - เครื่องจักร 5 คัน
   - สภาพอากาศ แดดออก

3. Alerts:
   - งานล่าช้า 3 รายการ
   - รอการอนุมัติ 2 รายการ
   - Issue ค้างอยู่ 5 รายการ

4. Recent site photos:
   - show 3 image placeholders or sample construction thumbnails

5. BOQ & Cost:
   - Budget 12,500,000
   - Used 8,450,000
   - Remaining 4,050,000
   - 68% used

6. LINE notification status:
   - connected to Project ABC
   - green connected state

## Quick Action Buttons
- `+ รายงานหน้างาน`
- `+ บันทึกรูปภาพ`
- `+ แจ้งปัญหา / อุปสรรค`
- `ขออนุมัติ`
- `ดูแผนงาน (Gantt)`

---

# Screen 4 — Admin Dashboard

## Admin Sidebar
- ภาพรวมระบบ
- จัดการผู้ใช้งาน
- จัดการแพ็กเกจ
- จัดการโมดูล & สิทธิ์
- องค์กร / ลูกค้า
- การใช้งานระบบ
- ล็อกกิจกรรม (Logs)
- การตั้งค่าระบบ
- ศูนย์ช่วยเหลือ / แชต

## Metrics
- องค์กรทั้งหมด: 48
- ผู้ใช้งานทั้งหมด: 236
- โครงการทั้งหมด: 127
- รายได้รวมปีนี้: 2,450,000 บาท

## Package Management Table
Columns:
- แพ็กเกจ
- ราคา/เดือน
- ผู้ใช้สูงสุด
- พื้นที่เก็บข้อมูล
- จัดการ

Rows:
- Free | 0 บาท | 3 คน | 1 GB
- Pro | 990 บาท | 10 คน | 10 GB
- Team | 2,490 บาท | 30 คน | 100 GB
- Enterprise | ติดต่อฝ่ายขาย | ไม่จำกัด | ไม่จำกัด

## Module Permission Table
Rows:
- ควบคุมงานก่อสร้าง
- ราคากลาง / BOQ
- รายงานหน้างาน
- Dashboard ผู้บริหาร
- AI Assistant

Columns:
- Free
- Pro
- Team
- Enterprise

Use check icons for enabled and lock icons for disabled.

## Support Overview
- แชตทั้งหมด 128
- รอตอบกลับ 5
- ตอบแล้ว 123
- ความพึงพอใจ 96%

---

# Floating Chatbot

## Position
- fixed bottom-right
- visible on Program Selector, User Workspace, and Admin
- icon: robot/avatar
- label: `ผู้ช่วยการใช้งาน`
- subtitle: `แชตบอทแนะนำการใช้งาน`
- green online dot

## Behavior
- Clicking opens a compact chat panel
- Initial messages:
  - `สวัสดีครับ ผมช่วยแนะนำการใช้งานระบบได้`
  - Quick replies:
    - `วิธีสร้างรายงานหน้างาน`
    - `วิธีอัปโหลดรูป`
    - `วิธีกลับไปเลือกโปรแกรม`
    - `อัปเกรดแพ็กเกจ`

---

# Mock Data Structure

```ts
const currentUser = {
  name: "วิศวกร ธนวัฒน์",
  role: "user", // "user" | "admin"
  plan: "Team",
  organization: "บริษัท สร้างดี จำกัด",
};

const plans = {
  Free: { users: 3, storage: "1 GB" },
  Pro: { users: 10, storage: "10 GB" },
  Team: { users: 30, storage: "100 GB" },
  Enterprise: { users: "ไม่จำกัด", storage: "ไม่จำกัด" },
};

const modulePermissions = {
  "ควบคุมงานก่อสร้าง": ["Free", "Pro", "Team", "Enterprise"],
  "ราคากลาง / BOQ": ["Pro", "Team", "Enterprise"],
  "รายงานหน้างาน": ["Free", "Pro", "Team", "Enterprise"],
  "Dashboard ผู้บริหาร": ["Enterprise"],
  "AI Assistant": ["Team", "Enterprise"],
};
```

---

# Acceptance Criteria
- หน้าเว็บดูใกล้เคียงภาพอ้างอิงทั้ง mood, spacing, card layout, และสี
- Flow ใช้งานได้จริงด้วย mock state
- มีปุ่ม back/logout ตามที่กำหนด
- มีการแยก user/admin
- มี chatbot ด้านขวาล่าง
- Responsive ใช้งานบนมือถือได้
- ไม่ต้องทำ backend จริงในรอบแรก
- โค้ดอ่านง่าย แยก component / section ชัดเจน
