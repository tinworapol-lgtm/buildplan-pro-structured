# Live Beta Readiness Phase 64C

เอกสารนี้ใช้สำหรับตรวจความพร้อมก่อนเปิด public beta จริงของ BuildPlan Pro โดยยังไม่เปิด billing จริง และยังไม่เก็บบัตรเครดิต

## คำสั่งหลัก

```powershell
npm run beta:doctor
```

คำสั่งนี้จะเรียก `tools/live-beta-readiness-doctor.js` เพื่อตรวจ endpoint production สำคัญ เช่น `/api/system/readiness`, `/api/session`, `/api/license/status`, `/api/projects`, `/api/feedback`, `/api/export`, และ `/api/errors`

## Environment ที่ใช้

```env
BUILDPLAN_PRODUCTION_URL=https://buildplan-pro-structured.vercel.app
BETA_LIVE_ACCESS_TOKEN=
BETA_ADMIN_TOKEN=
```

- `BETA_LIVE_ACCESS_TOKEN` ใช้สำหรับตรวจ endpoint ที่ต้อง login จริง เช่น cloud project, subscription, export
- `BETA_ADMIN_TOKEN` ใช้สำหรับตรวจ admin summary
- ถ้าไม่ใส่ token ระบบจะข้าม auth/admin checks ในโหมดปกติ แต่จะ fail เมื่อใช้ `--strict`

## วิธีตรวจแบบ production beta

1. สมัครหรือล็อกอินบนเว็บ production ด้วย email ทดสอบ
2. นำ session access token ของ user ทดสอบมาใส่ `BETA_LIVE_ACCESS_TOKEN` เฉพาะในเครื่องที่ใช้ตรวจ
3. รัน `npm run beta:doctor`
4. อ่าน report ที่ `reports/live-beta-readiness-phase-64C.json`

## Strict Mode

```powershell
node tools/live-beta-readiness-doctor.js --strict
```

โหมดนี้ต้องมี token ครบ และทุก endpoint ที่เกี่ยวข้องต้องผ่านจริง เหมาะสำหรับตรวจรอบสุดท้ายก่อนประกาศ public beta

## Error Logging Write Probe

โดยปกติ doctor จะไม่ส่งข้อมูลทดสอบเข้า `/api/errors` เพื่อลดข้อมูลรบกวนใน production หากต้องการทดสอบการเขียนจริงให้รัน:

```powershell
node tools/live-beta-readiness-doctor.js --write-error-test
```

## no-secret-leak

doctor จะตรวจ response body เบื้องต้นว่าไม่มี secret pattern สำคัญ เช่น Stripe secret, webhook secret, service role key หรือ JWT token หลุดกลับมาจาก API

เป้าหมายของ live beta readiness คือให้ทีมตรวจ public signup, trial 3 เดือน, cloud save, feedback และ admin monitoring ได้ก่อนเปิดให้ผู้ใช้ภายนอกทดลองใช้งานจริง
