#!/bin/bash
# Скрипт для исправления config.toml на ВМ

cd ~/supabase

# Создаем резервную копию
cp supabase/config.toml supabase/config.toml.backup3

# Находим строку с [api] и исправляем секцию
python3 << 'PYEOF'
import re

with open('supabase/config.toml', 'r') as f:
    content = f.read()

# Удаляем все дубликаты секции [api]
lines = content.split('\n')
result = []
in_api = False
api_found = False
api_done = False

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Находим первую секцию [api]
    if stripped == '[api]' and not api_found:
        api_found = True
        in_api = True
        result.append(line)
        continue
    
    # Пропускаем дубликаты [api]
    if stripped == '[api]' and api_found:
        continue
    
    # Если мы в секции [api]
    if in_api:
        # Если начинается новая секция
        if stripped.startswith('[') and stripped != '[api':
            in_api = False
            result.append(line)
        # Если это настройки api, добавляем правильные
        elif 'enabled' in line and 'true' in line:
            result.append('enabled = true')
        elif 'port' in line and '8000' in line:
            result.append('port = 8000')
        elif 'schemas' in line:
            # Пропускаем неправильные schemas
            if 'public' in line and 'storage' in line and 'graphql_public' in line and line.count('"') >= 6:
                result.append('schemas = ["public", "storage", "graphql_public"]')
        elif not stripped.startswith('schemas') or api_done:
            result.append(line)
            if stripped.startswith('['):
                in_api = False
    else:
        result.append(line)

# Если секция [api] не была найдена, добавляем её перед [db]
if not api_found:
    new_content = []
    for i, line in enumerate(result):
        if line.strip() == '[db]':
            new_content.append('[api]')
            new_content.append('enabled = true')
            new_content.append('port = 8000')
            new_content.append('schemas = ["public", "storage", "graphql_public"]')
            new_content.append('')
        new_content.append(line)
    result = new_content

with open('supabase/config.toml', 'w') as f:
    f.write('\n'.join(result))

print('Config исправлен')
PYEOF

echo "Проверяем результат:"
grep -A 4 '\[api\]' supabase/config.toml | head -6

