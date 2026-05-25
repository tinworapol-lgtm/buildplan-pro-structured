# Member Signup Phase 65

เฟสนี้เพิ่มปุ่ม `สมัครสมาชิกฟรี` และทำให้ `profiles` เป็นฐานข้อมูลสมาชิกหลักก่อนเปิด Public Beta 3 เดือน

## Member Profile

ข้อมูลสมาชิกถูกเก็บใน `profiles` และผูกกับ `auth.users.id`

- `full_name`
- `phone`
- `organization`
- `role`
- `member_status`
- `beta_source`
- `last_seen_at`

ระบบยังใช้ Email OTP ของ Supabase Auth โดยส่ง `memberProfile` ไปพร้อมกับ signup/verify flow

## Flow

1. ผู้ใช้กด `สมัครสมาชิกฟรี`
2. กรอกชื่อ อีเมล เบอร์โทร บริษัท/หน่วยงาน และบทบาท
3. ระบบเรียก `/api/auth/start` พร้อม `memberProfile`
4. ผู้ใช้กรอก OTP
5. ระบบเรียก `/api/auth/verify` พร้อม `memberProfile`
6. API upsert `profiles` และสร้าง trial `package_code = 599`
7. ผู้ใช้เข้า workspace ได้ทันที

ถ้า Supabase env ยังไม่พร้อม UI จะแสดงข้อความ `ระบบสมาชิกยังไม่เปิดใช้งาน`

## Checks

```powershell
npm run beta:member-preflight
npm run quality
```

เมื่อเปิด Supabase production จริง ให้ทดสอบ:

- สมัครสมาชิกใหม่
- ยืนยัน OTP
- ตรวจ row ใน `profiles`
- ตรวจ row ใน `subscriptions`
- login ซ้ำด้วย email เดิม
- save/load cloud project
