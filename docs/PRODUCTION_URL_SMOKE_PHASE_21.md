# Phase 21: Production URL Smoke

เฟสนี้เพิ่ม smoke test สำหรับ URL production หลัง deploy

คำสั่ง:

```powershell
npm run smoke:prod
```

สิ่งที่ตรวจ:
- production URL ตอบ HTTP 200
- HTML มีปุ่ม `btn-account-cloud`
- โหลด `account-cloud-ui.js`
- มี marker `structured-phase-21`
- โหลด `saas-readiness-adapter.js`

หากยังไม่ได้ deploy phase ล่าสุด คำสั่งนี้จะ fail ซึ่งเป็นพฤติกรรมที่ถูกต้อง
