import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Middleware
app.use(cors());
app.use(express.json());

// For Vercel, adjust paths
const isVercel = process.env.VERCEL === '1';
const staticDir = isVercel ? path.join(__dirname, 'frontend', 'dist') : path.join(__dirname, 'dist');

// Serve static files
app.use(express.static(staticDir));

// ========== AUTH ENDPOINTS ==========

// Sign up
app.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, plan } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
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

// Convert HTML to screenshot using Browserless
app.post('/api/convert', async (req: Request, res: Response) => {
  try {
    const { html, width = 1280, height = 800, name = 'Frame' } = req.body;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    // Get user from API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, plan')
      .eq('api_key', apiKey)
      .single();
    
    if (keyError || !keyData) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Check monthly usage
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    
    let { data: usageData } = await supabase
      .from('usage')
      .select('count')
      .eq('api_key_id', keyData.id)
      .eq('month', currentMonth)
      .single();
    
    const limit = keyData.plan === 'pro' ? 2500 : 50;
    const currentCount = usageData?.count || 0;
    
    if (currentCount >= limit) {
      return res.status(429).json({ error: `Monthly limit of ${limit} conversions reached` });
    }
    
    // Call Browserless API
    const browserlessKey = process.env.BROWSERLESS_API_KEY;
    if (!browserlessKey) {
      return res.status(500).json({ error: 'Browserless API key not configured' });
    }
    
    const fetch = (await import('node-fetch')).default;
    const browserlessRes = await fetch(`https://chrome.browserless.io/content?token=${browserlessKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: html,
        options: {
          width: parseInt(String(width)),
          height: parseInt(String(height)),
          deviceScaleFactor: 2,
          waitFor: 1000
        }
      })
    });
    
    if (!browserlessRes.ok) {
      const errorText = await browserlessRes.text();
      throw new Error(`Browserless error: ${browserlessRes.status} ${errorText}`);
    }
    
    const screenshotBuffer = await browserlessRes.buffer();
    const base64Screenshot = screenshotBuffer.toString('base64');
    
    // Increment usage
    if (usageData) {
      await supabase
        .from('usage')
        .update({ count: currentCount + 1 })
        .eq('api_key_id', keyData.id)
        .eq('month', currentMonth);
    } else {
      await supabase
        .from('usage')
        .insert({ api_key_id: keyData.id, month: currentMonth, count: 1 });
    }
    
    // Log success
    await supabase
      .from('conversion_logs')
      .insert({ api_key_id: keyData.id, html_length: html.length, success: true });
    
    res.json({
      success: true,
      message: 'Rendered screenshot. In Figma, paste as image (⌘+V)',
      screenshotBase64: base64Screenshot,
      width, height, name
    });
    
  } catch (error: any) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: error.message || 'Conversion failed' });
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
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      const userId = customer?.metadata?.user_id || null;

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
  res.sendFile(path.join(staticDir, 'index.html'));
});

export default app;
