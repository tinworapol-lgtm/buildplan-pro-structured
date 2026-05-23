# Phase 19: Account / Cloud UI

เฟสนี้เพิ่มปุ่ม Account/Cloud บน ribbon เพื่อให้ผู้ใช้เริ่ม login ด้วย email OTP และสั่ง cloud save/list projects ได้จากหน้าโปรแกรม

ไฟล์สำคัญ:
- `api/auth/start.js` ส่ง OTP ไปที่ email ผ่าน Supabase Auth
- `api/auth/verify.js` ตรวจ OTP และส่ง access token กลับให้ browser
- `assets/js/services/account-cloud-ui.js` สร้าง modal Account/Cloud
- `contracts/auth-otp-api.contract.json` กำหนด API contract

ข้อควรรู้:
- ต้องตั้งค่า Supabase env ใน Vercel ก่อนจึงจะส่ง OTP จริงได้
- Email template ของ Supabase ควรใส่ `{{ .Token }}` เพื่อให้ผู้ใช้เห็น code
- Cloud save ใช้ Bearer token จากการ login ไปเรียก `/api/projects`
