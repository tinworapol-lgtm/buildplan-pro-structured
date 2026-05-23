# Phase 22: Vendor Dependency Localization

เฟสนี้ย้าย dependency หลักจาก CDN มาไว้ในโปรเจกต์เพื่อลดความเสี่ยงของ production:

- Tailwind CDN runtime -> `assets/vendor/tailwind/tailwindcss-cdn.js`
- Font Awesome CSS/webfonts -> `assets/vendor/fontawesome`
- SweetAlert2 -> `assets/vendor/sweetalert2/sweetalert2.all.min.js`
- Sarabun fallback CSS -> `assets/vendor/fonts/sarabun.css`

หลังเฟสนี้ `index.html` ไม่ควรมี URL external CDN เหล่านี้อีก:
- cdn.tailwindcss.com
- cdnjs.cloudflare.com
- fonts.googleapis.com
- cdn.jsdelivr.net/npm/sweetalert2

หมายเหตุ: Tailwind runtime ยังเป็น runtime compiler แบบ local vendor ไม่ใช่ production compiled CSS pipeline เต็มรูปแบบ แต่ไม่มีการโหลดจาก CDN แล้ว
