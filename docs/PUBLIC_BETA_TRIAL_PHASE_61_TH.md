# Phase 61-63 Public Beta Trial

สถานะ: เปิดโครงสร้าง public beta สำหรับทดลองใช้ฟรี 3 เดือน โดยใช้ Supabase Auth/Database และ cloud save จริงเมื่อใส่ environment variables ครบ

## สิ่งที่เพิ่ม

- `BuildPlanConfig` เปลี่ยนเป็น `public-beta`
- Login ใช้ `/api/auth/start` และ `/api/auth/verify`
- Session/license ใช้ `/api/session` และ `/api/license/status`
- Cloud project ใช้ `/api/projects`
- Feedback ใช้ `/api/feedback`
- Export ข้อมูลผู้ใช้ใช้ `/api/export`
- Trial 3 เดือนถูกสร้างอัตโนมัติหลัง verify OTP สำเร็จ
- Trial ใช้ `package_code = 599`, `billing_cycle = trial`, `status = trialing`
- จำกัด beta cloud project เริ่มต้น 10 project/user และ payload 750 KB/project
- Audit log บันทึก login, save/load/archive project, feedback และ user export

## ต้องตั้งค่าก่อนใช้งานจริง

1. สร้าง Supabase project
2. เปิด Email OTP ใน Supabase Auth
3. รัน `supabase/schema.sql` ใน SQL Editor
4. ตั้งค่า Vercel env:
   - `APP_BASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BETA_ADMIN_TOKEN`
   - `BETA_TRIAL_DAYS` ถ้าต้องการเปลี่ยนจาก 90 วัน
5. Deploy production ใหม่
6. ตรวจ `/api/system/readiness`

## Verification

- `node tools\public-beta-preflight.js`
- `node tools\public-beta-hardening-preflight.js`
- `node tools\public-beta-flow-smoke.js`
- `node tools\quality-gate.js`
- ทดสอบจริง: signup -> verify OTP -> save cloud -> reload -> list/load project

