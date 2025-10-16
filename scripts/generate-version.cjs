const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Получаем короткий хэш последнего коммита
  const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
  
  // Получаем дату последнего коммита
  const gitDate = execSync('git log -1 --format=%cd --date=format:"%Y-%m-%d %H:%M"').toString().trim();
  
  // Получаем текущую дату сборки
  const buildDate = new Date().toISOString();
  
  // Формируем версию
  const version = `${gitHash}`;
  const fullVersion = `Build ${gitHash} (${gitDate})`;
  
  // Создаем .env.production.local для переопределения переменных
  const envContent = `VITE_APP_VERSION=${version}
VITE_BUILD_TIMESTAMP=${buildDate}
VITE_GIT_HASH=${gitHash}
VITE_GIT_DATE=${gitDate}
VITE_FULL_VERSION=${fullVersion}
`;

  const envPath = path.join(__dirname, '..', '.env.production.local');
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Version info generated:');
  console.log(`   Version: ${version}`);
  console.log(`   Full: ${fullVersion}`);
  console.log(`   Build: ${buildDate}`);
  
} catch (error) {
  console.warn('⚠️ Could not generate version from git, using defaults');
  console.warn('   Error:', error.message);
  
  // Fallback версия
  const fallbackContent = `VITE_APP_VERSION=dev
VITE_BUILD_TIMESTAMP=${new Date().toISOString()}
VITE_GIT_HASH=unknown
VITE_GIT_DATE=unknown
VITE_FULL_VERSION=Development build
`;
  
  const envPath = path.join(__dirname, '..', '.env.production.local');
  fs.writeFileSync(envPath, fallbackContent);
}

