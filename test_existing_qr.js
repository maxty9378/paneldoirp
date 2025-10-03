// Тест существующих QR кодов
const SUPABASE_URL = 'https://oaockmesooydvausfoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

async function testExistingQR() {
  console.log('🔍 Тестируем существующие QR коды...');
  
  try {
    // 1. Получаем список активных QR токенов из базы
    console.log('📋 Получаем список QR токенов...');
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: tokens, error: tokensError } = await supabase
      .from('user_qr_tokens')
      .select('token, user_id, created_at, is_active')
      .eq('is_active', true)
      .limit(5);
    
    if (tokensError) {
      console.error('❌ Ошибка получения токенов:', tokensError);
      return;
    }
    
    console.log('✅ Найдено токенов:', tokens.length);
    tokens.forEach((token, i) => {
      console.log(`${i + 1}. Токен: ${token.token.substring(0, 8)}... (пользователь: ${token.user_id})`);
    });
    
    if (tokens.length === 0) {
      console.log('❌ Нет активных QR токенов в базе!');
      return;
    }
    
    // 2. Тестируем авторизацию с первым токеном
    const testToken = tokens[0].token;
    console.log(`\n🔑 Тестируем авторизацию с токеном: ${testToken.substring(0, 8)}...`);
    
    const authResponse = await fetch(`${SUPABASE_URL}/functions/v1/auth-by-qr-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token: testToken })
    });

    const authData = await authResponse.json();
    console.log('🔑 Auth response status:', authResponse.status);
    console.log('🔑 Auth response data:', authData);

    if (!authResponse.ok || !authData.success) {
      console.error('❌ Ошибка авторизации:', authData.error);
      
      // Проверяем, есть ли пользователь в auth.users
      console.log('\n👤 Проверяем пользователя в auth.users...');
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('❌ Ошибка получения пользователей:', usersError);
      } else {
        const user = users.users.find(u => u.id === tokens[0].user_id);
        if (user) {
          console.log('✅ Пользователь найден:', user.email);
        } else {
          console.log('❌ Пользователь не найден в auth.users!');
        }
      }
    } else {
      console.log('✅ Авторизация успешна!');
      console.log('🔗 Redirect URL:', authData.redirectUrl);
    }

  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  }
}

// Запускаем тест
testExistingQR();

