export function getDeclension(count: number, forms: [string, string, string]): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  
  if (n > 10 && n < 20) {
    return forms[2];
  }
  if (n1 > 1 && n1 < 5) {
    return forms[1];
  }
  if (n1 === 1) {
    return forms[0];
  }
  return forms[2];
}

export function formatExperienceWithDeclension(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  
  if (years > 0) {
    const yearText = getDeclension(years, ['год', 'года', 'лет']);
    if (months > 0) {
      const monthText = getDeclension(months, ['месяц', 'месяца', 'месяцев']);
      return `${years} ${yearText} ${months} ${monthText}`;
    }
    return `${years} ${yearText}`;
  }
  
  if (months > 0) {
    const monthText = getDeclension(months, ['месяц', 'месяца', 'месяцев']);
    return `${months} ${monthText}`;
  }
  
  const dayText = getDeclension(days, ['день', 'дня', 'дней']);
  return `${days} ${dayText}`;
}

export function formatExperienceDays(days: number | undefined): string {
  if (!days || days === 0) return 'Новичок';
  
  if (days < 30) return `${days} дн.`;
  
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} мес.`;
    return `${months} мес. ${remainingDays} дн.`;
  }
  
  const years = Math.floor(days / 365);
  const remainingDays = days % 365;
  const months = Math.floor(remainingDays / 30);
  const finalDays = remainingDays % 30;
  
  let result = `${years} г.`;
  if (months > 0) result += ` ${months} мес.`;
  if (finalDays > 0) result += ` ${finalDays} дн.`;
  
  return result;
}