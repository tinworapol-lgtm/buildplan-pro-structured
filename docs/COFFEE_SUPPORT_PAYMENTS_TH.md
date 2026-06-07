# ระบบสนับสนุนค่ากาแฟ BuildPlan Pro

เฟสนี้ทำให้ปุ่ม “สนับสนุนค่ากาแฟ” พร้อมเชื่อมรับชำระเงินจริงแบบ one-time payment ผ่าน Stripe Checkout โดยยังไม่บังคับจ่ายเงินและไม่กระทบการใช้ฟรีเต็มฟังก์ชัน

## Flow

1. ผู้ใช้กด “สนับสนุนค่ากาแฟ”
2. เลือกระดับ Bronze / Silver / Gold / Platinum / Diamond
3. Frontend เรียก `POST /api/support`
4. ถ้า env พร้อม ระบบสร้าง pending row ใน `support_payments`
5. ระบบ redirect ไป Stripe Checkout
6. Stripe ส่ง webhook กลับ `/api/webhooks/stripe`
7. เมื่อ `checkout.session.completed` และ metadata เป็น `coffee_support` ระบบอัปเดต payment เป็น `paid`
8. ถ้ามี `user_id` ระบบอัปเดต `profiles.supporter_total` และ `profiles.supporter_level`

## Env ที่ต้องตั้งก่อนรับเงินจริง

```env
APP_BASE_URL=https://buildplan-pro-structured.vercel.app
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

ใช้ webhook endpoint:

```text
https://buildplan-pro-structured.vercel.app/api/webhooks/stripe
```

## Database

ให้รัน `supabase/schema.sql` ใน Supabase SQL Editor อีกครั้ง เพื่อเพิ่ม:

- `profiles.supporter_level`
- `profiles.supporter_total`
- `profiles.supporter_updated_at`
- `support_payments`
- RLS policy ให้ผู้ใช้เห็นเฉพาะยอดสนับสนุนของตัวเอง

## หมายเหตุ

- ถ้ายังไม่ได้ตั้ง env ระบบจะแจ้งว่า payment ยังไม่เปิดใช้งานและไม่บันทึกยอดปลอม
- การใช้ฟรีเต็มฟังก์ชันยังคงเปิดอยู่เหมือนเดิม
- ระดับ Supporter ใช้สำหรับ badge และสิทธิ์ทดลองฟังก์ชันใหม่ในอนาคต
