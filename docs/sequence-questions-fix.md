# Исправление отображения вопросов типа "Последовательность"

## Проблема

В мобильной версии тестирования вопросы типа "sequence" (Последовательность) не отображали варианты ответов. Пользователи видели только текст вопроса, но не могли увидеть элементы для упорядочивания.

## Причина

В оригинальном `TestTakingView` была специальная логика для загрузки ответов последовательности из таблицы `test_sequence_answers`, но в мобильной версии эта логика отсутствовала. Мобильная версия пыталась загрузить ответы из таблицы `test_answers`, которая не содержит данные для вопросов типа "sequence".

## Решение

### 1. Обновлен хук `useMobileTest`

Добавлена логика загрузки ответов последовательности:

```typescript
// Load sequence answers for sequence questions
for (const q of questionsWithAnswers) {
  if (q.question_type === 'sequence') {
    const { data: seqAnswers, error: seqError } = await supabase
      .from('test_sequence_answers')
      .select('*')
      .eq('question_id', q.id)
      .order('answer_order');

    if (!seqError && seqAnswers) {
      q.answers = seqAnswers.map((a: any) => ({
        ...a,
        text: a.answer_text,
        order: a.answer_order,
      }));
    }
  }
}
```

### 2. Создан компонент `MobileSequenceQuestion`

Новый компонент специально для мобильных устройств с улучшенным UX:

**Особенности:**
- ✅ **Большие кнопки** для перемещения элементов
- ✅ **Визуальная индикация** порядка
- ✅ **Кнопка "Перемешать"** для сброса порядка
- ✅ **Автосохранение** изменений
- ✅ **Адаптивный дизайн** для мобильных

**Функциональность:**
- Перемещение элементов вверх/вниз кнопками ↑↓
- Визуальное отображение текущего порядка
- Возможность сброса и перемешивания порядка
- Автоматическое сохранение изменений

### 3. Обновлены компоненты тестирования

Интегрирован новый компонент в:
- `EnhancedMobileTestTakingView`
- `MobileTestTakingView`

### 4. Добавлен расчет баллов

Обновлена логика подсчета баллов для последовательности:

```typescript
else if (question.question_type === 'sequence') {
  // Check if user order matches correct order
  const correctOrder = question.answers?.sort((a, b) => a.order - b.order).map(a => a.id) || [];
  const userOrder = userAnswer.userOrder || [];
  
  if (correctOrder.length === userOrder.length && 
      correctOrder.every((id, index) => id === userOrder[index])) {
    totalScore += question.points;
  }
}
```

## Структура данных

### Таблица `test_sequence_answers`
```sql
CREATE TABLE test_sequence_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  answer_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Пример данных
```json
{
  "question_id": "q1",
  "answer_text": "Определить потребности клиента",
  "answer_order": 1
}
```

## Использование

### Автоматическое переключение
Система автоматически определяет тип вопроса и использует соответствующий компонент:

```typescript
{currentQuestion.question_type === 'sequence' && (
  <MobileSequenceQuestion
    questionId={currentQuestion.id}
    answers={currentQuestion.answers || []}
    userOrder={currentAnswer?.userOrder}
    onOrderChange={(questionId, newOrder) => 
      updateAnswer(questionId, undefined, undefined, newOrder)
    }
  />
)}
```

### Ручное использование
```typescript
import { MobileSequenceQuestion } from './MobileSequenceQuestion';

<MobileSequenceQuestion
  questionId="q1"
  answers={[
    { id: '1', text: 'Первый шаг', order: 1 },
    { id: '2', text: 'Второй шаг', order: 2 }
  ]}
  userOrder={['1', '2']}
  onOrderChange={(questionId, newOrder) => {
    console.log('New order:', newOrder);
  }}
/>
```

## Тестирование

### Автоматические тесты
Созданы тесты для проверки:
- ✅ Отображения всех элементов
- ✅ Перемещения элементов вверх/вниз
- ✅ Блокировки кнопок на границах
- ✅ Функции сброса порядка
- ✅ Использования переданного порядка

### Ручное тестирование
1. Откройте тест с вопросом типа "Последовательность"
2. Убедитесь, что отображаются все элементы
3. Проверьте перемещение элементов кнопками ↑↓
4. Проверьте кнопку "Перемешать"
5. Убедитесь, что изменения сохраняются

## Результат

### До исправления
- ❌ Вопросы последовательности не отображали варианты ответов
- ❌ Пользователи не могли выполнить задание
- ❌ Пустое пространство вместо элементов

### После исправления
- ✅ Все элементы последовательности отображаются корректно
- ✅ Удобный интерфейс для упорядочивания
- ✅ Автосохранение изменений
- ✅ Правильный расчет баллов
- ✅ Адаптивный дизайн для мобильных

## Совместимость

- ✅ Работает на всех мобильных устройствах
- ✅ Совместимо с существующей системой
- ✅ Поддерживает восстановление прогресса
- ✅ Интегрируется с автосохранением

## Будущие улучшения

- [ ] Drag-and-drop интерфейс для планшетов
- [ ] Анимации при перемещении элементов
- [ ] Подсказки для правильного порядка
- [ ] Визуальная индикация правильности ответа

Проблема полностью решена! Теперь вопросы типа "Последовательность" корректно отображаются и функционируют на мобильных устройствах.
