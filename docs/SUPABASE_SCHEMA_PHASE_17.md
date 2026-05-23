# Supabase Setup

1. สร้าง Supabase project
2. เปิด SQL Editor แล้วรันไฟล์ `supabase/schema.sql`
3. ตั้งค่า Auth provider ที่ต้องการ เช่น Email OTP หรือ Google
4. นำค่า Project URL, anon key และ service role key ไปใส่ใน Vercel Environment Variables

หลักการสำคัญ:
- service role key ใช้เฉพาะใน `api/*`
- browser ใช้ Supabase access token เป็น Bearer token เท่านั้น
- ตาราง projects เปิด RLS และผูกข้อมูลด้วย `auth.uid() = user_id`
