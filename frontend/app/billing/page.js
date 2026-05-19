'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const BACKEND_URL = 'https://omni-backend10.vercel.app';

const TOPUP_AMOUNTS = [10, 25, 50, 100, 250];

export default function BillingPage() {
  const [balance, setBalance]           = useState(null);
  const [history, setHistory]           = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pricing, setPricing]           = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading]           = useState(true);
  const [topping, setTopping]           = useState(false);
  const [error, setError]               = useState('');
  const [isLoggedIn, setIsLoggedIn]     = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        loadBillingData(session.access_token);
      } else {
        setIsLoggedIn(false);
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadBillingData = async (accessToken) => {
    setLoading(true);
    try {
      const [balRes, histRes, pmRes, priceRes] = await Promise.all([
        fetch(`${BACKEND_URL}/billing/balance`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${BACKEND_URL}/billing/history`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${BACKEND_URL}/billing/payment-methods`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch(`${BACKEND_URL}/billing/pricing`),
      ]);

      if (balRes.ok)   setBalance(await balRes.json());
      if (histRes.ok)  setHistory((await histRes.json()).transactions || []);
      if (pmRes.ok)    setPaymentMethods((await pmRes.json()).payment_methods || []);
      if (priceRes.ok) setPricing(await priceRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      alert("You must be logged in");
      return;
    }

    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount < 10) {
      setError('Minimum top-up is $10');
      return;
    }
    setTopping(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/billing/topup?amount_usd=${amount}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Billing error:", text);
        throw new Error(`Request failed: ${text}`);
      }
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTopping(false);
    }
  };

  const handleSetupCard = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    if (!accessToken) {
      alert("You must be logged in");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/billing/setup-card`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
      });
      if (!res.ok) {
        const text = await res.text();
        console.error("Billing error:", text);
        throw new Error(`Request failed: ${text}`);
      }
      const data = await res.json();
      const redirectUrl = data.checkout_url || data.setup_url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No redirect URL returned');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isLoggedIn && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card p-8 rounded-lg">
          <p className="text-gray-400">Please sign in from the dashboard first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-400">Loading billing...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Billing</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Balance card */}
        <div className="bg-card p-6 rounded-lg mb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-400 text-sm mb-1">Current Balance</div>
              <div className="text-4xl font-bold">
                ${(balance?.balance_usd ?? 0).toFixed(4)}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Auto-recharge triggers below ${balance?.auto_recharge_threshold_usd ?? 0.02}
              </div>
            </div>
            <button
              onClick={handleSetupCard}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-sm"
            >
              {paymentMethods.length > 0 ? 'Update Card' : 'Save Card for Auto-recharge'}
            </button>
          </div>

          {/* Saved cards */}
          {paymentMethods.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-gray-400 text-sm mb-2">Saved payment methods</div>
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="flex items-center gap-2 text-sm">
                  <span className="capitalize">{pm.brand}</span>
                  <span>•••• {pm.last4}</span>
                  <span className="text-gray-500">expires {pm.exp_month}/{pm.exp_year}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top up */}
        <div className="bg-card p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add Credits</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {TOPUP_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                className={`px-4 py-2 rounded font-semibold text-sm ${
                  selectedAmount === amt && !customAmount
                    ? 'bg-accent text-white'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <input
              type="number"
              placeholder="Custom amount (min $10)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="bg-gray-800 px-4 py-2 rounded outline-none focus:ring-1 focus:ring-accent text-sm w-48"
            />
            <button
              onClick={handleTopup}
              disabled={topping}
              className="bg-accent hover:bg-blue-700 px-6 py-2 rounded font-semibold disabled:opacity-50"
            >
              {topping ? 'Redirecting...' : `Add $${customAmount || selectedAmount} Credits`}
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">
            You'll be redirected to Stripe's secure checkout. No card data touches our servers.
          </p>
        </div>

        {/* Pricing table */}
        {pricing && (
          <div className="bg-card p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-4">Pricing</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Task Type</th>
                  <th className="text-right py-2">Price per call</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(pricing.pricing).map(([task, price]) => (
                  <tr key={task} className="border-b border-gray-800">
                    <td className="py-2 capitalize">{task.replace(/-/g, ' ')}</td>
                    <td className="text-right py-2">${price.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-500 text-xs mt-3">{pricing.note}</p>
          </div>
        )}

        {/* Payment history */}
        <div className="bg-card p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No payments yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {history.map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-800">
                    <td className="py-2">
                      {new Date(tx.date * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-2 capitalize">
                      {tx.type.replace(/_/g, ' ')}
                    </td>
                    <td className="text-right py-2 text-green-400">
                      +${tx.amount_usd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
