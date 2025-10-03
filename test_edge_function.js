// Тест edge function с правильными заголовками
const SUPABASE_URL = 'https://oaockmesooydvausfoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

async function testEdgeFunction() {
  console.log('🔍 Тестируем edge function...');
  
  // Тестовый токен (замените на реальный)
  const testToken = 'ba68c4751234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  
  try {
    console.log(`🔑 Тестируем с токеном: ${testToken.substring(0, 8)}...`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-by-qr-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token: testToken })
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📊 Response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Ошибка:', data.message || data.error);
    } else {
      console.log('✅ Успешно!');
    }

  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

// Также тестируем функцию генерации QR
async function testGenerateQR() {
  console.log('\n🔍 Тестируем генерацию QR...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-persistent-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: 'doirp@sns.ru' })
    });

    console.log('📊 Generate response status:', response.status);
    const data = await response.json();
    console.log('📊 Generate response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Ошибка генерации:', error.message);
  }
}

// Запускаем тесты
testEdgeFunction();
testGenerateQR();




