# Beta Activation Phase 67

เฟสนี้เพิ่มแผนตรวจความพร้อมสำหรับเปิด Public Beta 3 เดือน โดยเน้นระบบสมัครสมาชิกฟรีและ Cloud Save จริงผ่าน Supabase

## คำสั่งหลัก

```powershell
npm run beta:activation-plan
```

หรือระบุไฟล์ env:

```powershell
node tools\beta-activation-plan.js --file=.env.production.local
```

## Env ที่ต้องมีสำหรับ Beta

- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BETA_ADMIN_TOKEN`

ค่า beta ที่มี default:

- `BETA_TRIAL_DAYS=90`
- `BETA_PROJECT_LIMIT=10`
- `BETA_PROJECT_PAYLOAD_BYTES=750000`

ช่วง Public Beta ยัง **ไม่ต้องตั้ง Stripe** เพราะยังไม่เก็บเงิน และไม่ขอบัตรเครดิต

## ขั้นตอนเปิดใช้งานจริง

1. สร้าง Supabase project
2. เปิด Email OTP
3. รัน `supabase/schema.sql` ใน Supabase SQL Editor
4. ตั้งค่า env ด้านบนใน Vercel production
5. Deploy production ใหม่
6. รัน `npm run beta:member-preflight`
7. รัน `npm run beta:doctor`
8. สมัครสมาชิกฟรีด้วยอีเมลทดสอบจริง
9. ตั้ง `BETA_LIVE_ACCESS_TOKEN` เฉพาะในเครื่องทดสอบ
10. รัน `npm run beta:cloud-smoke`

## เป้าหมาย

- ปุ่ม `สมัครสมาชิกฟรี` ใช้งานได้จริง
- สมาชิกถูกบันทึกใน `profiles`
- trial 90 วันถูกสร้างใน `subscriptions`
- project save/load/archive ทำงานบน Cloud จริง
- Admin beta summary เห็นสมาชิกและ feedback ได้
# Beta env helper

ก่อนกรอกค่า production beta สามารถสร้างไฟล์ตัวอย่างได้จาก `.env.beta.example`

```powershell
npm run beta:env:init -- --write
```

ไฟล์นี้สร้าง `.env.production.local` สำหรับตรวจ readiness ในเครื่อง โดยไม่ต้องตั้ง Stripe ในช่วง Public Beta
