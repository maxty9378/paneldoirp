import React from 'react';

export function EventParticipants({ participants, onAction }: { participants: any[]; onAction?: (participant: any) => void }) {
  if (!participants?.length) return null;
  return (
    <div className="bg-white rounded-xl p-4 border font-mabry">
      <h2 className="text-lg font-semibold mb-2">Участники ({participants.length})</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="text-left py-1 px-2">ФИО</th>
              <th className="text-left py-1 px-2">Email</th>
              <th className="text-left py-1 px-2">Телефон</th>
              <th className="text-left py-1 px-2">Должность</th>
              <th className="text-left py-1 px-2">Территория</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-1 px-2">{p.user?.full_name}</td>
                <td className="py-1 px-2">{p.user?.email || '—'}</td>
                <td className="py-1 px-2">{p.user?.phone || '—'}</td>
                <td className="py-1 px-2">{p.user?.position?.name || '—'}</td>
                <td className="py-1 px-2">{p.user?.territory?.name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 