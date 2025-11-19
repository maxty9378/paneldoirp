#!/bin/bash
# Создаем правильный config.toml

cd ~/supabase

# Берем оригинальный config до секции [api]
head -6 supabase/config.toml.backup > supabase/config.toml.new 2>/dev/null || head -6 supabase/config.toml > supabase/config.toml.new

# Добавляем правильную секцию [api]
cat >> supabase/config.toml.new << 'EOF'
[api]
enabled = true
port = 8000
schemas = ["public", "storage", "graphql_public"]
EOF

# Добавляем остальной config, пропуская старую секцию [api]
awk '
BEGIN { skip_api = 0 }
/^\[api\]/ { skip_api = 1; next }
/^\[/ && skip_api { skip_api = 0 }
skip_api == 0 { print }
' supabase/config.toml.backup >> supabase/config.toml.new 2>/dev/null || \
awk '
BEGIN { skip_api = 0 }
/^\[api\]/ { skip_api = 1; next }
/^\[/ && skip_api { skip_api = 0 }
skip_api == 0 { print }
' supabase/config.toml >> supabase/config.toml.new

mv supabase/config.toml.new supabase/config.toml

echo "Проверка:"
grep -A 4 '\[api\]' supabase/config.toml | head -6

