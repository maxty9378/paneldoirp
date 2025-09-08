import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, RefreshCw, Eye, EyeOff } from 'lucide-react';
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

  const generatePersistentQR = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Generating persistent QR for:', email);
      
      const { data, error } = await supabase.functions.invoke('generate-persistent-qr', {
        body: { email }
      });

      if (error) {
        console.error('❌ Error generating persistent QR:', error);
        throw new Error(error.message || 'Failed to generate persistent QR');
      }

      console.log('✅ Persistent QR generated:', data);
      
      setPersistentUrl(data.persistentUrl);
      setToken(data.token);
      
      // Генерируем QR код
      const qrData = await QRCode.toDataURL(data.persistentUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrDataUrl(qrData);
      
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Произошла ошибка при генерации QR кода');
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Деактивируем старый токен через обновление в БД
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Генерируем новый токен
      await generatePersistentQR();
      
    } catch (err: any) {
      console.error('❌ Error regenerating token:', err);
      setError(err.message || 'Произошла ошибка при перегенерации токена');
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Можно добавить уведомление об успешном копировании
    } catch (err) {
      console.error('Failed to copy:', err);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <QrCode className="text-blue-600" size={24} />
              <h3 className="text-lg font-semibold">Постоянный QR код</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Для пользователя: <span className="font-medium">{fullName || email}</span>
            </p>
            {fullName && (
              <p className="text-xs text-gray-500 mb-1">
                Email: <span className="font-mono">{email}</span>
              </p>
            )}
            <p className="text-xs text-gray-500">
              Этот QR код можно использовать многократно для входа в систему
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-blue-600" size={32} />
              <span className="ml-2 text-gray-600">Генерация QR кода...</span>
            </div>
          ) : qrDataUrl ? (
            <div className="space-y-4">
              {/* QR код */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL для QR кода:
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={persistentUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(persistentUrl)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Токен */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Токен:
                </label>
                <div className="flex">
                  <input
                    type={showToken ? "text" : "password"}
                    value={token}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm font-mono"
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="px-3 py-2 bg-gray-100 border-t border-b border-gray-300 hover:bg-gray-200"
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(token)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex space-x-2 pt-4">
                <button
                  onClick={downloadQR}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <Download size={16} />
                  <span>Скачать QR</span>
                </button>
                
                <button
                  onClick={regenerateToken}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  <span>Перегенерировать</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
