# 🎨 Figmify - HTML to Figma Converter

A complete SaaS application that converts HTML to Figma-compatible designs. Built with React, Express, Supabase, and Stripe.

## 📁 Project Structure

```
Figmify/
├── frontend/          # React/Next.js frontend application
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   ├── lib/          # Utilities (Supabase client)
│   └── package.json
├── backend/          # Express.js backend server
│   ├── server.ts     # Main server file
│   ├── schema.sql    # Supabase database schema
│   ├── package.json  # Dependencies
│   └── .env.example  # Environment variables template
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account

### 1. Clone the Repository

```bash
git clone https://github.com/fluxychidera66-dot/Figmify.git
cd Figmify
```

### 2. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

The backend will run on `http://localhost:3000`

### 3. Frontend Setup

```bash
cd ../frontend

# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:5173`

## 🔧 Configuration

### Backend Environment Variables

Create a `.env.local` file in the `backend/` directory:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PRICE_ID=price_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Server
FRONTEND_URL=http://localhost:5173
PORT=3000
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_BACKEND_URL=http://localhost:3000
```

## 📊 Database Setup

1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. In the SQL Editor, create a new query
4. Copy the contents of `backend/schema.sql`
5. Execute the query

This will create three tables:
- **api_keys**: User API keys and subscription plans
- **usage**: Monthly conversion tracking
- **conversion_logs**: Debug logs for conversions

## 💳 Stripe Setup

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create a new product:
   - Name: "Figmify Pro Monthly"
   - Price: $50/month (recurring)
   - Copy the Price ID → `STRIPE_PRICE_ID`

3. Get your API keys:
   - Secret Key → `STRIPE_SECRET_KEY`

4. Set up webhooks:
   - Go to Developers → Webhooks
   - Create endpoint: `https://your-domain.com/api/webhook/stripe`
   - Events: `checkout.session.completed`
   - Copy Signing Secret → `STRIPE_WEBHOOK_SECRET`

## 🔗 API Endpoints

### Authentication

- **POST** `/api/auth/signup` - Create new account
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/me` - Get current user

### Conversion

- **POST** `/api/convert` - Convert HTML to Figma format
- **GET** `/api/usage` - Get current usage stats

### Billing

- **POST** `/api/billing/checkout` - Create Stripe checkout session
- **POST** `/api/webhook/stripe` - Stripe webhook handler

## 🧪 Testing

### Sign Up (Free Plan)

1. Navigate to `http://localhost:5173/signup`
2. Enter email and password
3. Select "Free" plan
4. Click "Create Account"
5. Should redirect to dashboard with 50 conversions/month limit

### Sign Up (Pro Plan)

1. Navigate to `http://localhost:5173/signup`
2. Enter email and password
3. Select "Pro" plan
4. Click "Create Account"
5. Redirects to Stripe checkout
6. Use test card: `4242 4242 4242 4242`
7. Complete payment
8. Redirected to dashboard with 2,500 conversions/month limit

### Test Conversion

1. Go to dashboard
2. Paste HTML:
   ```html
   <div style="background: blue; padding: 20px;">
     <h1>Hello Figmify!</h1>
   </div>
   ```
3. Click "Convert & Copy to Clipboard"
4. Usage counter should increment

## 📦 Pricing

- **Free**: 50 conversions/month
- **Pro**: $50/month, 2,500 conversions/month

## 🚨 Troubleshooting

### "Cannot find module 'cors'"
```bash
cd backend && npm install cors
```

### Supabase connection errors
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check that Supabase project is active
- Ensure Auth is enabled in Supabase settings

### Stripe checkout not working
- Verify `STRIPE_PRICE_ID` format (should be `price_xxxxx`)
- Check `STRIPE_SECRET_KEY` starts with `sk_`
- Ensure test mode is enabled in Stripe dashboard

### Port 3000 already in use
```bash
PORT=3001 npm run dev
```

## 🎯 Next Steps

- [ ] Deploy backend to Vercel
- [ ] Deploy frontend to Vercel
- [ ] Set up production Stripe keys
- [ ] Configure production Supabase project
- [ ] Add email verification
- [ ] Implement password reset flow
- [ ] Add rate limiting
- [ ] Set up monitoring and logging

## 📝 License

MIT

## 🤝 Support

For issues and questions, please create an issue on GitHub.

---

**Built with ❤️ by Figmify Team**
