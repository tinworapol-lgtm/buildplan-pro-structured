# คู่มือเอาขึ้นเว็บแบบ Static Demo

## สถานะตอนนี้

แพ็กนี้พร้อมสำหรับเอาขึ้นเว็บให้คนทดลองใช้แบบ demo/pilot แล้ว แต่ยังไม่ใช่ระบบขายรายเดือนเต็มรูปแบบ

## วิธีที่แนะนำ: Vercel

1. เปิด PowerShell ที่โฟลเดอร์:

```text
D:\AI\01-แผนงานก่อสร้าง\NEW\BuildPlan-Pro-Structured
```

2. ตรวจคุณภาพ:

```powershell
node .\tools\quality-gate.js
```

3. ถ้ามี Vercel CLI และ login แล้ว ให้ deploy preview:

```powershell
vercel
```

4. ถ้าต้องการ production:

```powershell
vercel --prod
```

## ถ้ายังไม่ได้ login Vercel

รัน:

```powershell
vercel login
```

แล้วทำตามขั้นตอนใน browser

## สิ่งที่ยังไม่ใช่ระบบขายจริง

- ยังไม่มี login ของลูกค้า
- ยังไม่มีระบบตัดเงินรายเดือน/รายปี
- ยังไม่มี cloud database สำหรับโปรเจกต์
- license ยังเป็น `local-demo`

ระบบเหล่านี้เป็น Phase ถัดไปหลังจากมี URL demo แล้ว


## URL ที่ Deploy แล้ว

เปิดใช้งานได้ที่:

```text
https://buildplan-pro-structured.vercel.app/
```

หมายเหตุ: URL นี้เป็น static demo ยังไม่มีระบบ login, รายเดือน, หรือ cloud save
