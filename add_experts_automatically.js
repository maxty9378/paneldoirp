// Скрипт для автоматического добавления всех экспертов в быстрый вход
// Выполните этот код в консоли браузера на странице приложения

async function addAllExpertsToQuickLogin() {
    console.log('🚀 Начинаем добавление экспертов в быстрый вход...');
    
    try {
        // 1. Получаем всех экспертов через Supabase
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = 'https://oaockmesooydvausfoca.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4NzMsImV4cCI6MjA1MjU1MDg3M30.GhDbwgQ1cqFc4oUuPo-GaQpDY2zFACbLVniNY_OSCpTJKML3KR5D2hfWaquL2AOhG0BmCR1EYiW5d_Y4ZB2F2Q';
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        console.log('📡 Загружаем список экспертов...');
        const { data: experts, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, avatar_url, last_sign_in_at, created_at')
            .eq('role', 'expert')
            .eq('is_active', true)
            .eq('status', 'active')
            .not('email', 'is', null)
            .order('last_sign_in_at', { ascending: false, nullsFirst: false });
        
        if (error) {
            throw new Error(`Ошибка загрузки экспертов: ${error.message}`);
        }
        
        console.log(`✅ Найдено экспертов: ${experts.length}`);
        
        // 2. Формируем данные для кэша
        const cachedUsers = experts.map(expert => ({
            id: expert.id,
            email: expert.email,
            full_name: expert.full_name,
            role: expert.role,
            last_sign_in_at: expert.last_sign_in_at || expert.created_at,
            avatar_url: expert.avatar_url
        }));
        
        // 3. Получаем существующих пользователей из кэша
        const existingCached = localStorage.getItem('cached_users');
        let allUsers = existingCached ? JSON.parse(existingCached) : [];
        
        // 4. Добавляем экспертов, избегая дублирования
        const existingIds = new Set(allUsers.map(user => user.id));
        const newExperts = cachedUsers.filter(expert => !existingIds.has(expert.id));
        
        if (newExperts.length > 0) {
            // Добавляем новых экспертов в начало списка
            allUsers = [...newExperts, ...allUsers];
            
            // Ограничиваем общее количество до 10 пользователей
            if (allUsers.length > 10) {
                allUsers = allUsers.slice(0, 10);
            }
            
            // Сохраняем в localStorage
            localStorage.setItem('cached_users', JSON.stringify(allUsers));
            
            console.log(`✅ Добавлено новых экспертов: ${newExperts.length}`);
            console.log(`📊 Всего пользователей в кэше: ${allUsers.length}`);
            
            // Показываем список добавленных экспертов
            console.log('👥 Добавленные эксперты:');
            newExperts.forEach((expert, index) => {
                console.log(`${index + 1}. ${expert.full_name} (${expert.email})`);
            });
            
            // Показываем общий список
            console.log('📋 Все пользователи в быстром входе:');
            allUsers.forEach((user, index) => {
                const isExpert = user.role === 'expert';
                console.log(`${index + 1}. ${user.full_name} (${user.email}) ${isExpert ? '👨‍💼' : '👤'}`);
            });
            
        } else {
            console.log('ℹ️ Все эксперты уже добавлены в быстрый вход');
        }
        
        return {
            success: true,
            added: newExperts.length,
            total: allUsers.length,
            experts: newExperts
        };
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Функция для очистки кэша
function clearQuickLoginCache() {
    localStorage.removeItem('cached_users');
    console.log('🗑️ Кэш быстрого входа очищен');
}

// Функция для просмотра текущего кэша
function viewQuickLoginCache() {
    const cached = localStorage.getItem('cached_users');
    if (cached) {
        const users = JSON.parse(cached);
        console.log(`📋 Пользователи в кэше (${users.length}):`);
        users.forEach((user, index) => {
            const isExpert = user.role === 'expert';
            console.log(`${index + 1}. ${user.full_name} (${user.email}) ${isExpert ? '👨‍💼' : '👤'}`);
        });
        return users;
    } else {
        console.log('❌ Кэш пуст');
        return [];
    }
}

// Функция для добавления конкретного эксперта по email
async function addExpertByEmail(email) {
    try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = 'https://oaockmesooydvausfoca.supabase.co';
        const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hb2NrbWVzb295ZHZhdXNmb2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5NzQ4NzMsImV4cCI6MjA1MjU1MDg3M30.GhDbwgQ1cqFc4oUuPo-GaQpDY2zFACbLVniNY_OSCpTJKML3KR5D2hfWaquL2AOhG0BmCR1EYiW5d_Y4ZB2F2Q';
        
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data: expert, error } = await supabase
            .from('users')
            .select('id, email, full_name, role, avatar_url, last_sign_in_at, created_at')
            .eq('email', email)
            .eq('role', 'expert')
            .eq('is_active', true)
            .single();
        
        if (error) {
            throw new Error(`Эксперт не найден: ${error.message}`);
        }
        
        const cachedUser = {
            id: expert.id,
            email: expert.email,
            full_name: expert.full_name,
            role: expert.role,
            last_sign_in_at: expert.last_sign_in_at || expert.created_at,
            avatar_url: expert.avatar_url
        };
        
        const existingCached = localStorage.getItem('cached_users');
        let allUsers = existingCached ? JSON.parse(existingCached) : [];
        
        // Удаляем если уже есть
        allUsers = allUsers.filter(user => user.id !== expert.id);
        
        // Добавляем в начало
        allUsers.unshift(cachedUser);
        
        // Ограничиваем количество
        if (allUsers.length > 10) {
            allUsers = allUsers.slice(0, 10);
        }
        
        localStorage.setItem('cached_users', JSON.stringify(allUsers));
        
        console.log(`✅ Эксперт добавлен: ${expert.full_name} (${expert.email})`);
        return { success: true, expert: cachedUser };
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        return { success: false, error: error.message };
    }
}

// Экспортируем функции в глобальную область
window.addAllExpertsToQuickLogin = addAllExpertsToQuickLogin;
window.clearQuickLoginCache = clearQuickLoginCache;
window.viewQuickLoginCache = viewQuickLoginCache;
window.addExpertByEmail = addExpertByEmail;

console.log('🔧 Функции загружены:');
console.log('- addAllExpertsToQuickLogin() - добавить всех экспертов');
console.log('- addExpertByEmail("email@example.com") - добавить конкретного эксперта');
console.log('- viewQuickLoginCache() - посмотреть текущий кэш');
console.log('- clearQuickLoginCache() - очистить кэш');

// Автоматически запускаем добавление всех экспертов
console.log('🚀 Запускаем автоматическое добавление экспертов...');
addAllExpertsToQuickLogin();
