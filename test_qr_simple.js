// Простой тест QR авторизации
const SUPABASE_URL = 'https://oaockmesooydvausfoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

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

