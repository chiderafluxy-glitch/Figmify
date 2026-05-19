'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

export default function UsageChart({ data }) {
  if (!data || data.length === 0)
    return <div className="text-gray-500">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="date" stroke="#aaa" />
        <YAxis yAxisId="left"  stroke="#aaa" />
        <YAxis yAxisId="right" orientation="right" stroke="#aaa" />
        <Tooltip
          contentStyle={{ backgroundColor: '#111', border: 'none' }}
          labelStyle={{ color: '#fff' }}
        />
        <Line yAxisId="left"  type="monotone" dataKey="requests" stroke="#3B82F6" name="Requests" />
        <Line yAxisId="right" type="monotone" dataKey="cost"     stroke="#10B981" name="Cost ($)" />
      </LineChart>
    </ResponsiveContainer>
  );
}
