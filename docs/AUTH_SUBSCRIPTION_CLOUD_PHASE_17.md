# Phase 17: Login / Subscription / Cloud Save Scaffold

สถานะเฟสนี้คือ backend scaffold พร้อมต่อจริง แต่ยังไม่เปิดบังคับ login ในหน้าเว็บเดิมจนกว่าจะใส่ environment variables ครบ

สิ่งที่เพิ่ม:
- Vercel API routes สำหรับ session, license status, checkout, Stripe webhook และ cloud projects
- Frontend adapters: `BuildPlanAuth` และ `BuildPlanCloud`
- Supabase schema สำหรับ profiles, subscriptions และ projects พร้อม RLS
- Stripe Checkout scaffold สำหรับรายเดือนและรายปี

ก่อนขายจริงต้องทำเพิ่ม:
- สร้าง Supabase project และรัน `supabase/schema.sql`
- ตั้งค่า Stripe Product/Price รายเดือนและรายปี
- ใส่ค่า env ใน Vercel ตาม `.env.example`
- เปลี่ยน `licensing.mode` จาก `local-demo` เป็น `server` และเปิด `loginRequired`
