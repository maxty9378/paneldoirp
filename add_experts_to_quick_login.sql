-- Скрипт для добавления всех экспертов в быстрый вход
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Сначала посмотрим, сколько экспертов у нас есть
SELECT 
    COUNT(*) as total_experts,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as experts_with_email
FROM users 
WHERE role = 'expert' 
  AND is_active = true 
  AND status = 'active';

-- 2. Покажем список всех экспертов
SELECT 
    id,
    email,
    full_name,
    role,
    last_sign_in_at,
    created_at
FROM users 
WHERE role = 'expert' 
  AND is_active = true 
  AND status = 'active'
  AND email IS NOT NULL
ORDER BY last_sign_in_at DESC NULLS LAST, created_at DESC;

-- 3. Создаем функцию для добавления экспертов в кэш быстрого входа
-- (Эта функция будет вызываться из фронтенда)

-- 4. Создаем временную таблицу с данными экспертов для быстрого входа
CREATE TEMP TABLE experts_for_quick_login AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.avatar_url,
    COALESCE(u.last_sign_in_at, u.created_at) as last_sign_in_at
FROM users u
WHERE u.role = 'expert' 
  AND u.is_active = true 
  AND u.status = 'active'
  AND u.email IS NOT NULL
  AND u.email != ''
ORDER BY COALESCE(u.last_sign_in_at, u.created_at) DESC;

-- 5. Показываем, что мы нашли
SELECT 
    COUNT(*) as experts_found,
    STRING_AGG(full_name, ', ' ORDER BY last_sign_in_at DESC) as expert_names
FROM experts_for_quick_login;

-- 6. Создаем JSON данные для localStorage (для копирования в браузер)
SELECT 
    'Скопируйте этот JSON в localStorage браузера:' as instruction,
    json_agg(
        json_build_object(
            'id', id,
            'email', email,
            'full_name', full_name,
            'role', role,
            'last_sign_in_at', last_sign_in_at::text,
            'avatar_url', avatar_url
        ) ORDER BY last_sign_in_at DESC
    ) as cached_users_json
FROM experts_for_quick_login;

-- 7. Альтернативный вариант - создаем скрипт для выполнения в браузере
SELECT 
    'Выполните этот JavaScript код в консоли браузера:' as instruction,
    'localStorage.setItem("cached_users", ' || 
    quote_literal(
        json_agg(
            json_build_object(
                'id', id,
                'email', email,
                'full_name', full_name,
                'role', role,
                'last_sign_in_at', last_sign_in_at::text,
                'avatar_url', avatar_url
            ) ORDER BY last_sign_in_at DESC
        )::text
    ) || ');' as javascript_code
FROM experts_for_quick_login;

-- 8. Создаем Edge Function для автоматического добавления экспертов
-- (Этот код нужно будет добавить в новую Edge Function)

SELECT 
    'Создайте Edge Function с этим кодом:' as instruction,
    '// Edge Function: add-experts-to-cache
// POST /functions/v1/add-experts-to-cache

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Получаем всех экспертов
    const { data: experts, error } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role, avatar_url, last_sign_in_at, created_at")
      .eq("role", "expert")
      .eq("is_active", true)
      .eq("status", "active")
      .not("email", "is", null)
      .order("last_sign_in_at", { ascending: false, nullsFirst: false })

    if (error) throw error

    // Формируем данные для кэша
    const cachedUsers = experts.map(expert => ({
      id: expert.id,
      email: expert.email,
      full_name: expert.full_name,
      role: expert.role,
      last_sign_in_at: expert.last_sign_in_at || expert.created_at,
      avatar_url: expert.avatar_url
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        experts: cachedUsers,
        count: cachedUsers.length,
        message: "Эксперты готовы для добавления в быстрый вход"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    )
  }
})' as edge_function_code;

-- 9. Очищаем временную таблицу
DROP TABLE IF EXISTS experts_for_quick_login;

-- 10. Финальная статистика
SELECT 
    'Статистика экспертов:' as info,
    COUNT(*) as total_experts,
    COUNT(CASE WHEN last_sign_in_at IS NOT NULL THEN 1 END) as experts_with_sign_in,
    COUNT(CASE WHEN avatar_url IS NOT NULL THEN 1 END) as experts_with_avatar
FROM users 
WHERE role = 'expert' 
  AND is_active = true 
  AND status = 'active'
  AND email IS NOT NULL;
