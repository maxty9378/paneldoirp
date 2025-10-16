import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, RefreshCw, Eye, EyeOff, Shield, X } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../../lib/supabase';

interface PersistentQRCodeProps {
  email: string;
  fullName?: string;
  onClose: () => void;
}

export default function PersistentQRCode({ email, fullName, onClose }: PersistentQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [persistentUrl, setPersistentUrl] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState<'url' | 'token' | null>(null);

  const generatePersistentQR = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-persistent-qr', {
        body: { email }
      });

      if (error) throw new Error(error.message || 'Не удалось создать постоянный QR-код');
      
      setPersistentUrl(data.persistentUrl);
      setToken(data.token);
      
      // Генерируем QR-код (компактный размер)
      const qrData = await QRCode.toDataURL(data.persistentUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#1e293b', light: '#ffffff' }
      });
      
      setQrDataUrl(qrData);
      
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при генерации QR-кода');
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');
      
      await generatePersistentQR();
      
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при перегенерации токена');
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Не удалось скопировать:', err);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-${email.replace('@', '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  useEffect(() => {
    generatePersistentQR();
  }, [email]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Постоянный QR-код</h3>
              <p className="text-xs text-slate-500">Безопасный доступ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Информация о пользователе */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium text-slate-900">{fullName || email}</span>
              {fullName && <span className="ml-2 text-slate-500 font-mono text-xs">{email}</span>}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <Shield size={14} />
              <span className="text-xs font-medium">Активен</span>
            </div>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        )}

        {/* Контент */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
              <span className="text-sm text-slate-500">Генерация QR-кода…</span>
            </div>
          ) : qrDataUrl ? (
            <div className="grid md:grid-cols-[280px_1fr] gap-6">
              {/* QR Код */}
              <div className="flex flex-col items-center">
                <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm">
                  <img
                    src={qrDataUrl}
                    alt="QR-код"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <p className="mt-3 text-center text-xs text-slate-500">
                  Отсканируйте для входа
                </p>
                <button
                  onClick={downloadQR}
                  className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  <Download size={16} />
                  Скачать QR
                </button>
              </div>

              {/* Информация */}
              <div className="space-y-4">
                {/* Ссылка */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Ссылка для доступа
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={persistentUrl}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono truncate"
                    />
                    <button
                      onClick={() => copyToClipboard(persistentUrl, 'url')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        copied === 'url'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {copied === 'url' ? '✓' : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Токен */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Токен авторизации
                  </label>
                  <div className="flex gap-2">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono"
                    />
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
                    >
                      {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(token, 'token')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        copied === 'token'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {copied === 'token' ? '✓' : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Храните токен в безопасности
                  </p>
                </div>

                {/* Обновить */}
                <div className="pt-2">
                  <button
                    onClick={regenerateToken}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Обновить токен
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Футер */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            QR-код действителен бессрочно до момента перегенерации
          </p>
        </div>
      </div>
    </div>
  );
}
