import React, { useEffect, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { Link2 } from 'lucide-react';

export function TestFeedbackCorrelationBlock({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_test_feedback_correlation');
        if (error) throw error;
        setStats(data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки корреляции');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [eventId]);

  if (loading) return <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">Загрузка корреляции...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">{error}</div>;
  if (!stats.length) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">Нет данных по корреляции</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="text-pink-500" />
        <h3 className="text-lg font-semibold text-gray-900">Корреляция: тесты и отзывы</h3>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Связь между баллами за тест и оценками</h4>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="Балл за тест" name="Балл за тест" fontSize={12} />
            <YAxis dataKey="Оценка" name="Оценка" fontSize={12} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Участники" data={stats} fill="#EC4899" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        <div className="bg-pink-50 border border-pink-200 rounded-lg px-4 py-2 text-sm text-pink-700 font-medium">
          {stats.length > 0 ? 'Корреляция рассчитана по всем участникам' : 'Нет данных для анализа'}
        </div>
      </div>
    </div>
  );
} 