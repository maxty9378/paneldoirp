#!/bin/bash
# Скрипт для очистки config.toml от дубликатов

cd ~/supabase

# Создаем бэкап
cp supabase/config.toml supabase/config.toml.backup4

# Используем awk для удаления дубликатов
awk '
BEGIN { 
    api_seen=0
    db_seen=0
    auth_seen=0
    in_section=""
}
/^\[api\]/ {
    if (api_seen) {
        skip_section=1
        next
    }
    api_seen=1
    in_section="api"
    skip_section=0
    print
    next
}
/^\[db\]/ {
    if (db_seen) {
        skip_section=1
        next
    }
    db_seen=1
    in_section="db"
    skip_section=0
    print
    next
}
/^\[auth\]/ {
    if (auth_seen) {
        skip_section=1
        next
    }
    auth_seen=1
    in_section="auth"
    skip_section=0
    print
    next
}
/^\[/ {
    in_section=""
    skip_section=0
    print
    next
}
{
    if (!skip_section) {
        print
    }
}
' supabase/config.toml.backup4 > supabase/config.toml

echo "Дубликаты удалены"
echo ""
echo "Проверка секций:"
grep -n '^\[' supabase/config.toml | grep -E '\[api\]|\[db\]|\[auth\]'

