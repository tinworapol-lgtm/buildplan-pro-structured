# Phase 20: Account / Cloud Smoke Test

เฟสนี้เพิ่ม smoke test สำหรับ Account/Cloud UI โดยไม่ต้องใช้ secret และไม่ต้องต่อ Supabase จริง

คำสั่ง:

```powershell
npm run smoke:account
npm run quality
```

สิ่งที่ตรวจ:
- หน้า `index.html` มีปุ่ม `btn-account-cloud`
- โหลด `assets/js/services/account-cloud-ui.js`
- service สร้าง `BuildPlanAccountCloud`
- เปิด panel แล้ว class เปลี่ยนเป็น `flex`
- มีช่อง email, ปุ่ม save cloud และปุ่ม list projects

หมายเหตุ: smoke นี้ใช้ VM + fake DOM เพื่อจับ regression ของ UI bridge ในเครื่องที่ยังไม่มี Playwright
