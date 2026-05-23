# Phase 24: App Shell / Home / Login / Workspace

เฟสนี้เพิ่ม app shell หน้าแรกและหน้า login โดยไม่ย้าย logic แผนงานเดิมออกจาก workspace

Route ที่เพิ่ม:
- `home`: หน้าเริ่มต้น มีปุ่มเข้าสู่ระบบและเปิด workspace
- `login`: หน้า email OTP login ที่ใช้ `BuildPlanAuth`
- `workspace`: หน้าแผนงานเดิมทั้งหมด

คำสั่งตรวจ:

```powershell
npm run smoke:shell
npm run quality
```

หมายเหตุ: หน้า login จะส่ง OTP จริงได้เมื่อ Supabase env ถูกตั้งค่าบน Vercel แล้ว
