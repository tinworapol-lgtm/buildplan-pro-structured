# คู่มือเปิดใช้งาน BuildPlan Pro แบบจับมือทำ

## ใช้งานผ่านเว็บ

เปิดลิงก์นี้:

```text
https://buildplan-pro-structured.vercel.app/
```

สถานะปัจจุบันเป็น static-demo สำหรับทดลองใช้งานและรีวิวสินค้า ยังไม่ใช่ระบบชำระเงินจริงเต็มรูปแบบ

## ใช้งานบนเครื่อง

1. เปิดโฟลเดอร์:

```text
D:\AI\01-แผนงานก่อสร้าง\NEW\BuildPlan-Pro-Structured
```

2. ดับเบิลคลิก:

```text
Start-BuildPlan-Pro.cmd
```

3. โปรแกรมจะเปิด:

```text
http://127.0.0.1:4177/
```

## ตรวจคุณภาพก่อนส่งให้คนอื่นลอง

เปิด PowerShell ในโฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
node .\tools\quality-gate.js
```

ควรเห็นบรรทัดสำคัญ:

```text
PASS phase-regression
pilot ready: true
paid production ready: true
```

## สถานะขายจริง

ระบบหน้าเว็บและ workflow พร้อมสำหรับ demo/pilot แล้ว แต่ถ้าจะขายแบบ subscription จริง ต้องเปิด Supabase/Stripe และตั้งค่า environment production ก่อน
