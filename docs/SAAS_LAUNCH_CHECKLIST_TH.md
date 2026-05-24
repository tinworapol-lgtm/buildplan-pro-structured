# BuildPlan Pro SaaS Launch Checklist

สถานะปัจจุบัน: โครงระบบพร้อมสำหรับ Demo และพร้อมรอค่า Env จริงก่อนเปิดขาย

## 1. Supabase
- สร้าง Supabase project
- เปิด SQL Editor แล้วรันไฟล์ `supabase/schema.sql`
- เปิด Email OTP ใน Authentication
- คัดลอกค่าเหล่านี้ไปตั้งใน Vercel Environment Variables:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 2. Stripe
- สร้าง Product สำหรับ BuildPlan Pro
- สร้าง Price รายเดือน แล้วคัดลอกเป็น `STRIPE_PRICE_MONTHLY`
- สร้าง Price รายปี แล้วคัดลอกเป็น `STRIPE_PRICE_YEARLY`
- ตั้ง Webhook URL เป็น `https://buildplan-pro-structured.vercel.app/api/webhooks/stripe`
- เลือก event อย่างน้อย:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- คัดลอกค่า:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

## 3. Vercel
- ตั้ง `APP_BASE_URL=https://buildplan-pro-structured.vercel.app`
- ใส่ Env ทั้ง 8 ตัวจาก `.env.example`
- Deploy production ใหม่

## 4. Verify
- เปิด `/api/system/readiness` ต้องได้ `configured: true`
- รัน `node tools\\production-url-smoke.js`
- รัน `node tools\\quality-gate.js`
- ทดสอบ Login -> Checkout -> Webhook -> Cloud Save ด้วยบัญชีทดสอบ


## 5. Launch Doctor
- ใช้คำสั่ง `npm run saas:doctor` เพื่อตรวจ production readiness จากเว็บจริง
- ถ้าต้องการตรวจ URL อื่น ใช้ `node tools\\saas-launch-doctor.js --url=https://your-domain.example`
- รายงานจะถูกบันทึกที่ `reports/saas-launch-doctor-phase-32.json`


## 6. Env Helper
- Copy `.env.production.example` to `.env.production.local`.
- Fill real Supabase and Stripe values in `.env.production.local`.
- Run `npm run saas:env` to validate required values and print the Vercel env commands.
- Run each printed `vercel env add ... production` command, then deploy production again.


## 7. Windows Push Helper
- หลังจากกรอก `.env.production.local` แล้ว ให้รัน `npm run saas:env:push:dry` เพื่อตรวจแบบไม่ส่งค่า secret
- ถ้าถูกต้อง ให้รัน `npm run saas:env:push` เพื่อส่งค่าไปที่ Vercel production
- จากนั้นรัน `npm run deploy:prod`
- ปิดท้ายด้วย `npm run saas:doctor` เพื่อตรวจว่า `configured: true`


## 8. Activation Wizard
- หลังกรอก `.env.production.local` แล้ว ให้รัน `npm run saas:activate:dry` เพื่อตรวจทุกขั้นแบบปลอดภัย
- เมื่อพร้อมเปิดใช้จริง ให้รัน `npm run saas:activate`
- คำสั่งจริงจะ push env เข้า Vercel production, deploy production, แล้วรัน SaaS Doctor


## Phase 55 static demo mode

- Default production frontend runs in static-demo mode to avoid unnecessary Vercel Function Invocation usage.
- Auth, license, readiness, checkout, and cloud-save endpoints remain scaffolded but are not called until backend activation changes app-config endpoints/mode.
- Use local autosave and bundled sample project for pilot/demo usage.
