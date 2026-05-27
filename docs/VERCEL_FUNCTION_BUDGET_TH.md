# Vercel Function Budget สำหรับ BuildPlan Pro

เอกสารนี้ใช้ตรวจและอธิบาย warning ประเภท Function Invocation บน Vercel

## สรุป

หน้าแรกของ BuildPlan Pro ถูกปรับให้เป็น static-first แล้ว คือการเปิด landing page ปกติไม่ควรเรียก `/api/*` หรือ Serverless Functions เอง

Function Invocations ควรเกิดเฉพาะตอน:

- ผู้ใช้กดสมัครสมาชิกหรือเข้าสู่ระบบด้วย Email OTP
- ผู้ใช้เปิด Account & Cloud แล้วกด refresh/save/list/export/feedback
- ทีมงานรัน smoke test หรือ beta doctor ที่ตั้งใจเรียก API
- ใช้งาน cloud save จริงหลังเปิด Supabase production

## วิธีตรวจ

ตรวจว่าเปิดหน้าแรกแล้วไม่มี API call:

```powershell
npm run smoke:static-first
```

ตรวจภาพรวมงบการเรียก Function:

```powershell
npm run ops:function-budget
```

รันทั้งหมดพร้อม quality gate:

```powershell
npm run quality
```

## อ่าน warning ของ Vercel อย่างไร

ข้อความบน Vercel เช่น `Your site is growing` เป็นยอดสะสมของรอบ billing/current usage ดังนั้นหลัง deploy fix แล้ว warning อาจยังอยู่ ไม่ได้แปลว่าเว็บยังยิง Function ตอนเปิดหน้าแรก

ให้ดูผลจาก:

- `npm run smoke:static-first` ต้องได้ `fetch calls: 0`
- `npm run ops:function-budget` ทุกข้อควรเป็น `PASS`
- Vercel Usage graph ควรเพิ่มช้าลงหลัง deploy แล้วรอสักระยะ

## ข้อควรระวัง

ถ้าจะเปิดระบบสมาชิกจริง ต้องยอมให้ Function Invocations เกิดจาก user action เช่น OTP, session, cloud project และ feedback แต่ไม่ควรเกิดจากการเปิด landing page เฉย ๆ
