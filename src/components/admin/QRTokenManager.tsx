import React, { useState, useEffect } from 'react';
import { QrCode, Shield, Eye, EyeOff, Copy, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../ui/Spinner';

interface QRToken {
  id: string;
  user_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  user_email?: string;
  user_full_name?: string;
}

export function QRTokenManager() {
  const [tokens, setTokens] = useState<QRToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set());

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError('');

      // Получаем все токены
      const { data, error: tokensError } = await supabase
        .from('user_qr_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (tokensError) throw tokensError;

      // Получаем информацию о пользователях
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      // Объединяем данные
      const tokensWithUsers = data.map(token => {
        const user = usersData?.find(u => u.id === token.user_id);
        return {
          ...token,
          user_email: user?.email,
          user_full_name: user?.full_name
        };
      });

      setTokens(tokensWithUsers);
    } catch (err: any) {
      setError(err.message || 'Не удалось загрузить токены');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const toggleTokenVisibility = (tokenId: string) => {
    setShowTokens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tokenId)) {
        newSet.delete(tokenId);
      } else {
        newSet.add(tokenId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Не удалось скопировать:', err);
    }
  };

  const deactivateToken = async (tokenId: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать этот токен?')) return;

    try {
      const { error } = await supabase
        .from('user_qr_tokens')
        .update({ is_active: false })
        .eq('id', tokenId);

      if (error) throw error;

      await loadTokens();
    } catch (err: any) {
      setError(err.message || 'Не удалось деактивировать токен');
    }
  };

  const activateToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('user_qr_tokens')
        .update({ is_active: true })
        .eq('id', tokenId);

      if (error) throw error;

      await loadTokens();
    } catch (err: any) {
      setError(err.message || 'Не удалось активировать токен');
    }
  };

  const generateQRUrl = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/qr/${token}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size={48} label="Загрузка токенов..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Управление QR-токенами</h2>
          <p className="text-sm text-gray-600 mt-1">
            Токены с бесконечным сроком действия. Деактивация только вручную.
          </p>
        </div>
        <button
          onClick={loadTokens}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Всего токенов</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{tokens.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <div className="text-sm text-gray-600">Активных</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {tokens.filter(t => t.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Деактивированных</div>
          <div className="text-2xl font-bold text-gray-600 mt-1">
            {tokens.filter(t => !t.is_active).length}
          </div>
        </div>
      </div>

      {/* Список токенов */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Токен
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Создан
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tokens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Нет токенов
                  </td>
                </tr>
              ) : (
                tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {token.user_full_name || 'Неизвестно'}
                      </div>
                      <div className="text-sm text-gray-500">{token.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {showTokens.has(token.id)
                            ? token.token.substring(0, 16) + '...'
                            : '••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => toggleTokenVisibility(token.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showTokens.has(token.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(generateQRUrl(token.token))}
                          className="text-gray-400 hover:text-gray-600"
                          title="Копировать QR URL"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(token.created_at).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {token.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Активен
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle className="h-3 w-3" />
                          Деактивирован
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {token.is_active ? (
                        <button
                          onClick={() => deactivateToken(token.id)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-900"
                        >
                          <Shield className="h-4 w-4" />
                          Деактивировать
                        </button>
                      ) : (
                        <button
                          onClick={() => activateToken(token.id)}
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-900"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Активировать
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Инструкция */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <QrCode className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Как использовать:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Токены имеют бесконечное время жизни</li>
              <li>Деактивация происходит только вручную администратором</li>
              <li>URL для QR-кода: <code className="bg-blue-100 px-1 rounded">/auth/qr/[token]</code></li>
              <li>Нажмите на иконку копирования, чтобы скопировать полный URL</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

