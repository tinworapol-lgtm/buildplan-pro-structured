# Live Beta Cloud Flow Phase 64D

เอกสารนี้ใช้สำหรับตรวจ live beta cloud flow หลังจากตั้งค่า Supabase production และ Vercel env จริงแล้ว

## คำสั่งหลัก

```powershell
npm run beta:cloud-smoke
```

คำสั่งนี้จะเรียก `tools/live-beta-cloud-flow-smoke.js` เพื่อตรวจ flow จริงของผู้ใช้ beta:

- ตรวจ `/api/session`
- ตรวจ `/api/license/status`
- list project ผ่าน `/api/projects`
- สร้าง project ทดสอบชื่อ `BuildPlan Pro Beta Smoke`
- load project ที่สร้าง
- archive project ทดสอบ

นี่คือ live beta cloud flow smoke สำหรับยืนยันว่า cloud save/load/delete ทำงานกับ production จริงก่อนเปิดให้ผู้ใช้ภายนอกทดลอง

## Environment ที่ต้องมี

```env
BUILDPLAN_PRODUCTION_URL=https://buildplan-pro-structured.vercel.app
BETA_LIVE_ACCESS_TOKEN=
```

ถ้าไม่มี `BETA_LIVE_ACCESS_TOKEN` เครื่องมือจะ skip และไม่ fail เพื่อให้ quality gate รันได้โดยไม่ต้องเก็บ secret ใน repo หรือ CI

## วิธีใช้งานกับผู้ใช้ทดสอบ

1. สมัครหรือล็อกอินด้วย email ทดสอบบน production
2. นำ access token ของ session นั้นมาใส่เป็น `BETA_LIVE_ACCESS_TOKEN` เฉพาะ terminal เครื่องทดสอบ
3. รัน `npm run beta:cloud-smoke`
4. ตรวจ report ที่ `reports/live-beta-cloud-flow-phase-64D.json`

## Audit Expectations

เมื่อ smoke ผ่าน ระบบควรสร้าง audit log อย่างน้อย:

- `project.save`
- `project.load`
- `project.archive`

ตัว smoke จะ archive project ทดสอบทันที เพื่อลดข้อมูลค้างในบัญชี beta

## Security

เครื่องมือนี้มี no-secret-leak scan ใน response body และจะไม่พิมพ์ token ลง console หรือ report
