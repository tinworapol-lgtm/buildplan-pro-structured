# Phase 23: Production SaaS Readiness Smoke

เฟสนี้เพิ่ม smoke test สำหรับ `/api/system/readiness` บน production URL

คำสั่ง:

```powershell
npm run smoke:saas
```

สิ่งที่ตรวจ:
- endpoint `/api/system/readiness` ตอบ HTTP 200
- response เป็น JSON
- มี `configured` เป็น boolean
- มี `missing` เป็น array
- รายการ missing env เป็นชื่อ env ที่ระบบรู้จักเท่านั้น
- response ไม่ควรมีค่า secret เช่น Stripe secret, webhook secret หรือ JWT token

Smoke นี้ไม่ fail เพียงเพราะ env ยังไม่ครบ แต่จะรายงานว่าต้องตั้งค่าอะไรต่อ
