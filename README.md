# SportZone — Premium Sports eCommerce (Next.js + MongoDB)

A Nike-inspired, full-stack sports store with customer storefront, admin dashboard,
Gemini-powered AI chatbot, wishlist, reviews, and personalized recommendations.

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB running locally on `mongodb://localhost:27017` (or a cloud URI)
- Yarn

### Install & Run
```bash
yarn install
```

Create a `.env` file at project root:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=sportzone
NEXT_PUBLIC_BASE_URL=http://localhost:3000
CORS_ORIGINS=*

# AI Chatbot — get a key at https://emergentagent.com
EMERGENT_LLM_KEY=sk-emergent-XXXXXXXX

# Admin (optional overrides)
ADMIN_PASSWORD=sportzone123
ADMIN_TOKEN=sportzone-admin-2025
```

Run dev server:
```bash
yarn dev
```

Open `http://localhost:3000` — 48 sample products across 8 sports auto-seed on first request.

### Admin Dashboard
- URL: `http://localhost:3000/admin`
- Password: `sportzone123` (change via `ADMIN_PASSWORD` env var)

## Features

### Customer
- Nike-style animated hero, sticky header, live search suggestions
- 8 sport categories, filters (category / brand / price slider / rating), 5 sort modes
- Product detail: 4-image gallery + zoom, colors, sizes, specs, reviews
- Cart drawer with quantity controls, coupon codes (`SPORT10`, `FLAT500`, `MEGA25`)
- 2-step checkout with tax + shipping calc, mock payments (Razorpay/Stripe/COD)
- Email/password accounts with 30-day sessions, wishlist, star reviews
- Personalized "Just for You" row after browsing 2+ products
- Floating AI chatbot (Gemini 2.5 Flash) grounded on catalog with multi-turn memory

### Admin
- Overview: revenue chart (14 days), category pie, top products, KPI cards
- Products: CRUD with search, feature flag, image URLs, stock control
- Orders: table with inline status updates (confirmed → processing → shipped → delivered)
- Coupons: create % or ₹ discount codes with min order and description

## Deferred / Ready to Enable
- **Google OAuth** — button is in the auth modal marked "coming soon", ready to wire up when you add `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
- **Live Payments** — Razorpay and Stripe placeholders show "demo" tag. Add `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` and `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` and wire up the checkout POST.

## Project Structure
```
app/
├── api/[[...path]]/route.js   # All backend REST endpoints (single catch-all)
├── page.js                     # Customer storefront (SPA-style)
├── admin/page.js               # Admin dashboard
└── layout.js                   # Root layout
components/
├── ChatBot.jsx                 # Floating AI assistant
└── ui/                         # shadcn/ui components
```

## Tech Stack
- Next.js 15 (App Router, catch-all API routes)
- MongoDB (auto-seed on first request)
- Tailwind CSS + shadcn/ui + Framer Motion + Recharts
- lucide-react icons
- Gemini 2.5 Flash via `emergentintegrations`

## Test User
For quick testing, sign up any new account or use the pre-seeded test account:
- Email: `test@sportzone.com`
- Password: `secret123`

Enjoy! 🏆
