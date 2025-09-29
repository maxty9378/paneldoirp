# Быстрый старт деплоя на Яндекс.Облако

## Предварительные требования

1. **Установите Docker Desktop** для Windows
2. **Установите Yandex Cloud CLI**:
   ```powershell
   # Скачайте и установите с официального сайта
   # https://cloud.yandex.ru/docs/cli/quickstart
   ```

3. **Настройте аутентификацию**:
   ```powershell
   yc init
   ```

## Быстрый деплой

### 1. Настройте переменные окружения
Создайте файл `.env.production` в корне проекта:
```env
NODE_ENV=production
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Создайте Container Registry
```powershell
yc container registry create --name doirp-registry
yc container registry configure-docker
```

### 3. Запустите деплой
```powershell
# Для виртуальной машины
.\deploy.ps1 vm

# Для Serverless Containers
.\deploy.ps1 serverless

# Для Kubernetes
.\deploy.ps1 k8s
```

## Ручной деплой

### Сборка и загрузка образа
```powershell
# Соберите образ
docker build -t cr.yandex/your-registry-id/doirp-app:latest .

# Загрузите в реестр
docker push cr.yandex/your-registry-id/doirp-app:latest
```

### Запуск на VM
```powershell
# Создайте VM
yc compute instance create --name doirp-vm --zone ru-central1-a --cores 2 --memory 4 --create-boot-disk image-family=container-optimized-image,size=20

# Запустите контейнер
ssh yc-user@vm-ip "sudo docker run -d --name doirp-app -p 80:80 cr.yandex/your-registry-id/doirp-app:latest"
```

## Проверка деплоя

После деплоя ваше приложение будет доступно по адресу:
- **VM**: `http://your-vm-ip`
- **Serverless**: URL из вывода команды деплоя
- **Kubernetes**: `kubectl get ingress` для получения адреса

## Полезные команды

```powershell
# Просмотр логов
docker logs doirp-app

# Остановка контейнера
docker stop doirp-app

# Перезапуск контейнера
docker restart doirp-app

# Обновление приложения
.\deploy.ps1 vm
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker logs doirp-app`
2. Убедитесь, что переменные окружения настроены правильно
3. Проверьте, что Supabase URL и ключи корректны
4. Убедитесь, что порт 80 свободен на сервере
