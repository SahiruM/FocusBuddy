import { TrendingUp, Sun } from 'lucide-react';
import { useState } from 'react';
import type { StudySession, Task } from './MainApp';
import {
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Line,
  LineChart,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface StatsSectionProps {
  studySessions: StudySession[];
  tasks: Task[];
}

export function StatsSection({ studySessions, tasks }: StatsSectionProps) {
  const [activeChart, setActiveChart] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [pieRange, setPieRange] = useState<'today' | 'week' | 'alltime'>('week');

  const today = new Date().toISOString().split('T')[0];

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  // ── TODAY & WEEK TOTALS ───────────────────────────────────────────────────
  const dailyTime = studySessions
    .filter(s => s.date === today)
    .reduce((acc, s) => acc + s.duration, 0);

  const weeklyTime = studySessions
    .filter(s => last7Days.includes(s.date))
    .reduce((acc, s) => acc + s.duration, 0);

  // ── CHART DATA ────────────────────────────────────────────────────────────
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const total = studySessions
      .filter(s => s.date === today && (s.hour ?? 0) === hour)
      .reduce((acc, s) => acc + s.duration, 0);
    return { name: `${hour}:00`, minutes: Math.round(total / 60) };
  });

  const weeklyData = last7Days.map(date => {
    const total = studySessions
      .filter(s => s.date === date)
      .reduce((acc, s) => acc + s.duration, 0);
    return {
      name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      minutes: Math.round(total / 60),
    };
  });

  const monthlyData = last30Days.map(date => {
    const total = studySessions
      .filter(s => s.date === date)
      .reduce((acc, s) => acc + s.duration, 0);
    return {
      name: new Date(date).getDate().toString(),
      minutes: Math.round(total / 60),
    };
  });

  // ── PIE CHART DATA (filtered by range) ───────────────────────────────────
  const pieData = tasks.map(task => {
    const filtered = studySessions.filter(s => {
      if (pieRange === 'today') return s.taskId === task.id && s.date === today;
      if (pieRange === 'week') return s.taskId === task.id && last7Days.includes(s.date);
      return s.taskId === task.id; // alltime
    });
    return {
      name: task.name,
      minutes: Math.round(filtered.reduce((acc, s) => acc + s.duration, 0) / 60),
      color: task.color,
    };
  }).filter(d => d.minutes > 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '2px solid var(--border)',
    borderRadius: '16px',
    color: 'var(--foreground)',
    fontSize: '14px',
  };

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── TODAY & THIS WEEK CARDS ── */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--lavender)' }}>
              <Sun className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-foreground text-xl">Today</h4>
          </div>
          <div className="text-2xl sm:text-3xl text-foreground">
            {formatDuration(dailyTime)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {studySessions.filter(s => s.date === today).length} session(s)
          </p>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow hover:translate-y-[-2px] transition-transform">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--soft-pink)' }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h4 className="text-foreground text-xl">This Week</h4>
          </div>
          <div className="text-2xl sm:text-3xl text-foreground">
            {formatDuration(weeklyTime)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {studySessions.filter(s => last7Days.includes(s.date)).length} session(s)
          </p>
        </div>
      </div>

      {/* ── STUDY PROGRESS CHART ── */}
      <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow">
        <h4 className="text-foreground text-xl mb-4">Study Progress</h4>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['daily', 'weekly', 'monthly'] as const).map(chart => (
            <button
              key={chart}
              onClick={() => setActiveChart(chart)}
              className={`px-4 py-2 rounded-full transition-all border-2 capitalize ${
                activeChart === chart
                  ? 'bg-primary text-white border-primary'
                  : 'bg-secondary/50 text-foreground border-border hover:bg-secondary'
              }`}
            >
              {chart}
            </button>
          ))}
        </div>

        <div className="h-48 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'daily' ? (
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--lavender)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--lavender)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" style={{ fontSize: '10px' }} interval={3} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}m`, 'Study time']} />
                <Area type="monotone" dataKey="minutes" stroke="var(--lavender)" strokeWidth={3} fill="url(#colorDaily)" />
              </AreaChart>
            ) : activeChart === 'weekly' ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}m`, 'Study time']} />
                <Bar dataKey="minutes" fill="var(--lavender)" radius={[12, 12, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" style={{ fontSize: '10px' }} interval={4} />
                <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}m`, 'Study time']} />
                <Line type="monotone" dataKey="minutes" stroke="var(--soft-pink)" strokeWidth={3} dot={{ fill: 'var(--soft-pink)', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {studySessions.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-4">
            No sessions yet — start studying to see your progress! 📚
          </p>
        )}
      </div>

      {/* ── PIE CHART: TIME PER SUBJECT ── */}
      <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow">
        <h4 className="text-foreground text-xl mb-4">Time per Subject</h4>

        <div className="flex gap-2 mb-4 flex-wrap">
          {(['today', 'week', 'alltime'] as const).map(range => (
            <button
              key={range}
              onClick={() => setPieRange(range)}
              className={`px-4 py-2 rounded-full transition-all border-2 ${
                pieRange === range
                  ? 'bg-primary text-white border-primary'
                  : 'bg-secondary/50 text-foreground border-border hover:bg-secondary'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>

        {pieData.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-16">
            No sessions yet for this period — start studying! 🧪
          </p>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="minutes"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`${v}m`, 'Study time']}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: 'var(--foreground)', fontSize: '14px' }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* ── SUBJECT BREAKDOWN LIST ── */}
            <div className="mt-4 space-y-2">
              {pieData.map(subject => {
                const total = pieData.reduce((acc, s) => acc + s.minutes, 0);
                const pct = total > 0 ? Math.round((subject.minutes / total) * 100) : 0;
                return (
                  <div key={subject.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                    <span className="text-sm text-foreground flex-1">{subject.name}</span>
                    <span className="text-sm text-muted-foreground">{subject.minutes}m</span>
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: subject.color }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}