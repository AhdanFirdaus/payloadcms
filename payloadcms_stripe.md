# PayloadCMS + Stripe Integration Guide

Panduan lengkap cara kerja integrasi PayloadCMS dengan Stripe untuk pembayaran kursus online dan best practices keamanannya.

## 📋 Table of Contents

1. [Arsitektur Sistem](#arsitektur-sistem)
2. [Komponen Utama](#komponen-utama)
3. [Alur Kerja Payment](#alur-kerja-payment)
4. [Setup & Konfigurasi](#setup--konfigurasi)
5. [Keamanan](#keamanan)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Arsitektur Sistem

### Overview Diagram

```
User Dashboard
    ↓
Buy Course Button
    ↓
Checkout Page (Preview Curriculum)
    ↓
"Pay $X" Button (Client Component)
    ↓
POST /api/stripe/checkout (Server Route)
    ↓
Stripe Session Created
    ↓
User Redirected to Stripe Checkout (External)
    ↓
Card Payment Processing
    ↓
Stripe Webhook → POST /api/stripe/webhook
    ↓
Verify Signature & Create Participation
    ↓
Redirect Back to Buy Page with session_id
    ↓
Finalize Participation (Double-check payment)
    ↓
User Sees "You Already Own This Course"
```

### Database Flow

```
Courses Collection
├── id: string
├── title: string
├── price: number ← REQUIRED untuk payment
├── image: Media
└── ...

Customers Collection
├── id: string
├── email: string
└── ...

Participation Collection (Created on successful payment)
├── id: string
├── course: ref → Courses
├── customer: ref → Customers
├── createdAt: date
└── ...
```

---

## Komponen Utama

### 1. **Courses Collection Schema** (`src/collections/courses/Courses.ts`)

```typescript
// Tambahkan field price untuk product pricing
{
  name: 'price',
  label: 'Price (USD)',
  type: 'number',
  required: true,  // WAJIB ada, jangan bypass
  min: 1,          // Minimal harga $1
}
```

**Penting**:

- Price field HARUS ada di collection sebelum membuat Stripe session
- Gunakan tipe `number` bukan `text` untuk validasi otomatis
- Set `required: true` agar user tidak bisa skip di admin

### 2. **Stripe Utility Functions** (`src/utils/stripe.ts`)

```typescript
// A. Stripe Client Initialization
stripe = new Stripe(process.env.STRIPE_SK || '')

// B. Ensure Participation (Idempotent - aman di-trigger berkali-kali)
ensureParticipation(courseId: string, customerId: string)
├── Cek apakah participation sudah ada
├── Jika ada → Return existing
└── Jika tidak → Create baru

// C. Finalize Checkout Session
finalizeCheckoutSession(sessionId: string)
├── Query Stripe API untuk session details
├── Validasi payment_status === 'paid'
├── Call ensureParticipation untuk create/update DB
└── Return hasil
```

**Mengapa idempotent?** Webhook bisa trigger berkali-kali. Dengan idempotent, retry aman dan tidak create duplikat participation.

### 3. **Checkout Route** (`src/app/api/stripe/checkout/route.ts`)

Endpoint: `POST /api/stripe/checkout`

**Alur**:

```
1. Validasi user authentication
   └─ Cek collection === 'customers'

2. Validasi course exists & punya price valid
   └─ Math.round(course.price * 100) → cents

3. Create Stripe Session
   └─ Set metadata (courseId, customerId)
   └─ Set success_url & cancel_url

4. Return session URL ke client
   └─ Client redirect ke Stripe Checkout
```

**Payload Contoh**:

```json
Request:
{
  "courseId": "69f98a0c02cf92244a87fb34"
}

Response:
{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

### 4. **Webhook Route** (`src/app/api/stripe/webhook/route.ts`)

Endpoint: `POST /api/stripe/webhook`

**Alur**:

```
1. Verifikasi signature (security checkpoint)
   └─ stripe.webhooks.constructEvent()
   └─ Validasi STRIPE_WEBHOOK_SECRET

2. Cek event type
   └─ event.type === 'checkout.session.completed'

3. Extract session metadata
   └─ session.metadata.courseId
   └─ session.metadata.customerId

4. Call finalizeCheckoutSession()
   └─ Sync payment status ke participation
```

**Webhook Events Tracked**:

- `checkout.session.completed` → Payment successful
- (Opsional) `charge.refunded` → Handle refund
- (Opsional) `customer.subscription.deleted` → Handle cancellation

### 5. **Buy/Checkout UI Components**

#### a. Buy Page (`src/app/(frontend)/(authenticated)/dashboard/course/[courseId]/buy/page.tsx`)

```typescript
// Server Component
// 1. Query course data (image, title, price, curriculum)
// 2. Handle session_id redirect dari Stripe
// 3. Call finalizeCheckoutSession jika session_id ada
// 4. Render:
//    - Curriculum preview (left)
//    - Price & CheckoutButton (right sidebar)
```

#### b. CheckoutButton Component (`src/app/(frontend)/(authenticated)/dashboard/course/[courseId]/buy/_components/CheckoutButton.tsx`)

```typescript
// Client Component
// 1. onClick → POST /api/stripe/checkout
// 2. Tampilkan loading spinner
// 3. Redirect ke result.url (Stripe Checkout)
// 4. Handle error dengan toast/message
```

---

## Alur Kerja Payment

### Step-by-Step User Journey

#### **Phase 1: Initiation (Client Side)**

```
User di Dashboard
  ↓
Click "Buy Course" button
  ↓
Navigate ke /dashboard/course/[courseId]/buy
```

#### **Phase 2: Checkout Page (Server Side)**

```
Server render buy page:
1. Query course dari Payload
   └─ SELECT id, title, price, image, curriculum FROM courses

2. Display curriculum preview
   └─ Show video blocks, quiz blocks, certificate

3. Display price & "Pay $X" button di sidebar
```

#### **Phase 3: Create Session (Client → Server)**

```
User click "Pay $49" button
  ↓
CheckoutButton.tsx (Client)
  ├─ Kumpulkan data: { courseId: "xxx" }
  └─ POST /api/stripe/checkout

checkout/route.ts (Server)
  ├─ Validasi user & course
  ├─ Hitung amount = Math.round(price * 100)
  │  └─ $49 → 4900 cents (Stripe pakai cents)
  ├─ Create Stripe Session
  │  ├─ product_data: { name, description, images }
  │  ├─ unit_amount: 4900
  │  ├─ metadata: { courseId, customerId }
  │  └─ success_url: /buy?session_id={CHECKOUT_SESSION_ID}
  └─ Return { url: "https://checkout.stripe.com/pay/..." }

Client
  └─ Redirect ke Stripe Checkout URL
```

#### **Phase 4: Payment Processing (External - Stripe)**

```
Stripe Hosted Checkout Page
  ├─ Display course info
  ├─ Form input: card, email, name, address
  ├─ User fill & submit
  ├─ Stripe process payment
  │  └─ Validasi card dengan issuer bank
  └─ Jika sukses:
     └─ Redirect ke success_url dengan session_id
```

#### **Phase 5: Webhook Processing (Background)**

```
Stripe Server
  ├─ Generate checkout.session.completed event
  └─ POST ke webhook URL: /api/stripe/webhook

webhook/route.ts (Server)
  ├─ Verifikasi signature
  │  └─ STRIPE_WEBHOOK_SECRET + timestamp → prevent tampering
  ├─ Extract courseId & customerId dari metadata
  ├─ Call finalizeCheckoutSession()
  │  ├─ Query Stripe session details
  │  ├─ Validasi payment_status === 'paid'
  │  └─ Create participation record di MongoDB
  └─ Return 200 OK
```

**Timing**: Webhook trigger dalam 1-5 detik setelah payment sukses, tapi tidak guaranteed instant.

#### **Phase 6: Client Redirect & Finalization**

```
Browser redirect ke success_url:
  /dashboard/course/[courseId]/buy?session_id=cs_test_...

buy/page.tsx (Server Component)
  ├─ Deteksi session_id di searchParams
  ├─ Call finalizeCheckoutSession(session_id)
  │  └─ Double-check payment_status === 'paid'
  │  └─ Ensure participation created
  ├─ Query participation dari database
  └─ Render "You already own this course" message
      ├─ Show "Resume Course" button (jika udah mulai)
      └─ Show "Start Course" button (jika belum)
```

### Timeline Dari User Perspective

```
T+0s   : User click "Pay $49"
T+0s   : Redirect ke Stripe Checkout
T+5s   : User isi card & klik "Pay"
T+6s   : Stripe process payment
T+7s   : Webhook trigger di background
T+10s  : Browser redirect back ke success_url
T+10s  : finalizeCheckoutSession() double-check
T+11s  : Page show "You already own this course"
```

---

## Setup & Konfigurasi

### Prerequisites

```
✅ Node.js 18+
✅ Next.js 14+ dengan App Router
✅ PayloadCMS 3.0+
✅ MongoDB instance (local atau cloud)
✅ Stripe account (https://stripe.com)
✅ Stripe CLI installed (untuk webhook testing)
```

### Step 1: Install Dependencies

```bash
npm install stripe
```

### Step 2: Setup Stripe Account

1. **Create Stripe Account**: https://dashboard.stripe.com/register
2. **Enable Test Mode** (default)
3. **Get Test Keys**:
   - Go to Settings → API Keys
   - Copy "Publishable key" (pk*test*...)
   - Copy "Secret key" (sk*test*...)

### Step 3: Configure Environment Variables

**File: `.env.local`**

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PK=pk_test_xxxxxxxxxxxxxx
STRIPE_SK=sk_test_xxxxxxxxxxxxxx

# Webhook Secret (setup nanti setelah Stripe CLI configured)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxx
```

**Catatan Keamanan**:

- `NEXT_PUBLIC_STRIPE_PK`: Boleh public (hanya buat client-side operations)
- `STRIPE_SK`: JANGAN commit, selalu di environment variable
- `STRIPE_WEBHOOK_SECRET`: JANGAN commit, setup di production via Stripe Dashboard

### Step 4: Add Price Field to Courses Collection

**File: `src/collections/courses/Courses.ts`**

```typescript
fields: [
  // ... existing fields
  {
    name: 'price',
    label: 'Price (USD)',
    type: 'number',
    required: true,
    min: 1,
    admin: {
      placeholder: 'e.g., 49',
      description: 'Price in USD for payment processing',
    },
  },
  // ... more fields
]
```

Lalu regenerate types:

```bash
npm run generate:types
```

### Step 5: Create Stripe Utilities

**File: `src/utils/stripe.ts`**

```typescript
import { Stripe } from 'stripe'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'

export const stripe = new Stripe(process.env.STRIPE_SK || '')

export async function ensureParticipation(courseId: string, customerId: string) {
  const payload = await getPayload({ config: configPromise })

  // Cek apakah sudah ada
  const existing = await payload.find({
    collection: 'participation',
    where: {
      course: { equals: courseId },
      customer: { equals: customerId },
    },
  })

  if (existing.docs.length > 0) {
    return existing.docs[0]
  }

  // Create baru
  return await payload.create({
    collection: 'participation',
    data: {
      course: courseId,
      customer: customerId,
    },
  })
}

export async function finalizeCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    throw new Error('Payment not completed')
  }

  const { courseId, customerId } = session.metadata || {}
  return ensureParticipation(courseId, customerId)
}
```

### Step 6: Create Checkout Route

**File: `src/app/api/stripe/checkout/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import { stripe } from '@/utils/stripe'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { courseId } = body

  // Get auth user dari payload
  const payload = await getPayload({ config: configPromise })
  const user = await payload.auth({ headers: req.headers })

  if (!user || user.collection !== 'customers') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get course data
  const course = await payload.findByID({
    collection: 'courses',
    id: courseId,
  })

  if (!course) {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 })
  }

  // Validate price
  if (typeof course.price !== 'number' || course.price <= 0) {
    return NextResponse.json({ error: 'Course price is invalid' }, { status: 400 })
  }

  // Create session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: course.title,
          },
          unit_amount: Math.round(course.price * 100), // Convert ke cents
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_BASEURL}/buy?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASEURL}/buy`,
    metadata: {
      courseId,
      customerId: user.id,
    },
  })

  return NextResponse.json({ url: session.url })
}
```

### Step 7: Create Webhook Route

**File: `src/app/api/stripe/webhook/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe'
import { finalizeCheckoutSession } from '@/utils/stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object

    try {
      await finalizeCheckoutSession(session.id)
    } catch (err) {
      return NextResponse.json({ error: `Error: ${err.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
```

### Step 8: Setup Webhook Secret (Development)

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Listen for Stripe events
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Copy output yang mirip: whsec_xxxxxxxxxxxxx
# Paste ke .env.local: STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Restart dev server agar env variable terbaca
```

### Step 9: Create Buy Page & Checkout Button

See implementation in project files:

- `src/app/(frontend)/(authenticated)/dashboard/course/[courseId]/buy/page.tsx`
- `src/app/(frontend)/(authenticated)/dashboard/course/[courseId]/buy/_components/CheckoutButton.tsx`

---

## Keamanan

### 🔒 Kritical Security Points

#### 1. **API Key Protection**

❌ **JANGAN LAKUKAN**:

```javascript
// NEVER commit secret key
const stripe = new Stripe('sk_test_xxx') // ❌ JANGAN

// NEVER expose secret key di client
fetch('/api/checkout', {
  body: JSON.stringify({ stripeKey: 'sk_test_xxx' }), // ❌ JANGAN
})
```

✅ **YANG BENAR**:

```bash
# .env.local (git-ignored)
STRIPE_SK=sk_test_xxx
```

```typescript
// Server-side only
import { stripe } from '@/utils/stripe'
const stripe = new Stripe(process.env.STRIPE_SK)
```

#### 2. **Webhook Signature Verification**

❌ **TIDAK AMAN** (vulnerable ke spoofing):

```typescript
const event = JSON.parse(body) // ❌ JANGAN - any attacker bisa spoof
```

✅ **YANG BENAR**:

```typescript
const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
// Verify signature + timestamp, reject jika old atau invalid
```

#### 3. **User Authentication & Authorization**

❌ **TIDAK AMAN**:

```typescript
// Terima courseId tanpa validasi user
const { courseId } = await req.json()
await stripe.checkout.sessions.create({ ... })
```

✅ **YANG BENAR**:

```typescript
// 1. Verify user authenticated
const user = await payload.auth({ headers: req.headers })
if (!user) return 401

// 2. Verify user boleh beli course (not duplicate)
const existing = await payload.find({
  collection: 'participation',
  where: {
    course: { equals: courseId },
    customer: { equals: user.id },
  },
})
if (existing.docs.length > 0) {
  return { error: 'Already purchased' }
}

// 3. Store user.id di metadata (jangan trust client)
metadata: {
  customerId: user.id
}
```

#### 4. **CSRF Protection (Built-in Next.js)**

Next.js App Router otomatis protect POST requests dengan CSRF tokens.

Tapi jika pake fetch manual, pastikan:

```typescript
fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ courseId }),
  credentials: 'include', // Include cookies untuk CSRF protection
})
```

#### 5. **Rate Limiting** (Optional tapi Recommended)

```typescript
// Prevent brute force checkout attempts
import { RateLimiter } from 'some-rate-limit-library'

const limiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // max 5 requests per minute
})

export async function POST(req: NextRequest) {
  const limited = await limiter.check(req.ip)
  if (limited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  // ... rest of logic
}
```

#### 6. **PCI Compliance** (Stripe Handles)

✅ **PayloadCMS + Stripe adalah PCI compliant** karena:

- Tidak pernah handle raw card data di server
- Semua card processing di Stripe servers (PCI compliant)
- PayloadCMS hanya penyimpan metadata

#### 7. **Environment Variables di Production**

**AWS / Vercel / Railway setup**:

```yaml
# Console → Settings → Environment Variables
STRIPE_SK = sk_live_xxxxx (production key)
STRIPE_WEBHOOK_SECRET = whsec_xxxxx (from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PK = pk_live_xxxxx
```

Jangan pernah simpan secrets di code atau commit history.

#### 8. **Idempotency Keys** (Optional - untuk retry safety)

```typescript
// Stripe session sudah idempotent di default
// Tapi untuk extra safety, bisa tambah idempotency key:

const session = await stripe.checkout.sessions.create(
  {
    mode: 'payment',
    // ...
  },
  {
    idempotencyKey: `${user.id}-${courseId}-${Date.now()}`,
  },
)
```

### Security Checklist

- [ ] Semua Stripe keys di `.env`, tidak di code
- [ ] `.env` di `.gitignore`
- [ ] Webhook signature verified dengan `stripe.webhooks.constructEvent()`
- [ ] User authentication diperlukan sebelum create session
- [ ] Server-side validation untuk course price
- [ ] Rate limiting pada checkout endpoint
- [ ] Production: Gunakan live keys (pk*live*, sk*live*, whsec\_...)
- [ ] Production: Enable webhook dari Stripe Dashboard, bukan CLI
- [ ] Regular rotation Stripe keys (quarterly recommended)
- [ ] Monitor Stripe webhook failures di dashboard

---

## Best Practices

### 1. **Error Handling & User Feedback**

```typescript
// ❌ Don't
await stripe.checkout.sessions.create({ ... })

// ✅ Do
try {
  const session = await stripe.checkout.sessions.create({ ... })
  return NextResponse.json({ url: session.url })
} catch (error) {
  console.error('Stripe error:', error.message)

  // Return user-friendly error message
  if (error.type === 'StripeInvalidRequestError') {
    return NextResponse.json(
      { error: 'Invalid course price. Please contact support.' },
      { status: 400 }
    )
  }

  return NextResponse.json(
    { error: 'Payment processing failed. Try again.' },
    { status: 500 }
  )
}
```

### 2. **Duplicate Purchase Prevention**

```typescript
// Check existing participation sebelum create session
const existing = await payload.find({
  collection: 'participation',
  where: {
    and: [{ course: { equals: courseId } }, { customer: { equals: user.id } }],
  },
})

if (existing.docs.length > 0) {
  return NextResponse.json(
    { error: 'Course already purchased' },
    { status: 409 }, // Conflict
  )
}
```

### 3. **Logging & Monitoring**

```typescript
// Log semua payment events untuk debugging
console.log({
  timestamp: new Date().toISOString(),
  event: 'checkout_session_created',
  courseId,
  customerId: user.id,
  amount: Math.round(course.price * 100),
  sessionId: session.id,
})

// Di production, gunakan logging service (Datadog, LogRocket, etc)
```

### 4. **Webhook Retry Handling**

```typescript
// Stripe retry webhook berkali-kali jika endpoint return non-2xx
// Jadi endpoint HARUS idempotent

// ✅ Idempotent (aman di retry):
async function finalizeCheckoutSession(sessionId: string) {
  // Check jika participation sudah ada
  const existing = await getParticipation(sessionId)
  if (existing) return existing // Return existing, jangan throw

  // Create jika belum ada
  return createParticipation(sessionId)
}

// ❌ Tidak idempotent (dangerous on retry):
async function finalizeCheckoutSession(sessionId: string) {
  // Langsung create tanpa check
  return createParticipation(sessionId) // Bisa create duplikat!
}
```

### 5. **Testing Payment Flow**

**Development** (Test Keys):

```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Web: http://localhost:3000
# Card: 4242 4242 4242 4242
# Date: Any future date
# CVC: Any 3 digits
```

**Staging** (Test Keys di staging server):

- Deploy dengan pk*test*, sk*test* keys
- Test webhook via Stripe CLI tunneling
- Validate before promoting to production

**Production** (Live Keys):

- Use pk*live*, sk*live* keys
- Enable webhook dari Stripe Dashboard (Settings → Webhooks)
- Monitor webhook delivery failures

### 6. **Metadata Best Practices**

```typescript
// Metadata untuk debug & tracking
metadata: {
  courseId,
  customerId,
  courseTitle: course.title,
  invoiceNo: `INV-${Date.now()}`,
  // Jangan simpan sensitive data (password, full card, dll)
}
```

### 7. **Refund & Dispute Handling**

```typescript
// Optional: Handle refunds via webhook
if (event.type === 'charge.refunded') {
  const { metadata } = event.data.object

  // Delete/mark participation sebagai refunded
  await payload.update({
    collection: 'participation',
    id: participation.id,
    data: {
      status: 'refunded',
      refundedAt: new Date(),
    },
  })
}
```

---

## Troubleshooting

### Problem 1: Webhook Not Receiving Events

**Gejala**: Participation tidak tercreate setelah payment

**Debug**:

```bash
# Check Stripe webhook endpoint
stripe trigger checkout.session.completed --mock

# Check logs
npm run dev

# Verify STRIPE_WEBHOOK_SECRET di .env
```

**Solution**:

1. Restart dev server setelah set STRIPE_WEBHOOK_SECRET
2. Run `stripe listen` di terminal terpisah
3. Check webhook URL format: `http://localhost:3000/api/stripe/webhook` (bukan `/webhooks`)

### Problem 2: "Invalid unit_amount"

**Gejala**: Stripe error "invalid_request_error: Invalid positive integer"

**Penyebab**: `course.price` adalah `undefined` atau `null`

**Solution**:

```typescript
// Add validation
if (!course.price || course.price <= 0) {
  return NextResponse.json({ error: 'Course must have valid price' }, { status: 400 })
}

const amount = Math.round(course.price * 100) // $49 → 4900 cents
```

### Problem 3: User Redirected Back Tapi Participation Tidak Ada

**Gejala**: Success page loading tapi participation query returns empty

**Penyebab**: Webhook delayed atau gagal

**Solution**:

```typescript
// In buy/page.tsx - wait for participation dengan retry
async function waitForParticipation(courseId, customerId, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const participation = await payload.find({
      collection: 'participation',
      where: { course: { equals: courseId }, customer: { equals: customerId } },
    })

    if (participation.docs.length > 0) return participation.docs[0]

    // Wait sebelum retry
    await new Promise((r) => setTimeout(r, 1000))
  }

  throw new Error('Participation creation timed out')
}
```

### Problem 4: "Missing STRIPE_WEBHOOK_SECRET"

**Gejala**: Webhook return 400 "Webhook Error: No signature provided"

**Solution**:

```bash
# 1. Set env variable
# .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 2. Restart server
npm run dev

# 3. Verify dalam code
console.log('Secret set:', !!process.env.STRIPE_WEBHOOK_SECRET)
```

### Problem 5: "Payment Method Required" di Stripe Checkout

**Gejala**: Stripe form tidak bisa submit card

**Solution**:

```typescript
// Make sure publishable key correct
<CheckoutButton
  courseId={courseId}
  stripeKey={process.env.NEXT_PUBLIC_STRIPE_PK}
/>
```

### Problem 6: "CORS Error" When Calling Checkout Route

**Gejala**: fetch ke `/api/stripe/checkout` blocked by CORS

**Solution**:

```typescript
// Pastikan fetch dari same domain
fetch('/api/stripe/checkout', {
  method: 'POST',
  // Bukan fetch dari external domain
})

// Jika cross-origin, setup CORS:
export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ... })
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}
```

---

## Menggunakan di Project Lain

### Quick Start Template

```bash
# 1. Copy files:
src/utils/stripe.ts
src/app/api/stripe/checkout/route.ts
src/app/api/stripe/webhook/route.ts
src/app/.../buy/page.tsx
src/app/.../buy/_components/CheckoutButton.tsx

# 2. Update path imports (adjust @/ alias)

# 3. Add to Payload collection:
{
  name: 'price',
  type: 'number',
  required: true,
  min: 1,
}

# 4. Install dependency:
npm install stripe

# 5. Setup .env:
STRIPE_SK=sk_test_xxx
NEXT_PUBLIC_STRIPE_PK=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx (optional for dev)

# 6. Run:
npm run dev
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

### Adapting for Different Models

**Model 1: Product-Based (Current)**

- Satu product = satu item untuk dibeli
- Participation = "pengguna punya course ini"

**Model 2: Subscription-Based**

```typescript
// Change mode to subscription
const session = await stripe.checkout.sessions.create({
  mode: 'subscription', // Not 'payment'
  line_items: [
    {
      price: 'price_xxxxx', // Use Stripe Price ID
      quantity: 1,
    },
  ],
  // Handle subscription events: customer.subscription.created, etc
})
```

**Model 3: Multiple Items (Bundle)**

```typescript
// Multiple courses in one payment
const session = await stripe.checkout.sessions.create({
  line_items: [
    { price_data: { ... }, quantity: 1 }, // Course 1
    { price_data: { ... }, quantity: 1 }, // Course 2
  ],
  // metadata untuk semua courses
})
```

---

## Resources

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Testing**: https://stripe.com/docs/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli
- **PayloadCMS Docs**: https://payloadcms.com
- **Next.js API Routes**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Webhook Events**: https://stripe.com/docs/api/events/types

---

**Last Updated**: May 7, 2026
**Framework**: Next.js 16+, PayloadCMS 3.84+, Stripe 22+
