# คู่มือเปิดใช้งาน SaaS จริง Phase 18

เป้าหมายคือเปลี่ยนจากเว็บ demo เป็นระบบที่ผู้ใช้ login, จ่ายรายเดือน/รายปี และบันทึกไฟล์ขึ้น cloud ได้

ลำดับทำงาน:
1. สร้าง Supabase project
2. รัน `supabase/schema.sql` ใน SQL Editor
3. เปิด Auth provider ที่ต้องการ เช่น Email OTP หรือ Google
4. สร้าง Stripe Product และ Price รายเดือน/รายปี
5. ตั้งค่า Vercel Environment Variables ตาม `.env.example`
6. Deploy production ใหม่
7. รัน `npm run saas:check -- --require-production-env`
8. ทดสอบ login, checkout, webhook และ cloud save ด้วยบัญชีทดสอบ

ห้ามใส่ secret key ในไฟล์ frontend เช่น `index.html` หรือ `assets/js/*`
