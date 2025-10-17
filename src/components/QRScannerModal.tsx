import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, AlertCircle, Smartphone } from 'lucide-react';
import jsQR from 'jsqr';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (token: string) => void;
}

export function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isOpen) {
      // Останавливаем камеру при закрытии
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      return;
    }

    const startCamera = async () => {
      try {
        setError('');
        setScanning(true);

        // Запрашиваем доступ к камере с разными настройками
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' }, // Задняя камера
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        console.log('📷 Запрашиваем доступ к камере...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Доступ к камере получен');

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          // Ждем, пока видео загрузится
          await new Promise((resolve) => {
            videoRef.current!.onloadedmetadata = () => {
              videoRef.current!.play().then(resolve).catch((err) => {
                console.error('Ошибка воспроизведения видео:', err);
                setError('Не удалось запустить камеру');
                setScanning(false);
              });
            };
          });
        }

        // Запускаем распознавание QR-кода
        startQRDetection();
      } catch (err: any) {
        console.error('❌ Ошибка камеры:', err);
        setError(`Не удалось получить доступ к камере: ${err.message || 'Неизвестная ошибка'}`);
        setScanning(false);
      }
    };

    const startQRDetection = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const detectQR = () => {
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationFrameRef.current = requestAnimationFrame(detectQR);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Используем jsQR для распознавания
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleQRDetected(code.data);
        } else {
          animationFrameRef.current = requestAnimationFrame(detectQR);
        }
      };

      detectQR();
    };

    startCamera();

    return () => {
      // Останавливаем камеру при закрытии
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setScanning(false);
    };
  }, [isOpen]);

  const handleQRDetected = (data: string) => {
    console.log('📱 QR-код распознан:', data);
    
    // Извлекаем токен из URL
    const match = data.match(/\/auth\/qr\/([a-f0-9]{64})/);
    if (match && match[1]) {
      const token = match[1];
      console.log('✅ Токен извлечен:', token.substring(0, 8) + '...');
      onScan(token);
      onClose();
    } else {
      setError('Неверный QR-код. Отсканируйте QR-код эксперта.');
      // Продолжаем сканирование через 3 секунды
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleManualInput = () => {
    const token = prompt('Введите токен QR-кода (64 символа):');
    if (token && token.length === 64) {
      onScan(token);
      onClose();
    } else if (token) {
      setError('Неверный формат токена. Токен должен содержать 64 символа.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Сканирование QR</h3>
              <p className="text-xs text-gray-500">Наведите камеру на QR-код</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Видео камеры */}
        <div className="relative bg-black">
          {!scanning ? (
            <div className="flex items-center justify-center h-96 bg-gray-900">
              <div className="text-center text-white">
                <Smartphone className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Загрузка камеры...</p>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
                style={{ maxHeight: '400px', objectFit: 'cover' }}
              />
              
              {/* Рамка для сканирования */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {/* Углы рамки */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  
                  {/* Анимированная линия сканирования */}
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div 
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" 
                      style={{
                        top: '50%',
                        animation: 'scanLine 2s ease-in-out infinite'
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Оверлей с затемнением */}
              <div className="absolute inset-0 bg-black/50 pointer-events-none" style={{
                clipPath: 'polygon(0% 0%, 0% 100%, 25% 100%, 25% 25%, 75% 25%, 75% 75%, 25% 75%, 25% 100%, 100% 100%, 100% 0%)'
              }} />
            </>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Ошибка */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-600 font-medium">{error}</p>
              {error.includes('доступ') && (
                <p className="text-xs text-red-500 mt-1">
                  Проверьте разрешения браузера в настройках
                </p>
              )}
            </div>
          </div>
        )}

        {/* Подсказка */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-emerald-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">
                {scanning ? 'Сканирование...' : 'Ожидание камеры'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {scanning ? 'Наведите камеру на QR-код' : 'Разрешите доступ к камере'}
              </p>
            </div>
            <button
              onClick={handleManualInput}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              Ввести вручную
            </button>
          </div>
        </div>
      </div>

      {/* CSS для анимации */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { 
            transform: translateY(-100%); 
            opacity: 0;
          }
          50% { 
            transform: translateY(100%); 
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
