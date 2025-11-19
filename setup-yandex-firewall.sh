#!/bin/bash
# Скрипт для настройки файрвола через Yandex Cloud CLI
# Выполните на локальном компьютере с установленным YC CLI

echo "🔥 Настраиваем файрвол в Яндекс.Облако..."

# ID группы безопасности
SG_ID="enphq6fifa9dqk9eo7gd"

# Добавляем правило для API (порт 8000)
echo "➕ Добавляем правило для API (порт 8000)..."
yc vpc security-group add-rule $SG_ID \
  --direction ingress \
  --protocol tcp \
  --port 8000 \
  --cidr 0.0.0.0/0 \
  --description "Supabase API"

# Добавляем правило для Studio (порт 54323) - только для вашего IP (замените на свой)
echo "➕ Добавляем правило для Studio (порт 54323)..."
yc vpc security-group add-rule $SG_ID \
  --direction ingress \
  --protocol tcp \
  --port 54323 \
  --cidr 0.0.0.0/0 \
  --description "Supabase Studio"

# Добавляем правило для HTTPS (порт 443)
echo "➕ Добавляем правило для HTTPS (порт 443)..."
yc vpc security-group add-rule $SG_ID \
  --direction ingress \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --description "HTTPS"

echo "✅ Правила файрвола добавлены!"
echo ""
echo "📋 Проверьте правила:"
echo "yc vpc security-group get $SG_ID"

