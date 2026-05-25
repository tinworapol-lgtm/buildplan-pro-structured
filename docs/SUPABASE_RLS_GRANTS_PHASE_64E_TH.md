# Supabase RLS Grants Phase 64E

เฟสนี้เพิ่ม GRANT ที่ชัดเจนใน `supabase/schema.sql` เพื่อให้ตาราง public beta พร้อมใช้งานกับ Supabase Data API โดยยังมี RLS เป็นตัวควบคุม row-level access

## เหตุผล

Supabase มีการเปลี่ยนแปลงด้าน Data API: ตารางใหม่อาจไม่ได้เปิดให้ role ใช้งานผ่าน Data API อัตโนมัติ จึงควรกำหนดสิทธิ์ `authenticated` ให้ชัดเจนใน schema

## ตารางและสิทธิ์

- `profiles`: `select`, `update`
- `subscriptions`: `select`
- `projects`: `select`, `insert`, `update`, `delete`
- `feedback`: `select`, `insert`
- `audit_logs`: `select`
- `error_events`: `select`, `insert`

ทุกตารางยังเปิด RLS และมี policy แบบ user-owning เช่น `auth.uid() = user_id` หรือ `auth.uid() = id`

## คำสั่งตรวจ

```powershell
npm run beta:supabase-preflight
```

หรือ

```powershell
node tools\supabase-rls-grants-preflight.js
```

## ขั้นตอนใช้จริง

1. เปิด Supabase SQL Editor
2. รัน `supabase/schema.sql`
3. ตรวจว่า RLS เปิดทุกตาราง
4. ตรวจว่า role `authenticated` มีสิทธิ์กับตาราง public beta
5. หลัง deploy Vercel env แล้วค่อยรัน:

```powershell
npm run beta:doctor
npm run beta:cloud-smoke
```

`beta:cloud-smoke` ต้องใช้ `BETA_LIVE_ACCESS_TOKEN` ของ user ทดสอบเพื่อยืนยันว่า save/load/archive project ทำงานจริง
