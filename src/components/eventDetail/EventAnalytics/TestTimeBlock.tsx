import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { Clock } from 'lucide-react';

export function TestTimeBlock({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_test_time_stats');
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

  if (loading) return <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">Загрузка времени...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">{error}</div>;
  if (!stats.length) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">Нет данных по времени</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-900">Время прохождения тестов</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Среднее время (мин.)</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="Тест" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Среднее время (минуты)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Диапазон времени</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={stats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="Тест" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Минимальное время (минуты)" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="Среднее время (минуты)" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="Максимальное время (минуты)" stroke="#F59E42" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700 font-medium">
            {s['Тест']}: {s['Среднее время (минуты)']} мин. (мин: {s['Минимальное время (минуты)']}, макс: {s['Максимальное время (минуты)']})
          </div>
        ))}
      </div>
    </div>
  );
} 