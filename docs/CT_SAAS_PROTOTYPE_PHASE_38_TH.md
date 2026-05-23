# Construction Tech SaaS Prototype - Phase 38

## สถานะปัจจุบัน
ระบบมี frontend prototype สำหรับขายเป็น SaaS แล้ว โดยยังใช้ mock data และยังไม่เชื่อม backend จริง

Production URL:
https://buildplan-pro-structured.vercel.app/

## หน้าที่พร้อมใช้งาน
- Landing + Login
- Program Selector ตามสิทธิ์แพ็กเกจ
- User Workspace Dashboard
- Admin Dashboard
- Floating Help Chatbot
- ปุ่มเข้าแผนงาน Gantt เดิมจาก User Dashboard

## Mock State
- ผู้ใช้งานทั่วไปเข้าสู่ Program Selector
- ผู้ดูแลระบบเข้าสู่ Admin Dashboard
- แพ็กเกจตั้งต้นเป็น Team
- Dashboard ผู้บริหารถูกล็อกไว้สำหรับ Enterprise
- AI Assistant ใช้งานได้ใน Team / Enterprise

## Backend ที่ยังต้องต่อจริง
- Supabase Auth สำหรับ login/OTP
- Supabase Database/Storage สำหรับ cloud save และ tenant data
- Stripe Checkout + Webhook สำหรับรายเดือน/รายปี
- Subscription guard สำหรับล็อกหน้าเมื่อหมดอายุ
- Admin role/permission จากฐานข้อมูลจริง

## QA ที่เพิ่มในเฟสนี้
- production smoke ตรวจหน้า SaaS ใหม่ทั้งหมด
- production smoke ตรวจไฟล์ ct-saas-mock-app.js
- app shell smoke ตรวจ route home/login/programs/user-dashboard/admin-dashboard/workspace

## คำสั่งตรวจ
```powershell
node tools\app-shell-smoke.js
node tools\production-url-smoke.js
node tools\quality-gate.js
```


## Phase 39 - Mock Subscription Guard
- เพิ่มแผงสถานะสมาชิกในหน้าเลือกโปรแกรม
- เลือกแพ็กเกจ mock ได้: Free, Pro, Team, Enterprise
- จำลองสถานะสมาชิกได้: ปกติ, ใกล้หมดอายุ, หมดอายุ
- เมื่อสมาชิกหมดอายุ ระบบจะล็อกโมดูลและล็อกปุ่มเข้า Gantt
- ปุ่มต่ออายุเป็น mock flow สำหรับเดโม ก่อนต่อ Stripe จริง


## Phase 40 - Mock Billing / Upgrade Modal
- เพิ่ม modal Billing & Upgrade สำหรับเดโมก่อนต่อ Stripe
- เลือกรอบชำระเงิน mock ได้: รายเดือน / รายปี
- เลือกแพ็กเกจ mock ได้: Pro, Team, Enterprise
- โมดูลที่ล็อกหรือสมาชิกหมดอายุจะพาไป Billing modal
- เมื่อเลือกแพ็กเกจ ระบบจะต่ออายุและปลดล็อกตามสิทธิ์ mock ทันที

- เพิ่ม route `#billing` สำหรับเปิด Billing modal โดยตรง
- app-shell รองรับ hash route ที่มีพารามิเตอร์หลัง `?` หรือ `&`
