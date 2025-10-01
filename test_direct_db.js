// Тест прямого доступа к базе данных
const SUPABASE_URL = 'https://oaockmesooydvausfoca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzI4NDEsImV4cCI6MjA2Njk0ODg0MX0.gwWS35APlyST7_IUvQvJtGO4QmGsvbE95lnQf0H1PUE';

async function testDirectDB() {
  console.log('🔍 Тестируем прямой доступ к базе данных...');
  
  try {
    // Импортируем Supabase клиент
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    console.log('📋 Получаем QR токены...');
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
    
    // Тестируем RPC функцию
    console.log('\n🔍 Тестируем RPC функцию...');
    const testToken = tokens[0].token;
    
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_qr_token_user', { token_param: testToken });
    
    if (rpcError) {
      console.error('❌ Ошибка RPC:', rpcError);
    } else {
      console.log('✅ RPC результат:', rpcResult);
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

// Запускаем тест
testDirectDB();




