// Простой тест QR авторизации
const SUPABASE_URL = 'https://oaockmesooydvausfoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

async function testQRAuth() {
  console.log('🔍 Тестируем QR авторизацию...');
  
  try {
    // 1. Генерируем QR токен
    console.log('📧 Генерируем QR токен для doirp@sns.ru...');
    const generateResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-persistent-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: 'doirp@sns.ru' })
    });

    const generateData = await generateResponse.json();
    console.log('📧 Generate response:', generateData);

    if (!generateResponse.ok) {
      throw new Error(`Ошибка генерации: ${generateData.error}`);
    }

    const token = generateData.token;
    console.log('✅ QR токен сгенерирован:', token.substring(0, 8) + '...');

    // 2. Тестируем авторизацию по QR
    console.log('🔑 Тестируем авторизацию по QR...');
    const authResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-by-qr-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token })
    });

    const authData = await authResponse.json();
    console.log('🔑 Auth response:', authData);

    if (!authResponse.ok || !authData.success) {
      throw new Error(`Ошибка авторизации: ${authData.error}`);
    }

    console.log('✅ Авторизация успешна!');
    console.log('🔗 Redirect URL:', authData.redirectUrl);
    console.log('🎯 Нужна активация:', authData.needsActivation);

  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

// Запускаем тест
testQRAuth();

