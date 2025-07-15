import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, BarChart as RBarChart, Bar, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { CheckCircle, XCircle } from 'lucide-react';

const COLORS = ['#06A478', '#F59E42'];

export function TestStatsBlock({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_test_completion_stats');
        if (error) throw error;
        setStats(data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки статистики');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [eventId]);

  if (loading) return <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">Загрузка статистики...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">{error}</div>;
  if (!stats.length) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">Нет данных по тестам</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="text-sns-green" />
        <h3 className="text-lg font-semibold text-gray-900">Статистика по тестам</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PieChart: завершено/незавершено */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Завершённые vs Незавершённые</h4>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.map(s => ({ name: s['Тест'], value: Number(s['Процент завершения']) }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                fill="#06A478"
                label
              >
                {stats.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* BarChart: средний балл */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Средний балл по тестам</h4>
          <ResponsiveContainer width="100%" height={180}>
            <RBarChart data={stats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="Тест" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Средний балл" fill="#06A478" radius={[4, 4, 0, 0]} />
            </RBarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-sns-green/10 border border-sns-green/30 rounded-lg px-4 py-2 text-sm text-sns-green font-medium">
            {s['Тест']}: {s['Завершено']} из {s['Всего попыток']} ({s['Процент завершения']}%)
          </div>
        ))}
      </div>
    </div>
  );
} 