# Vercel Environment Setup Phase 18

Environment variables ที่ต้องตั้งใน Vercel:

- APP_BASE_URL
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_MONTHLY
- STRIPE_PRICE_YEARLY

หลังตั้งค่าแล้วให้ redeploy production แล้วตรวจ:

```powershell
npm run saas:check -- --require-production-env
npm run quality
```

`/api/system/readiness` จะแสดงเฉพาะ true/false ว่าค่า env มีหรือไม่ ไม่ส่งค่า secret กลับไปที่ browser
