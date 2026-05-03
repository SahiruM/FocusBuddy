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
} from 'recharts';

interface StatsSectionProps {
  studySessions: StudySession[];
  tasks: Task[];
}

export function StatsSection({ studySessions, tasks }: StatsSectionProps) {
  const [activeChart, setActiveChart] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [pieRange, setPieRange] = useState<'today' | 'week' | 'alltime'>('week');

  const today = new Date().toISOString().split('T')[0];

  // ── MONDAY-BASED WEEK ──────────────────────────────────
  const getMondayWeek = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const weekDays = getMondayWeek();

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  // ── FORMAT ─────────────────────────────────────────────
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // ── TOTALS ─────────────────────────────────────────────
  const dailyTime = studySessions
    .filter(s => s.date === today)
    .reduce((acc, s) => acc + s.duration, 0);

  const weeklyTime = studySessions
    .filter(s => weekDays.includes(s.date))
    .reduce((acc, s) => acc + s.duration, 0);

  // ── CHART DATA ─────────────────────────────────────────
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const total = studySessions
      .filter(s => s.date === today && (s.hour ?? 0) === hour)
      .reduce((acc, s) => acc + s.duration, 0);
    return { name: `${hour}:00`, minutes: Math.round(total / 60) };
  });

  const weeklyData = weekDays.map(date => {
    const total = studySessions
      .filter(s => s.date === date)
      .reduce((acc, s) => acc + s.duration, 0);
    return {
      name: new Date(date).toLocaleDateString('en-GB', { weekday: 'short' }),
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

  // ── PIE DATA ───────────────────────────────────────────
  const pieData = tasks.map(task => {
    let filtered = studySessions;

    if (pieRange === 'today') {
      filtered = studySessions.filter(s => s.taskId === task.id && s.date === today);
    } else if (pieRange === 'week') {
      filtered = studySessions.filter(s => s.taskId === task.id && weekDays.includes(s.date));
    } else {
      filtered = studySessions.filter(s => s.taskId === task.id);
    }

    const totalSeconds = filtered.reduce((acc, s) => acc + s.duration, 0);
    return {
      name: task.name,
      seconds: totalSeconds,
      minutes: Math.round(totalSeconds / 60),
      color: task.color,
    };
  }).filter(d => d.seconds > 0);

  const totalStudySeconds = pieData.reduce((acc, item) => acc + item.seconds, 0);

  const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '2px solid var(--border)',
    borderRadius: '12px',
    padding: '10px',
    color: 'var(--foreground)',
  };

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sun className="w-5 h-5 text-yellow-500" />
            <h4 className="text-xl font-medium">Today</h4>
          </div>
          <div className="text-4xl font-semibold">{formatDuration(dailyTime)}</div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-pink-500" />
            <h4 className="text-xl font-medium">This Week</h4>
          </div>
          <div className="text-4xl font-semibold">{formatDuration(weeklyTime)}</div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-card border border-border rounded-3xl p-6">
        <h4 className="text-xl mb-4">Study Progress</h4>

        <div className="flex gap-2 mb-5 flex-wrap">
          {(['daily', 'weekly', 'monthly'] as const).map(chart => (
            <button
              key={chart}
              onClick={() => setActiveChart(chart)}
              className={`px-5 py-2 rounded-full border ${
                activeChart === chart
                  ? 'bg-primary text-white border-primary'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              {chart}
            </button>
          ))}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'daily' ? (
              <AreaChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="minutes" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.3} />
              </AreaChart>
            ) : activeChart === 'weekly' ? (
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="minutes" fill="#a78bfa" radius={8} />
              </BarChart>
            ) : (
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="minutes" stroke="#f472b6" strokeWidth={4} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Per Subject Pie */}
      <div className="bg-card border border-border rounded-3xl p-6">
        <h4 className="text-xl mb-4">Time per Subject</h4>

        <div className="flex gap-2 mb-5 flex-wrap">
          {(['today', 'week', 'alltime'] as const).map(range => (
            <button
              key={range}
              onClick={() => setPieRange(range)}
              className={`px-5 py-2 rounded-full border ${
                pieRange === range
                  ? 'bg-primary text-white border-primary'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : 'All Time'}
            </button>
          ))}
        </div>

        {pieData.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">No sessions recorded yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="h-80">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="seconds" innerRadius={70} outerRadius={110}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => [formatDuration(value), 'Study Time']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {pieData.map(subject => {
                const percent = totalStudySeconds > 0
                  ? Math.round((subject.seconds / totalStudySeconds) * 100)
                  : 0;

                return (
                  <div key={subject.name} className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full" style={{ backgroundColor: subject.color }} />
                    <div className="flex-1">
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDuration(subject.seconds)}
                      </p>
                    </div>
                    <div className="font-semibold">{percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}