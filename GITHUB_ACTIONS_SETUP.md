# 🔧 Настройка GitHub Actions для автоматического деплоя

## ❌ Проблема
GitHub Actions не может подключиться к серверу, потому что не настроен SSH ключ в секретах.

## ✅ Решение

### 1. Добавьте SSH ключ в секреты GitHub:

1. **Перейдите в настройки репозитория**:
   - https://github.com/maxty9378/paneldoirp/settings/secrets/actions

2. **Нажмите "New repository secret"**

3. **Добавьте секрет с именем**: `SSH_PRIVATE_KEY`

4. **Скопируйте содержимое SSH ключа**:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEogIBAAKCAQEAodQuIHtCjaBQp7/PWoIJfq+sp9bCLILvwTnnFxU373izisX5ueqgjfc9
   tTbd82gMfpZxgq8d14Z1Ol5AKYDnGS2yiurWwt8uDLrmoxhFKItlmAFi/Tp3WiXQJG29L7jK
   cJ4RaO72PfyponFkD+qrBP5eJ9YzPeA6HkFqL/aqpkPW0BWpKoDAL0M0gd/oP4PFlZ81DH8/
   NjG9CCALUZDvNimWgPMhNijhQE5eArDYMlwTwE7/bYatg2Dv1AyyIPzoea2coOlADs1bXj+J
   GLqpm5ZwY6rdGkdP3OibAbdxL4zbBG1n1O/1cPswdscS6y7qe6n1Dmz5eqq1b07TP3eDlQID
   AQABAoIBABaHsqz9VtHeliFnVXLYNC00lQ5ARS6q7hPnP/1D4X06vzhcrBIOZdr4py6HBys/
   pa8BZVKYlx2DT+fX6Qk+M9katnGbv1mdy8ykQBRIfpG7UozGnfr7vFPLJul4yRmPRHPzCyEi
   VRsNMFV4LEJWXV1Scqu2KSfTWL657xLivcsW4W9ILQLxWB1Y7xu064ydUo0f+XQB48tuOV4t
   A4EX4LSQ7038W1D+cbMnK93O/KgO9l7xXm/xzz1FMidEIgShbBgvFhZj4g0IcgwgIERV0Bj1
   jFVFcJxhih48Y6VuzdEhbb3Rf8EVHogt/fD35qxq34bY1L8S+cI8dLL+inLCvOMCgYEA4xhR
   272yRApZVLMygikOHz5bZKLtq8gqeSziNzQM/bNSpiSKOjVT5O0Dth/rFMBwmjB2xK6C/EGg
   sUwqO9/hdwD6ECfRbjOkYtcYdMaSyml3He61MVpUJ5ca801+gLv6H+u+ySz9PEAc5h3avkP+
   oNJuocK9eDVZP3Q2N1ZScysCgYEAtm05A18OzzsN2+rdZdH5pBVv23etMwGiB8nV0wI6byFQ
   H0xpnTBD1bc4tTkV8puvPguo4tQ4BztQSJTBQea4239Mk0Xdpi64OYjrij4OGmJu20PS1Oak
   MdBU53qK5at/pWV/FEZeQmWiWhHnsn3HglSrvT4t17NAES53k0/hhD8CgYAQ7yRThX7AkiD9
   LuuqRxN1gvnftEKS17dLF+y6fxgk5vVXzEu+cXGTFZV8RD8Mahk7dje1DOpZky8/aVWQ523x
   qNH82GtGk3VDpZR+SLxzeY/XXJCIYJr75MmusO2o/dt1++dbKw6rKoC9LCa+n2Viaq6zQ0lL
   qHbCQ5EzaS12xwKBgEnAKF97i6It7rFs5yrl07YJUJp6bJQFYfsiFwbijLsmzZyJqNz6iUIa
   e5uQQ5Y8aIF99z4Uq74ItbFSKjs5Spy6fzu+8BfiJWplN0xBQDRcfRK5/b9CqzjUT67xdLvb
   NJSqTtDkjfDr49HkETaw8Pp4vqGYRLJCbnFDxuXQUozDAoGAOk4xvyBgqW1Wp+29ulHkk1iP
   +gcc+bmn8L4fRIh9USooe3cAXbNkPbszEOc/ynkzwK4Uf+EpAlRxctmGh3o9t3Q8P5i5wxuB
   7MRNse1SLcjI47PLTUjQrXg0KjI++FjoTGYzW0l9emL4/F9YryyZC5cjvYs8iHb2EnYEC7n8
   o90=
   -----END RSA PRIVATE KEY-----
   ```

### 2. Проверьте настройки GitHub Actions:

- **Файл**: `.github/workflows/deploy.yml`
- **Хост**: `158.160.200.214`
- **Пользователь**: `doirp777`
- **Секрет**: `SSH_PRIVATE_KEY`

### 3. После добавления секрета:

1. **Перейдите в Actions**: https://github.com/maxty9378/paneldoirp/actions
2. **Нажмите "Re-run all jobs"** на последнем workflow
3. **Или сделайте новый push** для запуска автоматического деплоя

## 🔄 Альтернативные способы деплоя:

### 1. Ручной деплой:
```bash
.\update-project.bat
```

### 2. Автоматический деплой на сервере:
```bash
./auto-update.sh
```

### 3. Проверка статуса:
```bash
ssh -i "src\ssh-keys\ssh-key-1758524386393" doirp777@158.160.200.214 "sudo docker ps"
```

## 📋 Текущий статус:

- ✅ **Код отправлен в GitHub**
- ❌ **GitHub Actions не настроен** (нужен SSH ключ)
- ✅ **Автоматическое обновление на сервере работает**
- ✅ **Приложение доступно**: https://158.160.200.214
