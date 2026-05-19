import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// ========== AUTH ENDPOINTS ==========

// Sign up
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, plan } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUpWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    // Create API key
    const apiKey = `figit_live_${Math.random().toString(36).substring(2, 15)}`;

    // Create api_keys record
    const { error: keyError } = await supabase
      .from('api_keys')
      .insert({
        id: userId,
        key: apiKey,
        email,
        plan: plan || 'free',
        created_at: new Date(),
      });

    if (keyError) {
      return res.status(400).json({ error: 'Failed to create API key' });
    }

    // Create usage record for this month
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);

    const { error: usageError } = await supabase
      .from('usage')
      .insert({
        api_key_id: userId,
        month: firstDayOfMonth.toISOString().split('T')[0],
        count: 0,
        overage_count: 0,
      });

    if (usageError && !usageError.message.includes('duplicate')) {
      console.warn('Usage record creation warning:', usageError);
    }

    // If Pro plan, create Stripe customer and checkout session
    if (plan === 'pro') {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID || 'price_1234567890',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/signup`,
      });

      // Update api_keys with stripe_customer_id
      await supabase
        .from('api_keys')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);

      return res.json({
        success: true,
        checkoutUrl: session.url,
        apiKey,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created',
      apiKey,
      user: {
        id: userId,
        email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const session = authData.session;
    const userId = authData.user?.id;

    // Get API key
    const { data: keyData } = await supabase
      .from('api_keys')
      .select('key, plan')
      .eq('id', userId)
      .single();

    return res.json({
      success: true,
      token: session?.access_token,
      user: {
        id: userId,
        email: authData.user?.email,
        plan: keyData?.plan || 'free',
      },
      apiKey: keyData?.key,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: userData, error } = await supabase.auth.getUser(token);

    if (error || !userData.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('key, plan')
      .eq('id', userData.user.id)
      .single();

    res.json({
      user: {
        id: userData.user.id,
        email: userData.user.email,
        plan: keyData?.plan || 'free',
      },
      apiKey: keyData?.key,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ========== CONVERSION ENDPOINTS ==========

// Convert HTML to Figma
app.post('/api/convert', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const { html, width = 1280, height = 800, name = 'Converted Design' } = req.body;

    if (!html) {
      return res.status(400).json({ error: 'HTML required' });
    }

    // Get API key record
    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('id, plan')
      .eq('key', apiKey)
      .single();

    if (!keyRecord) {
      return res.status(401).json({
        error: 'invalid_api_key',
        message: 'Provide a valid X-API-Key header',
      });
    }

    // Check usage
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    const monthStr = firstDayOfMonth.toISOString().split('T')[0];

    const { data: usageData } = await supabase
      .from('usage')
      .select('count, overage_count')
      .eq('api_key_id', keyRecord.id)
      .eq('month', monthStr)
      .single();

    const limit = keyRecord.plan === 'pro' ? 2500 : 50;
    const currentUsage = usageData?.count || 0;

    if (currentUsage >= limit && keyRecord.plan === 'free') {
      return res.status(429).json({
        error: 'monthly_limit_reached',
        message: 'You have used 50 of 50 free conversions. Upgrade to Pro at figmify.com/pricing',
        upgrade_url: 'https://figmify.com/pricing',
      });
    }

    // Perform conversion using Puppeteer
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Simple conversion - return mock data for now
    // In production, you'd integrate @figit/dom-to-figma here
    const clipboardData = Buffer.from(
      JSON.stringify({
        type: 'design',
        name,
        width,
        height,
        html: html.substring(0, 500), // Truncate for clipboard
      })
    ).toString('base64');

    await browser.close();

    // Update usage
    await supabase
      .from('usage')
      .update({ count: currentUsage + 1 })
      .eq('api_key_id', keyRecord.id)
      .eq('month', monthStr);

    return res.json({
      success: true,
      clipboardData,
      usage: {
        current_month_count: currentUsage + 1,
        included_limit: limit,
        remaining: Math.max(0, limit - (currentUsage + 1)),
      },
    });
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      error: 'conversion_failed',
      message: 'Could not convert HTML. Check that HTML is valid and not too complex.',
    });
  }
});

// ========== USAGE ENDPOINTS ==========

// Get usage
app.get('/api/usage', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const { data: keyRecord } = await supabase
      .from('api_keys')
      .select('id, plan')
      .eq('key', apiKey)
      .single();

    if (!keyRecord) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    const monthStr = firstDayOfMonth.toISOString().split('T')[0];

    const { data: usageData } = await supabase
      .from('usage')
      .select('count, overage_count')
      .eq('api_key_id', keyRecord.id)
      .eq('month', monthStr)
      .single();

    const limit = keyRecord.plan === 'pro' ? 2500 : 50;
    const used = usageData?.count || 0;

    return res.json({
      plan: keyRecord.plan,
      month: monthStr,
      used,
      included: limit,
      overage: usageData?.overage_count || 0,
      remaining: Math.max(0, limit - used),
    });
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: 'Failed to get usage' });
  }
});

// ========== BILLING ENDPOINTS ==========

// Create checkout session
app.post('/api/billing/checkout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: userData } = await supabase.auth.getUser(token);

    if (!userData.user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('stripe_customer_id')
      .eq('id', userData.user.id)
      .single();

    let customerId = keyData?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: { userId: userData.user.id },
      });
      customerId = customer.id;

      await supabase
        .from('api_keys')
        .update({ stripe_customer_id: customerId })
        .eq('id', userData.user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings`,
    });

    return res.json({ checkout_url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Checkout failed' });
  }
});

// Stripe webhook
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const customerId = session.customer;

      // Get user ID from customer metadata
      const customer = await stripe.customers.retrieve(customerId);
      const userId = (customer.metadata as any)?.userId;

      if (userId) {
        await supabase
          .from('api_keys')
          .update({
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription,
          })
          .eq('id', userId);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${(error as Error).message}`);
  }
});

// ========== FALLBACK TO SPA ==========

// Serve React app for all unmatched routes
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Figmify backend running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api\n`);
});
