# Phase 72: Supabase Production Activation สำหรับ Public Beta

เป้าหมายคือเปิดระบบสมัครสมาชิกจริงด้วย Supabase Auth Email OTP และ Cloud save จริง โดยยังไม่เปิด Stripe/Billing

## ลำดับทำงาน

1. สร้าง Supabase production project
2. เปิด Auth แบบ Email OTP ใน Supabase
3. เปิด SQL Editor แล้วรันไฟล์ `supabase/schema.sql`
4. สร้างไฟล์ env beta:

```powershell
npm run beta:env:init -- --write
```

5. กรอกค่าใน `.env.production.local`:

- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BETA_ADMIN_TOKEN`

6. ตรวจ activation:

```powershell
npm run beta:supabase-activation
```

7. ตรวจ env push แบบ dry run:

```powershell
npm run beta:env:push:dry
```

8. ส่ง env ขึ้น Vercel production:

```powershell
npm run beta:env:push
```

9. deploy production ใหม่ แล้วตรวจ:

```powershell
npm run beta:doctor
```

10. สมัครด้วยอีเมลจริงบนเว็บ production แล้วนำ access token มาใส่เป็น `BETA_LIVE_ACCESS_TOKEN` เฉพาะในเครื่อง จากนั้นรัน:

```powershell
npm run beta:cloud-smoke
```

## หมายเหตุด้านความปลอดภัย

- ไม่ต้องตั้ง Stripe ใน Phase นี้
- ห้าม commit `.env.production.local`
- ห้ามใส่ `SUPABASE_SERVICE_ROLE_KEY` ใน frontend
- `supabase/schema.sql` มี RLS และ grants สำหรับ Data API แล้ว ต้องรันครบทั้งไฟล์
- ถ้า Supabase Data API ไม่เห็น table หลังรัน SQL ให้ตรวจ grants และ Data API settings ใน Supabase dashboard
