'use client';

export default function ProviderStats({ costPerProvider, callsPerProvider, avgLatencyPerProvider }) {
  if (!costPerProvider) return null;

  const providers = Object.keys(costPerProvider);

  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Provider Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left py-1">Provider</th>
              <th className="text-right py-1">Calls</th>
              <th className="text-right py-1">Cost</th>
              <th className="text-right py-1">Avg Latency</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider} className="border-b border-gray-800">
                <td className="py-1 capitalize">{provider}</td>
                <td className="text-right py-1">{callsPerProvider?.[provider] ?? 0}</td>
                <td className="text-right py-1">${(costPerProvider[provider] ?? 0).toFixed(4)}</td>
                <td className="text-right py-1">{avgLatencyPerProvider?.[provider] ?? '-'}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
