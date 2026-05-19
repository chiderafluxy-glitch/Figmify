'use client';

import { useState } from 'react';

export default function ApiKeyManager({ apiKey, onRegenerate }) {
  const [copySuccess, setCopySuccess] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopySuccess('Copied!');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Regenerate your API key? Your current key will stop working immediately.')) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Your API Key</h3>
      <div className="flex items-center gap-2">
        <code className="bg-gray-800 px-3 py-1 rounded text-sm flex-1 overflow-x-auto">
          {apiKey || 'No key found'}
        </code>
        <button
          onClick={copyToClipboard}
          className="bg-accent hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          Copy
        </button>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm disabled:opacity-50"
        >
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>
      {copySuccess && <p className="text-green-500 text-sm mt-1">{copySuccess}</p>}
      <p className="text-gray-500 text-xs mt-2">
        Include this key as the <code className="text-gray-300">Authorization: Bearer [YOUR_KEY]</code> header in every request.
      </p>
    </div>
  );
}
