'use client';

const TASK_COLORS = {
  text:             '#3B82F6',
  embedding:        '#10B981',
  image:            '#F59E0B',
  'text-to-speech': '#8B5CF6',
  'speech-to-text': '#EC4899',
  video:            '#EF4444',
};

export default function TaskBreakdown({ taskBreakdown }) {
  if (!taskBreakdown || Object.keys(taskBreakdown).length === 0) return null;

  const total = Object.values(taskBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-card p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-3">Task Type Breakdown</h3>
      <div className="space-y-2">
        {Object.entries(taskBreakdown).map(([task, count]) => {
          const pct = Math.round((count / total) * 100);
          const color = TASK_COLORS[task] || '#6B7280';
          return (
            <div key={task}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{task}</span>
                <span>{count} ({pct}%)</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
