#!/bin/bash

# Скрипт для обновления сертификата из Yandex Cloud
# Запустите этот скрипт на виртуальной машине

echo "🔒 Обновляем сертификат из Yandex Cloud..."

# Останавливаем текущий контейнер
echo "🛑 Останавливаем текущий контейнер..."
sudo docker stop doirp-app
sudo docker rm doirp-app

# Создаем директорию для сертификатов
sudo mkdir -p /etc/ssl/certs/doirp

# Создаем новый сертификат из Yandex Cloud
echo "📜 Создаем сертификат из Yandex Cloud..."
cat > /etc/ssl/certs/doirp/fullchain.pem << 'EOF'
-----BEGIN CERTIFICATE-----
MIIEPTCCAyWgAwIBAgIUWcCKYp0ihk8X/qLWGC02W8c82gQwDQYJKoZIhvcNAQEL
BQAwga0xCzAJBgNVBAYTAlJVMQ8wDQYDVQQIDAZNb3Njb3cxDzANBgNVBAcMBk1v
c2NvdzEqMCgGA1UECgwhw5DCnsOQwp7DkMKeIMOQwpTDkMKew5DCmMOQwqDDkMKf
MRYwFAYDVQQLDA1JVCBEZXBhcnRtZW50MRgwFgYDVQQDDA8xNTguMTYwLjIwMC4y
MTQxHjAcBgkqhkiG9w0BCQEWD2QwaXJwQHlhbmRleC5ydTAeFw0yNTA5MjkxMTAx
MTFaFw0yNjA5MjkxMTAxMTFaMIGtMQswCQYDVQQGEwJSVTEPMA0GA1UECAwGTW9z
Y293MQ8wDQYDVQQHDAZNb3Njb3cxKjAoBgNVBAoMIcOQwp7DkMKew5DCniDDkMKU
w5DCnsOQwpjDkMKgw5DCnzEWMBQGA1UECwwNSVQgRGVwYXJ0bWVudDEYMBYGA1UE
AwwPMTU4LjE2MC4yMDAuMjE0MR4wHAYJKoZIhvcNAQkBFg9kMGlycEB5YW5kZXgu
cnUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDgT1irDLVNt98wu1JY
CmRCEicLt8ktIukxPs2i9W+4z86sCXa3R/vOcjNw5Zq8Zib+MEtI1GemTjSAjc3v
l9Ll4wxDJULl2FxKvdC0jVUOevoL7+2zWGePxQnxDvpkU7gct4BehrTZ4XQycPwW
4BOLy4NsONZw5mhmKp9tjG2gdcWipy8Y74slhHgazbO0NIEvErXD15cT2/Wsrazs
TDyGDnwR/D6Klaxv88YMAUn4k+j9BMHDnpOlM5MksTENLbnQ0EjytOkeOcD/5c+f
Pnhciz02ayuwlLd6l2QbqTOZVkYQvOZzC6za62wUXONR1DTI1LGgYZSvh7EaGLo1
kAA3AgMBAAGjUzBRMB0GA1UdDgQWBBTE8fHZDqoGlk61HM3fTO5p14cIsDAfBgNV
HSMEGDAWgBTE8fHZDqoGlk61HM3fTO5p14cIsDAPBgNVHRMBAf8EBTADAQH/MA0G
CSqGSIb3DQEBCwUAA4IBAQCU2wl20doBDNO+BCSCdcu4dsGMTtZ0pz4qPO3zzFWV
WdOQG5TUibKeR6GY45hQA/+ajQRVVN8pV2oAZrAg/OIEhRcXSB/0uQkAj9GV/CvT
CH5X/36ST3Xl0+slGLXz1j0uesbCFzlAGycLnsPegq6WV46kMXrMJOrTLZFQc3+F
Q6mfQAdNYGhzP3Axy64p+xi3h6A9g5BPZz1p58nzK5LfkTFVxe5LnPrm0idmwsFX
WKcpeIAbgNCvaYF64EP2uNr27Zn8ABEnqY/Rvzhd0juTVUcu3L70khZ8AEvKBtxI
HrjRtockpbFgkl9664j1/NBm4vJuTPQxB+MwxA9J+/Q1
-----END CERTIFICATE-----
EOF

# Создаем приватный ключ из Yandex Cloud
echo "🔑 Создаем приватный ключ из Yandex Cloud..."
cat > /etc/ssl/certs/doirp/privkey.pem << 'EOF'
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA4E9Yqwy1TbffMLtSWApkQhInC7fJLSLpMT7NovVvuM/OrAl2
t0f7znIzcOWavGYm/jBLSNRnpk40gI3N75fS5eMMQyVC5dhcSr3QtI1VDnr6C+/t
s1hnj8UJ8Q76ZFO4HLeAXoa02eF0MnD8FuATi8uDbDjWcOZoZiqfbYxtoHXFoqcv
GO+LJYR4Gs2ztDSBLxK1w9eXE9v1rK2s7Ew8hg58Efw+ipWsb/PGDAFJ+JPo/QTB
w56TpTOTJLExDS250NBI8rTpHjnA/+XPnz54XIs9NmsrsJS3epdkG6kzmVZGELzm
cwus2utsFFzjUdQ0yNSxoGGUr4exGhi6NZAANwIDAQABAoIBADJoonyONpBoqffB
oRe3/h/7BFtVyhgiqFUwz/W3Qow95ywyVEOMIcKbV4QflU6RhmHJaKHNWh29pX7e
X1FgxTx0ceUFEqukm9kQHz70JBFFAbx9BuYvD9b3aOyLeSnixpVth6O2kh4E1KAh
VAWwBbR83+QKQebNYNjU608rJ9fPNAjnSse2nmK9CJjvUHXSS0AL0SNUgyUS7IRm
JejL42JfH/4h9WqtKiGUVmwIRQiUElZW3+siDqc/brMTCuj0wdw8OSTlv3lHp4xK
hMxtEq+q/KRJFNHhzGvVmSRoHp/pZmVsECNmlrMrHVSB7Vk17jBok0oMXkZwuHzT
JGbsBwECgYEA9HU1oH2RqtXZ+HMboTEvarAnSuX0W75R+Y+ID7bVttOYdr87eR1U
d9wWmXdLiXnaEWIUiDDvt3d0yNqb9GG3R+sI7jfLtrwyAVo7bINuGPeHANPN026A
ZTFVcrEajHbLxKhvBECGosfwVO/62uvhlSVeEs8G+xwJLP6/haR3SYcCgYEA6uab
WToknmAnc3QblzhMrrhdj5eRE60Jv6MCq9P0S1MGmMTiFSnoRAjV8XnlJq+D1pcG
FjfYi6SrouSugq8VeYdBNkc8jcJFeX6xvPTYl6Eg8gDmDR3y+k46fJNHQ9ll0w2Z
A/87BpE2Cn6keAE3DIwfpZX7wkU5SQ0aDZh1f9ECgYEA1p4Eq9cySRqg2Bgu3LCy
4WavyHjktJr9my0hFjK9pFpWk4JGs4lFfEl0ad2rKpIZGoPSZNMZ0igFFsWef8o+
P9ygJYxExDSrbjaKzzUANtkx5E8PeB2eibjrPNsx5LnzIb+CX+hKi6UfYWKjCQpo
LSn2UmsBxPoTMDajbLA8rgcCgYAwoY2H64GpSD7iqCcOJ5m4knLMR5TBfhGGmzjy
We85qPa0qg4kU4jCjRG97H6Eg9HHm3ynHOi4AF+IWc/HPngzsMzPb/AZaR75CEHD
3Oz6d2FauNTn4ktrhsaVA+i9I0TxbN9A9JZDxcxqX82tCpNbBaeHoIV+stYpSY0b
Q3UQAQKBgAchxY6DLRgCJkhOUi2rmOoW9lmJdpVV0QasmizdXqw1O247qXjRgd8u
7n7Jvai1UEAQjOeYKvB+Sud9anx1IQeHclGiSNG4E1OONgIHdvCuKkJrexc/kBdX
McY3Zp4OCc07vFb6qpfhtA1y2x2MdlKzzdNNDpAUGA3ncYD51g1K
-----END RSA PRIVATE KEY-----
EOF

# Устанавливаем правильные права доступа
sudo chmod 600 /etc/ssl/certs/doirp/privkey.pem
sudo chmod 644 /etc/ssl/certs/doirp/fullchain.pem

# Запускаем контейнер с новым сертификатом
echo "🚀 Запускаем приложение с сертификатом из Yandex Cloud..."
sudo docker run -d \
    --name doirp-app \
    -p 80:80 \
    -p 443:443 \
    -v /etc/ssl/certs/doirp:/etc/ssl/certs/doirp:ro \
    --restart unless-stopped \
    doirp-app:https

# Проверяем статус
echo "✅ Проверяем статус..."
sleep 5
sudo docker ps | grep doirp-app

echo "🎉 Сертификат из Yandex Cloud обновлен!"
echo "🔒 Приложение доступно по адресу: https://158.160.200.214"
echo "✅ Теперь используется сертификат из Yandex Cloud Certificate Manager"
echo "🆔 ID сертификата: fpqt314vthq5r8tt535h"
