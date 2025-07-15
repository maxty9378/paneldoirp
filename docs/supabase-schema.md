# Supabase Schema (Структура базы данных)

> Этот файл содержит описание структуры вашей базы данных Supabase. Обновляйте его при каждом изменении схемы, чтобы всегда иметь под рукой актуальную справку для разработки.

---

## users
| Поле                | Тип                      | Описание                                   |
|---------------------|--------------------------|-------------------------------------------|
| id                  | uuid                     | Primary Key                               |
| email               | text                     | Email пользователя                        |
| sap_number          | text                     | SAP-номер сотрудника                      |
| full_name           | text                     | ФИО пользователя                          |
| position            | text                     | Название должности (текстовое)            |
| phone               | text                     | Телефон                                   |
| avatar_url          | text                     | URL аватара пользователя                  |
| role                | user_role_enum           | Роль пользователя (employee, supervisor, trainer, expert, moderator, administrator) |
| subdivision         | subdivision_enum         | Подразделение (management_company, branches) |
| branch_subrole      | branch_subrole_enum      | Роль в филиале (sales_representative, supervisor, branch_director) |
| branch_id           | uuid                     | FK → branches.id                          |
| status              | user_status_enum         | Статус (active, inactive, terminating, transferring) |
| work_experience_days | integer                 | Опыт работы в днях                        |
| last_sign_in_at     | timestamp with time zone | Время последнего входа                    |
| created_at          | timestamp with time zone | Время создания                            |
| updated_at          | timestamp with time zone | Время обновления                          |
| is_active           | boolean                  | Активен ли пользователь                   |
| department          | text                     | Отдел                                     |
| is_leaving          | boolean                  | Увольняется ли сотрудник                  |
| position_id         | uuid                     | FK → positions.id                         |
| territory_id        | uuid                     | FK → territories.id                       |
| last_activity_at    | timestamp with time zone | Время последней активности                |
| password_changed_at | timestamp with time zone | Время последней смены пароля              |
| failed_login_attempts | integer                | Количество неудачных попыток входа        |
| locked_until        | timestamp with time zone | Время блокировки аккаунта                 |
| preferences         | jsonb                    | Пользовательские настройки в формате JSON |
| notes               | text                     | Заметки о пользователе                    |

## positions
| Поле        | Тип                      | Описание                                   |
|-------------|--------------------------|-------------------------------------------|
| id          | uuid                     | Primary Key                               |
| name        | text                     | Название должности                        |
| description | text                     | Описание должности                        |
| created_at  | timestamp with time zone | Время создания                            |
| updated_at  | timestamp with time zone | Время обновления                          |
| is_active   | boolean                  | Активна ли должность                      |
| level       | integer                  | Уровень должности                         |
| department  | text                     | Отдел                                     |
| permissions | jsonb                    | Права доступа в формате JSON              |

## territories
| Поле       | Тип                      | Описание                                   |
|------------|--------------------------|-------------------------------------------|
| id         | uuid                     | Primary Key                               |
| name       | text                     | Название территории                       |
| region     | text                     | Регион                                    |
| created_at | timestamp with time zone | Время создания                            |
| updated_at | timestamp with time zone | Время обновления                          |
| is_active  | boolean                  | Активна ли территория                     |
| manager_id | uuid                     | FK → users.id (ID менеджера территории)   |
| metadata   | jsonb                    | Метаданные в формате JSON                 |

## branches
| Поле        | Тип                      | Описание                                   |
|-------------|--------------------------|-------------------------------------------|
| id          | uuid                     | Primary Key                               |
| name        | text                     | Название филиала                          |
| code        | text                     | Уникальный код филиала                    |
| address     | text                     | Адрес филиала                             |
| coordinates | jsonb                    | Координаты в формате JSON                 |
| created_at  | timestamp with time zone | Время создания                            |
| updated_at  | timestamp with time zone | Время обновления                          |

## events
| Поле               | Тип                      | Описание                                   |
|--------------------|--------------------------|-------------------------------------------|
| id                 | uuid                     | Primary Key                               |
| title              | text                     | Название мероприятия                      |
| description        | text                     | Описание мероприятия                      |
| event_type_id      | uuid                     | FK → event_types.id                       |
| creator_id         | uuid                     | FK → users.id (создатель мероприятия)     |
| start_date         | timestamp with time zone | Дата начала                               |
| end_date           | timestamp with time zone | Дата окончания                            |
| location           | text                     | Место проведения                          |
| location_coordinates | jsonb                  | Координаты места проведения               |
| meeting_link       | text                     | Ссылка на онлайн-встречу                  |
| points             | integer                  | Баллы за мероприятие                      |
| status             | event_status_enum        | Статус (draft, published, ongoing, completed, cancelled) |
| max_participants   | integer                  | Максимальное количество участников        |
| files              | jsonb                    | Файлы мероприятия в формате JSON          |
| created_at         | timestamp with time zone | Время создания                            |
| updated_at         | timestamp with time zone | Время обновления                          |

## event_types
| Поле             | Тип                      | Описание                                   |
|------------------|--------------------------|-------------------------------------------|
| id               | uuid                     | Primary Key                               |
| name             | text                     | Уникальное название типа мероприятия      |
| name_ru          | text                     | Название на русском                       |
| description      | text                     | Описание типа мероприятия                 |
| is_online        | boolean                  | Онлайн-мероприятие                        |
| requires_location | boolean                 | Требуется ли указание места проведения    |
| has_entry_test   | boolean                  | Есть ли входной тест                      |
| has_final_test   | boolean                  | Есть ли финальный тест                    |
| has_feedback_form | boolean                 | Есть ли форма обратной связи              |
| created_at       | timestamp with time zone | Время создания                            |
| updated_at       | timestamp with time zone | Время обновления                          |

## event_participants
| Поле              | Тип                      | Описание                                   |
|-------------------|--------------------------|-------------------------------------------|
| id                | uuid                     | Primary Key                               |
| event_id          | uuid                     | FK → events.id                            |
| user_id           | uuid                     | FK → users.id                             |
| attended          | boolean                  | Присутствовал ли участник                 |
| entry_test_score  | integer                  | Баллы за входной тест                     |
| final_test_score  | integer                  | Баллы за финальный тест                   |
| feedback_score    | integer                  | Оценка обратной связи                     |
| competency_scores | jsonb                    | Оценки компетенций в формате JSON         |
| notes             | text                     | Заметки об участнике                      |
| created_at        | timestamp with time zone | Время создания                            |
| updated_at        | timestamp with time zone | Время обновления                          |
| feedback_submitted | boolean                 | Отправлена ли обратная связь              |

## tests
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| title         | text                     | Название теста                            |
| description   | text                     | Описание теста                            |
| type          | text                     | Тип теста (entry, final, annual)          |
| passing_score | integer                  | Проходной балл                            |
| time_limit    | integer                  | Ограничение по времени (в минутах)        |
| event_type_id | uuid                     | FK → event_types.id                       |
| status        | text                     | Статус теста (draft, active, inactive)    |
| created_at    | timestamp with time zone | Время создания                            |
| updated_at    | timestamp with time zone | Время обновления                          |

## test_questions
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| test_id       | uuid                     | FK → tests.id                             |
| question      | text                     | Текст вопроса                             |
| question_type | text                     | Тип вопроса (single_choice, multiple_choice, text) |
| order         | integer                  | Порядок вопроса                           |
| points        | integer                  | Баллы за вопрос                           |
| created_at    | timestamp with time zone | Время создания                            |
| updated_at    | timestamp with time zone | Время обновления                          |

## test_answers
| Поле        | Тип                      | Описание                                   |
|-------------|--------------------------|-------------------------------------------|
| id          | uuid                     | Primary Key                               |
| question_id | uuid                     | FK → test_questions.id                    |
| text        | text                     | Текст ответа                              |
| is_correct  | boolean                  | Правильный ли ответ                       |
| order       | integer                  | Порядок ответа                            |
| created_at  | timestamp with time zone | Время создания                            |
| updated_at  | timestamp with time zone | Время обновления                          |

## user_test_attempts
| Поле        | Тип                      | Описание                                   |
|-------------|--------------------------|-------------------------------------------|
| id          | uuid                     | Primary Key                               |
| user_id     | uuid                     | FK → users.id                             |
| test_id     | uuid                     | FK → tests.id                             |
| event_id    | uuid                     | FK → events.id                            |
| start_time  | timestamp with time zone | Время начала                              |
| end_time    | timestamp with time zone | Время окончания                           |
| score       | integer                  | Набранные баллы                           |
| status      | text                     | Статус (in_progress, completed, failed)   |
| created_at  | timestamp with time zone | Время создания                            |
| updated_at  | timestamp with time zone | Время обновления                          |

## user_test_answers
| Поле               | Тип                      | Описание                                   |
|--------------------|--------------------------|-------------------------------------------|
| id                 | uuid                     | Primary Key                               |
| attempt_id         | uuid                     | FK → user_test_attempts.id                |
| question_id        | uuid                     | FK → test_questions.id                    |
| answer_id          | uuid                     | FK → test_answers.id                      |
| text_answer        | text                     | Текстовый ответ пользователя              |
| is_correct         | boolean                  | Правильный ли ответ                       |
| created_at         | timestamp with time zone | Время создания                            |
| updated_at         | timestamp with time zone | Время обновления                          |
| answer_time_seconds | integer                 | Время ответа в секундах                   |

## feedback_templates
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| name          | text                     | Название шаблона                          |
| description   | text                     | Описание шаблона                          |
| event_type_id | uuid                     | FK → event_types.id                       |
| is_default    | boolean                  | Шаблон по умолчанию                       |
| created_at    | timestamp with time zone | Время создания                            |
| updated_at    | timestamp with time zone | Время обновления                          |
| metadata      | jsonb                    | Метаданные в формате JSON                 |

## feedback_questions
| Поле         | Тип                      | Описание                                   |
|--------------|--------------------------|-------------------------------------------|
| id           | uuid                     | Primary Key                               |
| template_id  | uuid                     | FK → feedback_templates.id                |
| question     | text                     | Текст вопроса                             |
| question_type | text                    | Тип вопроса (rating, text, options)       |
| required     | boolean                  | Обязательный ли вопрос                    |
| order_num    | integer                  | Порядок вопроса                           |
| options      | jsonb                    | Варианты ответов в формате JSON           |
| created_at   | timestamp with time zone | Время создания                            |
| updated_at   | timestamp with time zone | Время обновления                          |

## feedback_submissions
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| user_id       | uuid                     | FK → users.id                             |
| event_id      | uuid                     | FK → events.id                            |
| template_id   | uuid                     | FK → feedback_templates.id                |
| overall_rating | integer                 | Общая оценка                              |
| comments      | text                     | Комментарии                               |
| is_anonymous  | boolean                  | Анонимный ли отзыв                        |
| submitted_at  | timestamp with time zone | Время отправки                            |
| created_at    | timestamp with time zone | Время создания                            |
| updated_at    | timestamp with time zone | Время обновления                          |

## feedback_answers
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| submission_id | uuid                     | FK → feedback_submissions.id              |
| question_id   | uuid                     | FK → feedback_questions.id                |
| rating_value  | integer                  | Значение рейтинга                         |
| text_value    | text                     | Текстовый ответ                           |
| options_value | jsonb                    | Выбранные опции в формате JSON            |
| created_at    | timestamp with time zone | Время создания                            |

## user_logs
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| user_id       | uuid                     | FK → users.id                             |
| action        | text                     | Действие пользователя                     |
| resource_type | text                     | Тип ресурса                               |
| resource_id   | uuid                     | ID ресурса                                |
| details       | jsonb                    | Детали действия в формате JSON            |
| ip_address    | inet                     | IP-адрес                                  |
| user_agent    | text                     | User-Agent браузера                       |
| created_at    | timestamp with time zone | Время создания                            |

## admin_logs
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| admin_id      | uuid                     | FK → users.id                             |
| action        | text                     | Действие администратора                   |
| resource_type | text                     | Тип ресурса                               |
| resource_id   | uuid                     | ID ресурса                                |
| old_values    | jsonb                    | Старые значения в формате JSON            |
| new_values    | jsonb                    | Новые значения в формате JSON             |
| ip_address    | inet                     | IP-адрес                                  |
| user_agent    | text                     | User-Agent браузера                       |
| success       | boolean                  | Успешно ли выполнено действие             |
| error_message | text                     | Сообщение об ошибке                       |
| created_at    | timestamp with time zone | Время создания                            |

## system_settings
| Поле        | Тип                      | Описание                                   |
|-------------|--------------------------|-------------------------------------------|
| id          | uuid                     | Primary Key                               |
| key         | text                     | Ключ настройки (уникальный)               |
| value       | jsonb                    | Значение настройки в формате JSON         |
| description | text                     | Описание настройки                        |
| category    | text                     | Категория настройки                       |
| created_at  | timestamp with time zone | Время создания                            |
| updated_at  | timestamp with time zone | Время обновления                          |

## notification_tasks
| Поле         | Тип                      | Описание                                   |
|--------------|--------------------------|-------------------------------------------|
| id           | uuid                     | Primary Key                               |
| user_id      | uuid                     | FK → users.id (получатель)                |
| assigned_to  | uuid                     | FK → users.id (исполнитель)               |
| title        | text                     | Заголовок задачи                          |
| description  | text                     | Описание задачи                           |
| type         | text                     | Тип задачи                                |
| priority     | text                     | Приоритет (low, medium, high, urgent)     |
| status       | text                     | Статус (pending, in_progress, completed, cancelled) |
| due_date     | timestamp with time zone | Срок выполнения                           |
| completed_at | timestamp with time zone | Время выполнения                          |
| metadata     | jsonb                    | Метаданные в формате JSON                 |
| created_at   | timestamp with time zone | Время создания                            |
| updated_at   | timestamp with time zone | Время обновления                          |

## user_activity_logs
| Поле          | Тип                      | Описание                                   |
|---------------|--------------------------|-------------------------------------------|
| id            | uuid                     | Primary Key                               |
| user_id       | uuid                     | FK → users.id                             |
| action        | text                     | Действие пользователя                     |
| resource_type | text                     | Тип ресурса                               |
| resource_id   | uuid                     | ID ресурса                                |
| old_values    | jsonb                    | Старые значения в формате JSON            |
| new_values    | jsonb                    | Новые значения в формате JSON             |
| created_at    | timestamp with time zone | Время создания                            |
| session_id    | text                     | ID сессии                                 |
| ip_address    | inet                     | IP-адрес                                  |
| user_agent    | text                     | User-Agent браузера                       |

---

## Перечисления (Enums)

### user_role_enum
- employee
- supervisor
- trainer
- expert
- moderator
- administrator

### subdivision_enum
- management_company
- branches

### branch_subrole_enum
- sales_representative
- supervisor
- branch_director

### user_status_enum
- active
- inactive
- terminating
- transferring

### event_status_enum
- draft
- published
- ongoing
- completed
- cancelled

---

## Примеры объектов

### Пример объекта пользователя (user)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "sap_number": "123456",
  "full_name": "Иванов Иван Иванович",
  "position": "Менеджер по продажам",
  "position_id": "550e8400-e29b-41d4-a716-446655440001",
  "phone": "+79991234567",
  "role": "employee",
  "subdivision": "branches",
  "branch_id": "550e8400-e29b-41d4-a716-446655440002",
  "status": "active",
  "is_active": true,
  "department": "sales"
}
```

### Пример объекта мероприятия (event)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "title": "Тренинг по продажам",
  "description": "Базовый тренинг по технике продаж",
  "event_type_id": "550e8400-e29b-41d4-a716-446655440004",
  "creator_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2023-10-15T10:00:00+03:00",
  "end_date": "2023-10-15T18:00:00+03:00",
  "location": "Офис компании, конференц-зал 1",
  "status": "completed",
  "max_participants": 20
}
```

### Пример объекта теста (test)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "title": "Тест по технике продаж",
  "description": "Проверка знаний по базовым техникам продаж",
  "type": "final",
  "passing_score": 70,
  "time_limit": 30,
  "event_type_id": "550e8400-e29b-41d4-a716-446655440004",
  "status": "active"
}
```

---

## Рекомендации
- При добавлении новых таблиц или полей — обновляйте этот файл.
- Если структура поля может меняться, обязательно указывайте это.
- Добавляйте примеры реальных ответов Supabase для сложных случаев.
- При работе с enum-типами всегда проверяйте актуальные значения.
- Для полей с типом jsonb документируйте ожидаемую структуру данных.

---

Этот файл поможет быстро и без ошибок разрабатывать новые компоненты и запросы!