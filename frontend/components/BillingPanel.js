'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const BACKEND_URL = 'https://omni-backend10.vercel.app';

export default function BillingPanel({ currentBalance, onBalanceUpdate }) {
  const [topupAmount, setTopupAmount]   = useState(10);
  const [loading, setLoading]           = useState(false);
  const [history, setHistory]           = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [pricing, setPricing]           = useState(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetchHistory(session.access_token);
        fetchPaymentMethods(session.access_token);
        fetchPricing();
      }
    };
    init();
  }, []);

  const fetchHistory = async (accessToken) => {
    try {
      const res = await fetch(`${BACKEND_URL}/billing/history`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setHistory(data.transactions || []);
    } catch {}
  };

  const fetchPaymentMethods = async (accessToken) => {
    try {
      const res = await fetch(`${BACKEND_URL}/billing/payment-methods`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      setPaymentMethods(data.payment_methods || []);
    } catch {}
  };

  const fetchPricing = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/billing/pricing`);
      const data = await res.json();
      setPricing(data.pricing);
    } catch {}
  };

  const handleTopup = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        alert("You must be logged in");
        return;
      }

      const res = await fetch(`${BACKEND_URL}/billing/topup?amount_usd=${topupAmount}`, {
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupCard = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        alert("You must be logged in");
        return;
      }

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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Balance card */}
      <div className="bg-card p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Credit Balance</h3>
          <span className={`text-2xl font-bold ${currentBalance < 2 ? 'text-red-400' : 'text-green-400'}`}>
            ${(currentBalance || 0).toFixed(4)}
          </span>
        </div>
        {currentBalance < 2 && (
          <p className="text-red-400 text-sm mb-3">
            ⚠️ Low balance — add credits to keep your API running
          </p>
        )}

        {/* Top up */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-gray-400 text-sm">$</span>
          <input
            type="number"
            min="10"
            step="5"
            value={topupAmount}
            onChange={(e) => setTopupAmount(Number(e.target.value))}
            className="bg-gray-800 px-3 py-1 rounded w-24 outline-none focus:ring-1 focus:ring-accent text-sm"
          />
          <button
            onClick={handleTopup}
            disabled={loading}
            className="bg-accent hover:bg-blue-700 px-4 py-1 rounded text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Add Credits'}
          </button>
        </div>
        <p className="text-gray-500 text-xs">Minimum $10. Powered by Stripe — secure checkout.</p>
      </div>

      {/* Saved cards */}
      <div className="bg-card p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Payment Method</h3>
          <button
            onClick={handleSetupCard}
            className="text-accent hover:text-blue-400 text-sm"
          >
            {paymentMethods.length > 0 ? 'Update card' : 'Add card for auto-recharge'}
          </button>
        </div>
        {paymentMethods.length > 0 ? (
          paymentMethods.map((pm) => (
            <div key={pm.id} className="flex items-center gap-3 text-sm">
              <span className="capitalize text-gray-300">{pm.brand}</span>
              <span className="text-gray-400">•••• {pm.last4}</span>
              <span className="text-gray-500">{pm.exp_month}/{pm.exp_year}</span>
              <span className="text-green-500 text-xs">Auto-recharge enabled</span>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No card saved. Add one to enable auto-recharge.</p>
        )}
      </div>

      {/* Pricing */}
      {pricing && (
        <div className="bg-card p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Pricing</h3>
          <div className="space-y-1">
            {Object.entries(pricing).map(([task, price]) => (
              <div key={task} className="flex justify-between text-sm border-b border-gray-800 py-1">
                <span className="capitalize text-gray-300">{task.replace(/-/g, ' ')}</span>
                <span className="text-gray-400">${price} per call</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3">No monthly fees. Pay only for what you use.</p>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-card p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Transaction History</h3>
        {history.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {history.map((tx, i) => (
              <div key={i} className="flex justify-between text-sm border-b border-gray-800 py-1">
                <div>
                  <span className={tx.type === 'credit' ? 'text-green-400' : 'text-gray-300'}>
                    {tx.type === 'credit' ? '+' : '-'}${tx.amount_usd.toFixed(4)}
                  </span>
                  <span className="text-gray-500 ml-2 text-xs">{tx.description}</span>
                </div>
                <span className="text-gray-500 text-xs">
                  Balance: ${tx.ending_balance_usd.toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
