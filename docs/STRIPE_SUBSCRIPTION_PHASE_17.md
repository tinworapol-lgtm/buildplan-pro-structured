# Stripe Subscription Setup

1. สร้าง Product: BuildPlan Pro
2. สร้าง recurring price 2 รายการ: monthly และ yearly
3. ใส่ price id ลงใน `STRIPE_PRICE_MONTHLY` และ `STRIPE_PRICE_YEARLY`
4. ตั้ง webhook ไปที่ `/api/webhooks/stripe`
5. ใส่ webhook signing secret ลงใน `STRIPE_WEBHOOK_SECRET`

API `/api/checkout` จะสร้าง Checkout Session แบบ subscription และแนบ `user_id` กับ `plan` ไปใน metadata
