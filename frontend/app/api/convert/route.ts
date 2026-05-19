import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { html, width = 1280, height = 800, name = 'Frame' } = await req.json();
    const apiKey = req.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Get user from API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, plan')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
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
      return NextResponse.json({ error: `Monthly limit of ${limit} reached` }, { status: 429 });
    }

    // Call Browserless API
    const browserlessKey = process.env.BROWSERLESS_API_KEY;
    if (!browserlessKey) {
      return NextResponse.json({ error: 'Browserless not configured' }, { status: 500 });
    }

    const browserlessRes = await fetch(`https://chrome.browserless.io/content?token=${browserlessKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: { width: Number(width), height: Number(height), deviceScaleFactor: 2, waitFor: 1000 }
      })
    });

    if (!browserlessRes.ok) {
      throw new Error(`Browserless error: ${browserlessRes.status}`);
    }

    const screenshotBuffer = await browserlessRes.arrayBuffer();
    const base64Screenshot = Buffer.from(screenshotBuffer).toString('base64');

    // Increment usage
    if (usageData) {
      await supabase.from('usage').update({ count: currentCount + 1 }).eq('api_key_id', keyData.id).eq('month', currentMonth);
    } else {
      await supabase.from('usage').insert({ api_key_id: keyData.id, month: currentMonth, count: 1 });
    }

    return NextResponse.json({
      success: true,
      message: 'Screenshot ready – paste as image in Figma',
      screenshotBase64: base64Screenshot,
      width, height, name
    });
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}