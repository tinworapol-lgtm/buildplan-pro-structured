# คู่มือเปิดใช้งาน BuildPlan Pro แบบจับมือทำ

## วิธีง่ายที่สุด

1. เปิดโฟลเดอร์นี้:

```text
D:\AI\01-แผนงานก่อสร้าง\NEW\BuildPlan-Pro-Structured
```

2. ดับเบิลคลิกไฟล์:

```text
Start-BuildPlan-Pro.cmd
```

3. รอสักครู่ โปรแกรมจะเปิด browser ไปที่:

```text
http://127.0.0.1:4177/
```

4. ถ้าต้องการปิดโปรแกรม ให้กลับไปที่หน้าต่างดำ แล้วกด:

```text
Ctrl + C
```

## ตรวจคุณภาพก่อนส่งให้คนอื่นลอง

เปิด PowerShell ในโฟลเดอร์โปรเจกต์ แล้วรัน:

```powershell
node .\tools\quality-gate.js
```

ถ้าเห็น:

```text
PASS production-audit
PASS structured-verify
PASS qa-preflight
pilot ready: true
```

แปลว่าส่งให้ทดลองใช้งานแบบ pilot/demo ได้

## สถานะขายจริง

ถ้ายังเห็น:

```text
paid production ready: false
```

แปลว่ายังต้องจัดการ dependency จาก CDN ก่อนนำไปขาย production จริง
