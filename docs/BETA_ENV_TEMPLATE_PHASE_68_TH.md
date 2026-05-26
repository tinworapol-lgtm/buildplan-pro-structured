# Phase 68: Public Beta Env Template

เอกสารนี้เป็นขั้นตอนเตรียมไฟล์ environment สำหรับเปิด Public Beta ของ BuildPlan Pro โดยไม่ต้องตั้งค่า Stripe ในรอบทดลองใช้งานฟรี 3 เดือน

## เป้าหมาย

- สร้าง template เฉพาะ Public Beta ที่ต้องใช้ Supabase และ admin token เท่านั้น
- ช่วยสร้าง `.env.production.local` สำหรับตรวจ readiness ในเครื่อง
- ลดความสับสนจากไฟล์ production SaaS เดิมที่มี Stripe

## วิธีใช้งาน

ตรวจ template แบบ dry run:

```powershell
npm run beta:env:init
```

สร้างไฟล์ `.env.production.local`:

```powershell
npm run beta:env:init -- --write
```

ถ้ามีไฟล์เดิมอยู่แล้ว ระบบจะไม่เขียนทับ และจะแจ้งว่า refusing to overwrite ถ้าต้องการเขียนทับจริงให้ใช้:

```powershell
npm run beta:env:init -- --write --force
```

## ค่าที่ต้องกรอก

เปิด `.env.production.local` แล้วกรอก:

- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BETA_ADMIN_TOKEN`
- `BETA_TRIAL_DAYS`
- `BETA_PROJECT_LIMIT`
- `BETA_PROJECT_PAYLOAD_BYTES`

Public Beta รอบนี้ไม่ต้องตั้ง Stripe เพราะยังไม่เปิดเก็บเงินจริง

## ตรวจความพร้อมหลังกรอกค่า

```powershell
npm run beta:activation-plan
npm run beta:member-preflight
npm run beta:doctor
npm run beta:cloud-smoke
```

ถ้าทุกอย่างผ่านแล้วจึงนำค่า env ไปตั้งใน Vercel และ redeploy production
