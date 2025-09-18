// Простой тест QR авторизации
const SUPABASE_URL = 'https://oaockmesooydvausfoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4NzMsImV4cCI6MjA1MjU1MDg3M30.GhDbwgQ1cqFc4oUuPo-GaQpDY2zFACbLVniNY_OSCpTJKML3KR5D2hfWaquL2AOhG0BmCR1EYiW5d_Y4ZB2F2Q';

async function testQRAuth() {
  console.log('🔍 Тестируем QR авторизацию...');
  
  // Тестовый токен (замените на реальный из базы)
  const testToken = 'test-token-123';
  
  try {
    console.log(`🔑 Тестируем авторизацию с токеном: ${testToken}...`);
    
    const authResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-by-qr-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token: testToken })
    });

    console.log('🔑 Auth response status:', authResponse.status);
    const authData = await authResponse.json();
    console.log('🔑 Auth response data:', JSON.stringify(authData, null, 2));

    if (!authResponse.ok || !authData.success) {
      console.error('❌ Ошибка авторизации:', authData.error);
    } else {
      console.log('✅ Авторизация успешна!');
      console.log('🔗 Redirect URL:', authData.redirectUrl);
    }

  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

// Запускаем тест
testQRAuth();
