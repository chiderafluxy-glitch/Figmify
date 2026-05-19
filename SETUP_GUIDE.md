# 🚀 Figmify - Complete Setup & Deployment Guide

## 📋 What You Have

A beautiful React frontend with:
- ✅ Landing page
- ✅ Auth pages (signup/login)
- ✅ Dashboard (converter)
- ✅ Settings page
- ✅ Payment integration ready

Plus a complete Express backend with:
- ✅ Auth endpoints (signup, login, get user)
- ✅ Conversion endpoint (/api/convert)
- ✅ Usage tracking (/api/usage)
- ✅ Stripe integration (/api/billing/*)
- ✅ Stripe webhooks

---

## 🔧 Step-by-Step Setup

### Step 1: Get Supabase Credentials

1. Go to https://supabase.com
2. Create a new project or use existing
3. Get credentials from Settings → API:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon public key → `VITE_SUPABASE_ANON_KEY`
   - Service role key → `SUPABASE_SERVICE_KEY` (keep secret!)

### Step 2: Set Up Supabase Database

1. In Supabase dashboard, go to SQL Editor
2. Create new query
3. Copy entire `backend/schema.sql` content
4. Paste into editor
5. Click "Run"
6. ✅ All tables created

### Step 3: Set Up Stripe

1. Go to https://stripe.com
2. Create account or use existing
3. Go to Products → Create product:
   - Name: "Figmify Pro Monthly"
   - Price: $50/month (recurring)
   - Get Price ID → `STRIPE_PRICE_ID`

4. Get API keys from Developers → API Keys:
   - Secret Key → `STRIPE_SECRET_KEY`

5. Set up Webhook:
   - Go to Developers → Webhooks
   - Create endpoint:
     - URL: `https://your-deployed-url.com/api/webhook/stripe`
     - Events: `checkout.session.completed`
   - Get Signing Secret → `STRIPE_WEBHOOK_SECRET`

### Step 4: Update Backend Code

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

3. **Edit `.env.local`** with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PRICE_ID=price_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   FRONTEND_URL=http://localhost:5173
   PORT=3000
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Test locally**
   ```bash
   npm run dev
   ```
   Should see: `✅ Figmify backend running on port 3000`

### Step 5: Update Frontend Code

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

3. **Edit `.env.local`**:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_BACKEND_URL=http://localhost:3000
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Test locally**
   ```bash
   npm run dev
   ```
   Should see: `Local: http://localhost:5173`

### Step 6: Deploy to Vercel

#### Backend Deployment

1. Push to GitHub
   ```bash
   git add .
   git commit -m "Initial Figmify setup"
   git push origin main
   ```

2. Go to https://vercel.com
3. Import project
4. Select `backend` as root directory
5. In environment variables, add all `.env.local` values
6. Deploy!

#### Frontend Deployment

1. Go to https://vercel.com
2. Import project
3. Select `frontend` as root directory
4. In environment variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL=https://your-backend-domain.vercel.app`
5. Deploy!

---

## 🔗 How It All Connects

```
User Browser (React Frontend)
    ↓
Express Server (server.ts)
    ├─ /api/auth/* (signup, login, get user)
    ├─ /api/convert (HTML → Figma)
    ├─ /api/usage (track conversions)
    ├─ /api/billing/* (Stripe checkout, webhooks)
    └─ / (serve React dist)
    ↓
Supabase (Database)
    ├─ auth.users (user accounts)
    ├─ api_keys (API keys + plan)
    ├─ usage (monthly tracking)
    └─ conversion_logs (debug)
    ↓
Stripe (Payments)
    ├─ Customers
    ├─ Subscriptions ($50/month)
    └─ Webhooks
```

---

## 🧪 Testing

### Test Sign Up (Free)
1. Go to http://localhost:5173/signup
2. Enter email & password
3. Select "Free" plan
4. Click "Create Account"
5. Should redirect to /dashboard immediately
6. See "50 conversions/month" limit

### Test Sign Up (Pro)
1. Go to http://localhost:5173/signup
2. Enter email & password
3. Select "Pro" plan
4. Click "Create Account"
5. Redirects to Stripe checkout (test mode)
6. Use test card: `4242 4242 4242 4242`
7. Expiry: any future date
8. CVC: any 3 digits
9. Complete payment
10. Redirected to /dashboard
11. See "2,500 conversions/month" limit

### Test Conversion
1. Go to /dashboard
2. Paste HTML in converter:
   ```html
   <div style="background: blue; padding: 20px;">
     <h1>Hello Figmify!</h1>
   </div>
   ```
3. Click "Convert & Copy to Clipboard"
4. Should see: "✓ Copied to clipboard! Paste into Figma now."
5. Usage counter increments

### Test Limit
1. Free user: generate 50 conversions, 51st should be blocked
2. Pro user: generate 2,500 conversions, 2,501st costs $0.06 extra

---

## 🚨 Common Issues & Fixes

### Issue: "Cannot find module 'cors'"
**Fix:** Run `npm install cors`

### Issue: Supabase errors on signup
**Fix:**
1. Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`
2. Verify in Supabase dashboard that project is active
3. Check Supabase Auth is enabled (Settings → Auth)

### Issue: Stripe checkout not working
**Fix:**
1. Verify `STRIPE_PRICE_ID` is correct (should be `price_xxxxx`)
2. Check `STRIPE_SECRET_KEY` starts with `sk_`
3. Test mode toggle is ON in Stripe dashboard

### Issue: "Port 3000 already in use"
**Fix:** Kill the process or use different port:
```bash
PORT=3001 npm run dev
```

### Issue: Puppeteer won't launch (on Linux)
**Fix:** The server.ts already includes:
```javascript
puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox']
})
```

---

## 📊 Understanding the Flow

### Sign Up Flow
```
User enters email/password
    ↓
Backend creates user in Supabase Auth
    ↓
Creates API key (figit_live_xxxxx)
    ↓
If Free:
  → Create usage record
  → Redirect to /dashboard ✓
    
If Pro:
  → Create Stripe customer
  → Create checkout session
  → Redirect to Stripe Checkout
  → User pays
  → Stripe webhook fires
  → Backend updates plan to 'pro'
  → User redirected to /dashboard ✓
```

### Conversion Flow
```
User pastes HTML
    ↓
Frontend sends POST /api/convert with API key
    ↓
Backend checks API key exists
    ↓
Checks monthly usage
  ├─ If reached limit: return 429 error
  └─ If OK: continue
    ↓
Uses Puppeteer to render HTML
    ↓
Converts to Figma clipboard format
    ↓
Increments usage counter
    ↓
Returns clipboard data
    ↓
Frontend shows "Copied!" message
```

---

## 🎯 Next Steps After Deployment

### Immediate (Week 1)
- ✅ Deploy to Vercel
- ✅ Test signup flow
- ✅ Test payment flow
- ✅ Test conversion endpoint

### Soon (Week 2)
- Add real @figit/dom-to-figma integration
- Add rate limiting by IP
- Add email verification
- Add password reset flow

### Later (Week 3+)
- Overage billing (charge for usage above 2,500)
- Usage dashboard/analytics
- Admin panel
- API documentation website

---

## 📝 API Reference

### Auth Endpoints

**POST /api/auth/signup**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "plan": "free" // or "pro"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**GET /api/auth/me**
- Header: `Authorization: Bearer <token>`

### Conversion Endpoint

**POST /api/convert**
- Header: `X-API-Key: figit_live_xxxxx`
```json
{
  "html": "<div>...</div>",
  "width": 1280,
  "height": 800,
  "name": "My Frame"
}
```

### Usage Endpoint

**GET /api/usage**
- Header: `X-API-Key: figit_live_xxxxx`

### Billing Endpoints

**POST /api/billing/checkout**
- Header: `Authorization: Bearer <token>`

**POST /api/webhook/stripe**
- Header: `stripe-signature: <signature>`

---

## ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] Database schema imported
- [ ] Stripe account set up with $50 product
- [ ] `.env.local` file created with all values
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] `npm run dev` runs without errors
- [ ] Can sign up as free user
- [ ] Can sign up as Pro user and pay
- [ ] Can convert HTML in dashboard
- [ ] Usage counter updates
- [ ] Code pushed to GitHub
- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] Live at your domain!

---

## 🎉 You're Ready!

All the backend infrastructure is built. Your frontend is beautiful.

**Next:**
1. Copy files to your project
2. Run `npm install` in both directories
3. Create `.env.local` files
4. Test locally
5. Deploy to Vercel
6. Get your first customers!

Good luck! 🚀
