import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../../../lib/supabase';
import { HelpCircle } from 'lucide-react';

export function QuestionAnalysisBlock({ eventId }: { eventId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc('get_question_analysis');
        if (error) throw error;
        setStats(data || []);
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки анализа вопросов');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [eventId]);

  if (loading) return <div className="bg-white border border-gray-200 rounded-lg p-4 text-center text-gray-500">Загрузка анализа вопросов...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">{error}</div>;
  if (!stats.length) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center text-yellow-700">Нет данных по вопросам</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow flex flex-col gap-4">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900">Анализ вопросов</h3>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Ошибки по вопросам</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="Вопрос" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Ошибки" fill="#F59E42" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Правильные ответы" fill="#06A478" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-4">
        {stats.slice(0, 3).map((s, idx) => (
          <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-sm text-orange-700 font-medium">
            {s['Вопрос']}: ошибок — {s['Ошибки']}, правильных — {s['Правильные ответы']}
          </div>
        ))}
      </div>
    </div>
  );
} 