import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { MessageCircle } from 'lucide-react';

export function FeedbackStatsBlock({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_feedback_stats');
        if (error) throw error;
        setStats(data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки отзывов');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [eventId]);

  if (loading) return <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">Загрузка отзывов...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">{error}</div>;
  if (!stats.length) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">Нет данных по отзывам</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-900">Отзывы участников</h3>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Распределение оценок</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="Оценка" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Количество" fill="#A78BFA" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 text-sm text-purple-700 font-medium">
          Средняя оценка: {stats[0]?.['Средняя оценка'] || '-'} (всего отзывов: {stats[0]?.['Всего отзывов'] || 0})
        </div>
      </div>
    </div>
  );
} 