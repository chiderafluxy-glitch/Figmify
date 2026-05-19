'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import UsageChart from '../components/UsageChart';
import ProviderStats from '../components/ProviderStats';
import ApiKeyManager from '../components/ApiKeyManager';
import TaskBreakdown from '../components/TaskBreakdown';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://omni-backend10.vercel.app';

export default function Dashboard() {
  const [session, setSession]         = useState(null);
  const [apiKey, setApiKey]           = useState('');
  const [usageData, setUsageData]     = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [email, setEmail]             = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError]     = useState('');
  const [magicSent, setMagicSent]     = useState(false);
  const [view, setView]               = useState('login');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        handleAuthenticatedUser(session);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        handleAuthenticatedUser(session);
      } else {
        setLoading(false);
        setView('login');
        setApiKey('');
        setUsageData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthenticatedUser = async (session) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login-or-register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: session.user.email,
          auth_user_id: session.user.id,
        }),
      });
      if (!res.ok) throw new Error('Failed to set up your account');
      const data = await res.json();
      setApiKey(data.apiKey);
      setView('dashboard');
      await fetchUsage(session.access_token);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchUsage = async (accessToken) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/dashboard/usage`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setUsageData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
      setAuthLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setMagicSent(true);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setApiKey('');
    setUsageData(null);
    setSession(null);
    setView('login');
  };

  const handleRegenerate = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const res = await fetch(`${BACKEND_URL}/auth/regenerate-key`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to regenerate');
      const data = await res.json();
      setApiKey(data.apiKey);
      alert(`New API key: ${data.apiKey}`);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!session || view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card p-8 rounded-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2">Omni Dashboard</h1>
          <p className="text-gray-400 mb-6 text-sm">Sign in to manage your API and view usage. (Verified)</p>

          <button
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full bg-white text-black py-2 rounded font-semibold mb-4 flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.48A4.8 4.8 0 0 1 4.5 7.5V5.43H1.83a8 8 0 0 0 0 7.14l2.67-2.09z"/>
              <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.54A8 8 0 0 0 1.83 5.43L4.5 7.5c.68-2 2.53-3.92 4.48-3.92z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-xs">or</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          {magicSent ? (
            <div className="bg-green-900/30 border border-green-700 text-green-400 p-4 rounded-lg text-sm text-center">
              ✅ Check your email! We sent you a magic link to sign in.
            </div>
          ) : (
            <>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMagicLink()}
                className="w-full bg-gray-800 px-4 py-2 rounded mb-3 outline-none focus:ring-1 focus:ring-accent text-sm"
              />
              {authError && <p className="text-red-500 text-xs mb-2">{authError}</p>}
              <button
                onClick={handleMagicLink}
                disabled={authLoading || !email.trim()}
                className="w-full bg-accent hover:bg-blue-700 py-2 rounded font-semibold disabled:opacity-50"
              >
                {authLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
              <p className="text-gray-500 text-xs mt-2 text-center">
                No password needed — we email you a sign in link
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Omni Dashboard</h1>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white text-sm">Sign out</button>
          </div>
          <div className="bg-red-900/30 border border-red-700 text-red-400 p-4 rounded-lg">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Omni Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm hidden md:block">{session?.user?.email}</span>
            <button onClick={() => fetchUsage(session.access_token)} className="text-gray-400 hover:text-white text-sm">Refresh</button>
            <button onClick={handleSignOut} className="text-gray-400 hover:text-white text-sm">Sign out</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total API Calls</div>
            <div className="text-2xl font-bold">{usageData?.totalCalls ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">last 30 days</div>
          </div>
          <div className="bg-card p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Total Spent</div>
            <div className="text-2xl font-bold">${(usageData?.totalSpent ?? 0).toFixed(4)}</div>
            <div className="text-xs text-gray-500 mt-1">last 30 days</div>
          </div>
          <div className="bg-card p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Failed Requests</div>
            <div className="text-2xl font-bold">{usageData?.failedRequests ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{usageData?.failureRate ?? 0}% failure rate</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-gray-800">
            <div className="text-gray-400 text-sm">Credit Balance</div>
            <div className="text-2xl font-bold text-green-400">
              ${(usageData?.currentBalance ?? 0).toFixed(4)}
            </div>
            <a href="/billing" className="text-xs text-accent hover:underline mt-1 block">Top up →</a>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-2">Requests & Cost Over Time (30 days)</h2>
          <UsageChart data={usageData?.dailyUsage || []} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <ProviderStats
            costPerProvider={usageData?.costPerProvider || {}}
            callsPerProvider={usageData?.callsPerProvider || {}}
            avgLatencyPerProvider={usageData?.avgLatencyPerProvider || {}}
          />
          <TaskBreakdown taskBreakdown={usageData?.taskBreakdown || {}} />
        </div>

        <ApiKeyManager apiKey={apiKey} onRegenerate={handleRegenerate} />

      </div>
    </div>
  );
}
