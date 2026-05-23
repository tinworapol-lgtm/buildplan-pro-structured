# Vendor Dependencies Phase 13

## External Dependencies In Current Prototype

| Dependency | Current Source | Production Recommendation |
|---|---|---|
| Tailwind CSS | `https://cdn.tailwindcss.com` | Compile local CSS before paid production |
| Font Awesome | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css` | Vendor pinned CSS/assets locally |
| Sarabun Font | `https://fonts.googleapis.com` | Self-host font files or document external dependency |
| SweetAlert2 | `https://cdn.jsdelivr.net/npm/sweetalert2@11` | Vendor exact JS build locally |

## Why This Matters

Paid customers should not depend on third-party CDNs for core app startup unless that is an explicit product decision. Local/vendor assets make offline demos, enterprise installs, and predictable releases easier.
