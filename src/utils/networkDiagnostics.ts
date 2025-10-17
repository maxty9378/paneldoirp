/**
 * Диагностика сетевых проблем для мобильных операторов
 */

export interface NetworkDiagnostics {
  isOnline: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
}

// Проверяем статус сети
export function checkNetworkStatus(): NetworkDiagnostics {
  const diagnostics: NetworkDiagnostics = {
    isOnline: navigator.onLine,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // Проверяем Connection API (если доступен)
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (connection) {
    diagnostics.connectionType = connection.type;
    diagnostics.effectiveType = connection.effectiveType;
    diagnostics.downlink = connection.downlink;
    diagnostics.rtt = connection.rtt;
    diagnostics.saveData = connection.saveData;
  }

  return diagnostics;
}

// Логируем информацию о сети
export function logNetworkDiagnostics(): void {
  const diagnostics = checkNetworkStatus();
  
  console.log('📡 Network Diagnostics:');
  console.log('  Online:', diagnostics.isOnline ? '✅' : '❌');
  console.log('  Connection Type:', diagnostics.connectionType || 'unknown');
  console.log('  Effective Type:', diagnostics.effectiveType || 'unknown');
  console.log('  Downlink:', diagnostics.downlink ? `${diagnostics.downlink} Mbps` : 'unknown');
  console.log('  RTT:', diagnostics.rtt ? `${diagnostics.rtt} ms` : 'unknown');
  console.log('  Save Data:', diagnostics.saveData ? '✅' : '❌');
  console.log('  Platform:', diagnostics.platform);
  console.log('  User Agent:', diagnostics.userAgent);
  console.log('  Language:', diagnostics.language);
  console.log('  Timezone:', diagnostics.timezone);
  
  // Проверяем, есть ли проблемы с сетью
  if (!diagnostics.isOnline) {
    console.warn('⚠️ Device is offline!');
  }
  
  if (diagnostics.effectiveType === 'slow-2g' || diagnostics.effectiveType === '2g') {
    console.warn('⚠️ Slow network connection detected!');
  }
  
  if (diagnostics.rtt && diagnostics.rtt > 1000) {
    console.warn('⚠️ High latency detected!');
  }
}

// Проверяем, является ли оператор МТС
export function isMTSOperator(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  // Проверяем по User-Agent
  const mtsKeywords = ['mts', 'mcc250', 'mnc01'];
  const hasMTS = mtsKeywords.some(keyword => ua.includes(keyword));
  
  // Проверяем по connection type
  const isMobileConnection = connection && (
    connection.type === 'cellular' || 
    connection.type === 'wimax'
  );
  
  return hasMTS || isMobileConnection;
}

// Проверяем доступность Supabase
export async function checkSupabaseAvailability(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch('https://oaockmesooydvausfoca.supabase.co/rest/v1/', {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE',
      },
    });
    
    clearTimeout(timeoutId);
    
    console.log('✅ Supabase is reachable:', response.status);
    return response.ok;
  } catch (error) {
    console.error('❌ Supabase is not reachable:', error);
    return false;
  }
}

// Полная диагностика
export async function fullDiagnostics(): Promise<void> {
  console.log('🔍 Starting full diagnostics...');
  
  // Проверяем сеть
  logNetworkDiagnostics();
  
  // Проверяем оператора
  if (isMTSOperator()) {
    console.log('📱 MTS operator detected');
  }
  
  // Проверяем Supabase
  const isSupabaseReachable = await checkSupabaseAvailability();
  
  if (!isSupabaseReachable) {
    console.error('❌ Cannot reach Supabase. Possible issues:');
    console.error('  1. Network connectivity problems');
    console.error('  2. Firewall or proxy blocking requests');
    console.error('  3. DNS resolution issues');
    console.error('  4. Mobile operator restrictions');
  }
  
  console.log('🔍 Diagnostics complete');
}

// Инициализация диагностики
export function initNetworkDiagnostics(): void {
  // Проверяем при загрузке
  fullDiagnostics();
  
  // Проверяем при изменении статуса сети
  window.addEventListener('online', () => {
    console.log('✅ Network is back online');
    fullDiagnostics();
  });
  
  window.addEventListener('offline', () => {
    console.error('❌ Network is offline');
  });
  
  // Проверяем при изменении типа соединения
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (connection) {
    connection.addEventListener('change', () => {
      console.log('📡 Connection type changed');
      logNetworkDiagnostics();
    });
  }
}

