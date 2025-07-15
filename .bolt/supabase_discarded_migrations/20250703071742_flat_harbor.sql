/*
  # Система компетенций пользователей

  1. Новые таблицы
     - `competencies` - справочник компетенций
       - `id` (uuid, primary key)
       - `name` (text, unique)
       - `description` (text)
       - `category` (text)
       - `level_criteria` (jsonb) - критерии для разных уровней
       - `created_at` (timestamptz)
       - `updated_at` (timestamptz)
       - `is_active` (boolean)
     
     - `user_competencies` - компетенции пользователей
       - `id` (uuid, primary key)
       - `user_id` (uuid, foreign key to users)
       - `competency_id` (uuid, foreign key to competencies)
       - `level` (integer) - уровень владения компетенцией (1-5)
       - `assessed_at` (timestamptz) - дата оценки
       - `assessed_by` (uuid, foreign key to users) - кто провел оценку
       - `notes` (text)
       - `evidence` (jsonb) - доказательства владения компетенцией
       - `created_at` (timestamptz)
       - `updated_at` (timestamptz)
     
     - `competency_assessments` - история оценок компетенций
       - `id` (uuid, primary key)
       - `user_competency_id` (uuid, foreign key to user_competencies)
       - `previous_level` (integer)
       - `new_level` (integer)
       - `assessment_type` (text) - тип оценки (self, manager, test, etc.)
       - `assessed_by` (uuid, foreign key to users)
       - `notes` (text)
       - `created_at` (timestamptz)
     
  2. Security
     - Enable RLS on all tables
     - Allow authenticated users to read competencies
     - Allow users with appropriate roles to manage competencies
     - Allow users to view their own competencies
     - Allow managers/trainers to view competencies of their subordinates
     - Allow administrators to view all competencies
     
  3. Functions
     - Функция для оценки компетенции пользователя с сохранением истории
     - Функция для получения общего уровня компетенций пользователя
     - Функция для поиска пользователей по компетенциям и уровню
*/

-- 1. Создаем таблицу компетенций
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  category text,
  level_criteria jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Создаем таблицу компетенций пользователей
CREATE TABLE IF NOT EXISTS user_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level BETWEEN 0 AND 5),
  assessed_at timestamptz DEFAULT now(),
  assessed_by uuid REFERENCES users(id),
  notes text,
  evidence jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, competency_id)
);

-- 3. Создаем таблицу истории оценок компетенций
CREATE TABLE IF NOT EXISTS competency_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_competency_id uuid REFERENCES user_competencies(id) ON DELETE CASCADE,
  previous_level integer CHECK (previous_level BETWEEN 0 AND 5),
  new_level integer NOT NULL CHECK (new_level BETWEEN 0 AND 5),
  assessment_type text NOT NULL,
  assessed_by uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Включаем RLS для всех таблиц
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_assessments ENABLE ROW LEVEL SECURITY;

-- 5. Создаем политики доступа

-- Компетенции могут просматривать все аутентифицированные пользователи
CREATE POLICY "Allow all users to read competencies" ON competencies
  FOR SELECT
  TO authenticated
  USING (true);

-- Управлять компетенциями могут только администраторы и модераторы
CREATE POLICY "Administrators can manage competencies" ON competencies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrator', 'moderator', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrator', 'moderator', 'trainer')
    )
  );

-- Пользователи могут видеть свои компетенции
CREATE POLICY "Users can view own competencies" ON user_competencies
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Руководители и тренеры могут видеть компетенции сотрудников в своем подразделении
CREATE POLICY "Managers can view subordinates competencies" ON user_competencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN users subordinate ON subordinate.id = user_competencies.user_id
      WHERE u.id = auth.uid()
      AND (
        -- Тренер может видеть пользователей с той же territory_id
        (u.role = 'trainer' AND u.territory_id = subordinate.territory_id)
        -- Супервайзер может видеть пользователей с той же territory_id
        OR (u.role = 'supervisor' AND u.territory_id = subordinate.territory_id)
        -- Администраторы и модераторы могут видеть всех
        OR u.role IN ('administrator', 'moderator')
      )
    )
  );

-- Руководители и тренеры могут добавлять и обновлять компетенции сотрудников
CREATE POLICY "Managers can manage subordinates competencies" ON user_competencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN users subordinate ON subordinate.id = user_competencies.user_id
      WHERE u.id = auth.uid()
      AND (
        -- Тренер может управлять пользователями с той же territory_id
        (u.role = 'trainer' AND u.territory_id = subordinate.territory_id)
        -- Супервайзер может управлять пользователями с той же territory_id
        OR (u.role = 'supervisor' AND u.territory_id = subordinate.territory_id)
        -- Администраторы и модераторы могут управлять всеми
        OR u.role IN ('administrator', 'moderator')
      )
    )
  );

CREATE POLICY "Managers can update subordinates competencies" ON user_competencies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN users subordinate ON subordinate.id = user_competencies.user_id
      WHERE u.id = auth.uid()
      AND (
        -- Тренер может управлять пользователями с той же territory_id
        (u.role = 'trainer' AND u.territory_id = subordinate.territory_id)
        -- Супервайзер может управлять пользователями с той же territory_id
        OR (u.role = 'supervisor' AND u.territory_id = subordinate.territory_id)
        -- Администраторы и модераторы могут управлять всеми
        OR u.role IN ('administrator', 'moderator')
      )
    )
  );

-- Политики для истории оценок компетенций
CREATE POLICY "Users can view own competency assessments" ON competency_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_competencies
      WHERE user_competencies.id = competency_assessments.user_competency_id
      AND user_competencies.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view subordinates competency assessments" ON competency_assessments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_competencies uc
      JOIN users subordinate ON subordinate.id = uc.user_id
      JOIN users u ON (
        (u.role = 'trainer' AND u.territory_id = subordinate.territory_id) OR
        (u.role = 'supervisor' AND u.territory_id = subordinate.territory_id) OR
        u.role IN ('administrator', 'moderator')
      )
      WHERE uc.id = competency_assessments.user_competency_id
      AND u.id = auth.uid()
    )
  );

CREATE POLICY "Administrators can manage competency assessments" ON competency_assessments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrator', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('administrator', 'moderator')
    )
  );

-- 6. Создаем триггеры для обновления updated_at

-- Триггер для обновления updated_at в competencies
CREATE TRIGGER update_competencies_updated_at
  BEFORE UPDATE ON competencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Триггер для обновления updated_at в user_competencies
CREATE TRIGGER update_user_competencies_updated_at
  BEFORE UPDATE ON user_competencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Создаем функцию для оценки компетенции пользователя
CREATE OR REPLACE FUNCTION assess_user_competency(
  p_user_id uuid,
  p_competency_id uuid,
  p_level integer,
  p_assessment_type text,
  p_notes text DEFAULT NULL,
  p_evidence jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_competency_id uuid;
  v_previous_level integer;
  v_assessment_id uuid;
  v_result jsonb;
BEGIN
  -- Проверка прав доступа
  IF NOT EXISTS (
    SELECT 1 FROM users u
    JOIN users target ON true
    WHERE u.id = auth.uid()
    AND target.id = p_user_id
    AND (
      -- Собственные компетенции (самооценка)
      u.id = target.id
      -- Тренер может оценивать пользователей с той же territory_id
      OR (u.role = 'trainer' AND u.territory_id = target.territory_id)
      -- Супервайзер может оценивать пользователей с той же territory_id
      OR (u.role = 'supervisor' AND u.territory_id = target.territory_id)
      -- Администраторы и модераторы могут оценивать всех
      OR u.role IN ('administrator', 'moderator')
    )
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions to assess this user'
    );
  END IF;
  
  -- Проверка существования пользователя
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found'
    );
  END IF;
  
  -- Проверка существования компетенции
  IF NOT EXISTS (
    SELECT 1 FROM competencies WHERE id = p_competency_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Competency not found'
    );
  END IF;
  
  -- Проверка уровня компетенции
  IF p_level < 0 OR p_level > 5 THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Level must be between 0 and 5'
    );
  END IF;
  
  -- Проверяем, существует ли уже оценка для данной компетенции
  SELECT id, level INTO v_user_competency_id, v_previous_level
  FROM user_competencies
  WHERE user_id = p_user_id AND competency_id = p_competency_id;
  
  IF v_user_competency_id IS NULL THEN
    -- Создаем новую оценку компетенции
    INSERT INTO user_competencies (
      user_id,
      competency_id,
      level,
      assessed_at,
      assessed_by,
      notes,
      evidence
    ) VALUES (
      p_user_id,
      p_competency_id,
      p_level,
      NOW(),
      auth.uid(),
      p_notes,
      COALESCE(p_evidence, '[]')
    ) RETURNING id INTO v_user_competency_id;
    
    v_previous_level := NULL; -- Новая компетенция, предыдущего уровня нет
  ELSE
    -- Обновляем существующую оценку компетенции
    UPDATE user_competencies SET
      level = p_level,
      assessed_at = NOW(),
      assessed_by = auth.uid(),
      notes = COALESCE(p_notes, notes),
      evidence = CASE 
        WHEN p_evidence IS NOT NULL THEN p_evidence
        ELSE evidence
      END,
      updated_at = NOW()
    WHERE id = v_user_competency_id;
  END IF;
  
  -- Записываем историю оценки
  INSERT INTO competency_assessments (
    user_competency_id,
    previous_level,
    new_level,
    assessment_type,
    assessed_by,
    notes
  ) VALUES (
    v_user_competency_id,
    v_previous_level,
    p_level,
    p_assessment_type,
    auth.uid(),
    p_notes
  ) RETURNING id INTO v_assessment_id;
  
  -- Логируем действие
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    auth.uid(),
    'assess_user_competency',
    'user_competencies',
    v_user_competency_id,
    jsonb_build_object('previous_level', v_previous_level),
    jsonb_build_object(
      'user_id', p_user_id,
      'competency_id', p_competency_id,
      'level', p_level,
      'assessment_type', p_assessment_type
    )
  );
  
  -- Формируем результат
  RETURN jsonb_build_object(
    'status', 'success',
    'user_competency_id', v_user_competency_id,
    'assessment_id', v_assessment_id,
    'previous_level', v_previous_level,
    'new_level', p_level,
    'message', 'Competency assessment completed successfully'
  );
END;
$$;

-- 8. Функция для получения общего уровня компетенций пользователя
CREATE OR REPLACE FUNCTION get_user_competency_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_total_competencies int;
  v_assessed_competencies int;
  v_average_level numeric;
  v_competency_levels jsonb;
BEGIN
  -- Проверка прав доступа
  IF NOT EXISTS (
    SELECT 1 FROM users u
    JOIN users target ON true
    WHERE u.id = auth.uid()
    AND target.id = p_user_id
    AND (
      -- Собственные компетенции
      u.id = target.id
      -- Тренер может видеть пользователей с той же territory_id
      OR (u.role = 'trainer' AND u.territory_id = target.territory_id)
      -- Супервайзер может видеть пользователей с той же territory_id
      OR (u.role = 'supervisor' AND u.territory_id = target.territory_id)
      -- Администраторы и модераторы могут видеть всех
      OR u.role IN ('administrator', 'moderator')
    )
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions to view this user competencies'
    );
  END IF;
  
  -- Проверка существования пользователя
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found'
    );
  END IF;
  
  -- Получаем количество всех активных компетенций
  SELECT COUNT(*) INTO v_total_competencies
  FROM competencies
  WHERE is_active = true;
  
  -- Получаем количество оцененных компетенций
  SELECT COUNT(*) INTO v_assessed_competencies
  FROM user_competencies uc
  JOIN competencies c ON c.id = uc.competency_id
  WHERE uc.user_id = p_user_id AND c.is_active = true;
  
  -- Получаем средний уровень компетенций
  SELECT COALESCE(AVG(uc.level), 0) INTO v_average_level
  FROM user_competencies uc
  JOIN competencies c ON c.id = uc.competency_id
  WHERE uc.user_id = p_user_id AND c.is_active = true;
  
  -- Получаем распределение по уровням
  WITH level_counts AS (
    SELECT 
      uc.level,
      COUNT(*) as count
    FROM user_competencies uc
    JOIN competencies c ON c.id = uc.competency_id
    WHERE uc.user_id = p_user_id AND c.is_active = true
    GROUP BY uc.level
  )
  SELECT 
    jsonb_object_agg(level, count) INTO v_competency_levels
  FROM level_counts;
  
  IF v_competency_levels IS NULL THEN
    v_competency_levels := '{}'::jsonb;
  END IF;
  
  -- Формируем результат
  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', p_user_id,
    'total_competencies', v_total_competencies,
    'assessed_competencies', v_assessed_competencies,
    'completion_percentage', 
      CASE 
        WHEN v_total_competencies = 0 THEN 0 
        ELSE (v_assessed_competencies::numeric / v_total_competencies) * 100 
      END,
    'average_level', v_average_level,
    'level_distribution', v_competency_levels
  );
END;
$$;

-- 9. Функция для поиска пользователей по компетенциям
CREATE OR REPLACE FUNCTION find_users_by_competencies(
  p_competency_ids uuid[],
  p_min_level integer DEFAULT 1
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_user record;
  v_competency_count integer := array_length(p_competency_ids, 1);
  v_current_user_role text;
  v_current_user_territory_id uuid;
BEGIN
  -- Проверяем входные параметры
  IF p_competency_ids IS NULL OR array_length(p_competency_ids, 1) = 0 THEN
    RETURN;
  END IF;
  
  IF p_min_level < 0 OR p_min_level > 5 THEN
    RAISE EXCEPTION 'Minimum level must be between 0 and 5';
  END IF;
  
  -- Получаем роль и territory_id текущего пользователя для фильтрации результатов
  SELECT role, territory_id INTO v_current_user_role, v_current_user_territory_id
  FROM users
  WHERE id = auth.uid();
  
  -- Получаем пользователей, у которых есть все указанные компетенции с уровнем не ниже минимального
  FOR v_user IN
    WITH user_competency_matches AS (
      SELECT
        uc.user_id,
        COUNT(*) as matched_competencies
      FROM user_competencies uc
      WHERE 
        uc.competency_id = ANY(p_competency_ids)
        AND uc.level >= p_min_level
      GROUP BY uc.user_id
      HAVING COUNT(*) = v_competency_count
    )
    SELECT 
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.territory_id,
      (
        SELECT jsonb_agg(jsonb_build_object(
          'competency_id', uc.competency_id,
          'level', uc.level,
          'name', c.name,
          'category', c.category,
          'assessed_at', uc.assessed_at
        ))
        FROM user_competencies uc
        JOIN competencies c ON c.id = uc.competency_id
        WHERE 
          uc.user_id = u.id
          AND uc.competency_id = ANY(p_competency_ids)
      ) as competencies
    FROM users u
    JOIN user_competency_matches ucm ON ucm.user_id = u.id
    WHERE
      -- Фильтрация на основе прав доступа текущего пользователя
      CASE
        -- Администраторы и модераторы могут видеть всех
        WHEN v_current_user_role IN ('administrator', 'moderator') THEN true
        -- Тренеры и супервайзеры могут видеть только пользователей в своей территории
        WHEN v_current_user_role IN ('trainer', 'supervisor') THEN 
          u.territory_id = v_current_user_territory_id
        -- Обычные пользователи видят только себя
        ELSE u.id = auth.uid()
      END
  LOOP
    v_result := jsonb_build_object(
      'user_id', v_user.id,
      'full_name', v_user.full_name,
      'email', v_user.email,
      'role', v_user.role,
      'territory_id', v_user.territory_id,
      'competencies', v_user.competencies
    );
    
    RETURN NEXT v_result;
  END LOOP;
  
  RETURN;
END;
$$;

-- 10. Функция для получения рекомендаций по развитию компетенций
CREATE OR REPLACE FUNCTION get_competency_development_suggestions(
  p_user_id uuid,
  p_target_role text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
  v_result jsonb;
  v_missing_competencies jsonb;
  v_low_competencies jsonb;
  v_needed_competencies jsonb;
BEGIN
  -- Проверка прав доступа
  IF NOT EXISTS (
    SELECT 1 FROM users u
    JOIN users target ON true
    WHERE u.id = auth.uid()
    AND target.id = p_user_id
    AND (
      -- Собственные компетенции
      u.id = target.id
      -- Тренер может видеть пользователей с той же territory_id
      OR (u.role = 'trainer' AND u.territory_id = target.territory_id)
      -- Супервайзер может видеть пользователей с той же territory_id
      OR (u.role = 'supervisor' AND u.territory_id = target.territory_id)
      -- Администраторы и модераторы могут видеть всех
      OR u.role IN ('administrator', 'moderator')
    )
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions to view this user competencies'
    );
  END IF;
  
  -- Получаем роль пользователя
  SELECT role INTO v_user_role
  FROM users
  WHERE id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'User not found'
    );
  END IF;
  
  -- Если не указана целевая роль, используем текущую роль пользователя
  IF p_target_role IS NULL THEN
    p_target_role := v_user_role;
  END IF;
  
  -- Находим компетенции, которых нет у пользователя
  WITH role_competencies AS (
    -- Здесь можно было бы создать таблицу role_competencies для хранения необходимых компетенций для разных ролей
    -- Пока просто используем все активные компетенции
    SELECT id, name, category
    FROM competencies
    WHERE is_active = true
  ),
  user_competencies AS (
    SELECT competency_id, level
    FROM user_competencies
    WHERE user_id = p_user_id
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', rc.id,
        'name', rc.name,
        'category', rc.category,
        'status', 'missing'
      )
    ) INTO v_missing_competencies
  FROM role_competencies rc
  LEFT JOIN user_competencies uc ON uc.competency_id = rc.id
  WHERE uc.competency_id IS NULL;
  
  -- Находим компетенции с низким уровнем (ниже 3)
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'category', c.category,
        'current_level', uc.level,
        'target_level', 3,
        'status', 'low'
      )
    ) INTO v_low_competencies
  FROM user_competencies uc
  JOIN competencies c ON c.id = uc.competency_id
  WHERE 
    uc.user_id = p_user_id
    AND uc.level < 3
    AND c.is_active = true;
  
  -- Объединяем результаты
  v_needed_competencies := coalesce(v_missing_competencies, '[]'::jsonb) || coalesce(v_low_competencies, '[]'::jsonb);
  
  -- Формируем результат
  RETURN jsonb_build_object(
    'status', 'success',
    'user_id', p_user_id,
    'user_role', v_user_role,
    'target_role', p_target_role,
    'development_suggestions', v_needed_competencies,
    'missing_count', jsonb_array_length(coalesce(v_missing_competencies, '[]'::jsonb)),
    'low_level_count', jsonb_array_length(coalesce(v_low_competencies, '[]'::jsonb))
  );
END;
$$;

-- 11. Даем права на выполнение функций
GRANT EXECUTE ON FUNCTION assess_user_competency TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_competency_summary TO authenticated;
GRANT EXECUTE ON FUNCTION find_users_by_competencies TO authenticated;
GRANT EXECUTE ON FUNCTION get_competency_development_suggestions TO authenticated;

-- 12. Создаем индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS user_competencies_user_id_idx ON user_competencies(user_id);
CREATE INDEX IF NOT EXISTS user_competencies_competency_id_idx ON user_competencies(competency_id);
CREATE INDEX IF NOT EXISTS user_competencies_level_idx ON user_competencies(level);
CREATE INDEX IF NOT EXISTS competency_assessments_user_competency_id_idx ON competency_assessments(user_competency_id);
CREATE INDEX IF NOT EXISTS competencies_category_idx ON competencies(category);
CREATE INDEX IF NOT EXISTS competencies_is_active_idx ON competencies(is_active);

-- 13. Добавляем несколько базовых компетенций
INSERT INTO competencies (name, description, category, level_criteria, is_active)
VALUES
  ('Продажи', 'Навыки продаж и работы с клиентами', 'hard_skills', jsonb_build_object(
    '1', 'Базовое понимание процесса продаж',
    '2', 'Умеет применять основные техники продаж',
    '3', 'Самостоятельно проводит продажи и достигает плановых показателей',
    '4', 'Превышает плановые показатели, успешно работает со сложными клиентами',
    '5', 'Эксперт в области продаж, может обучать других'
  ), true),
  
  ('Обслуживание клиентов', 'Навыки качественного обслуживания клиентов', 'hard_skills', jsonb_build_object(
    '1', 'Знает базовые принципы обслуживания клиентов',
    '2', 'Способен самостоятельно обслуживать клиентов в стандартных ситуациях',
    '3', 'Успешно решает сложные случаи и конфликтные ситуации',
    '4', 'Отлично справляется с любыми клиентскими запросами, получает положительные отзывы',
    '5', 'Эксперт в области клиентского сервиса, может обучать других'
  ), true),
  
  ('Продуктовые знания', 'Знание ассортимента и характеристик продуктов', 'knowledge', jsonb_build_object(
    '1', 'Базовое понимание ассортимента продукции',
    '2', 'Знает характеристики основных продуктов',
    '3', 'Хорошо ориентируется во всем ассортименте и может давать рекомендации',
    '4', 'Отлично знает все продукты, их особенности и преимущества',
    '5', 'Эксперт по продукции, может проводить обучение по продуктам'
  ), true),
  
  ('Коммуникация', 'Навыки эффективной коммуникации', 'soft_skills', jsonb_build_object(
    '1', 'Базовые коммуникативные навыки',
    '2', 'Умеет ясно выражать мысли и активно слушать',
    '3', 'Эффективно коммуницирует в различных ситуациях',
    '4', 'Отлично справляется со сложными коммуникациями и переговорами',
    '5', 'Экспертный уровень коммуникации, может обучать других'
  ), true),
  
  ('Работа в команде', 'Навыки эффективной работы в команде', 'soft_skills', jsonb_build_object(
    '1', 'Понимает принципы командной работы',
    '2', 'Умеет сотрудничать с коллегами',
    '3', 'Активно содействует достижению командных целей',
    '4', 'Вносит значительный вклад в командную работу, помогает другим',
    '5', 'Лидер команды, эффективно организует и мотивирует других'
  ), true);

-- 14. Добавляем представление для удобного просмотра компетенций пользователей
CREATE OR REPLACE VIEW user_competency_view AS
SELECT
  uc.id,
  u.id as user_id,
  u.full_name,
  u.email,
  u.role,
  c.id as competency_id,
  c.name as competency_name,
  c.category,
  uc.level,
  uc.assessed_at,
  assessor.full_name as assessed_by_name,
  uc.notes
FROM
  user_competencies uc
JOIN
  users u ON u.id = uc.user_id
JOIN
  competencies c ON c.id = uc.competency_id
LEFT JOIN
  users assessor ON assessor.id = uc.assessed_by
WHERE
  c.is_active = true;

-- Даем права на представление
GRANT SELECT ON user_competency_view TO authenticated;

-- 15. Добавляем связь между мероприятиями и компетенциями
CREATE TABLE IF NOT EXISTS event_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE,
  target_level integer NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, competency_id)
);

-- Включаем RLS
ALTER TABLE event_competencies ENABLE ROW LEVEL SECURITY;

-- Создаем политику доступа
CREATE POLICY "Allow all users to read event competencies" ON event_competencies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Event creators can manage event competencies" ON event_competencies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_competencies.event_id
      AND (
        events.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_competencies.event_id
      AND (
        events.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
        )
      )
    )
  );

-- 16. Функция для автоматического обновления компетенций после мероприятия
CREATE OR REPLACE FUNCTION update_competencies_after_event(
  p_event_id uuid,
  p_auto_update boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_updates_count integer := 0;
  v_errors_count integer := 0;
  v_event_record record;
  v_competency_record record;
  v_participant_record record;
BEGIN
  -- Проверка прав доступа
  IF NOT EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = p_event_id
    AND (
      e.creator_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('trainer', 'expert', 'moderator', 'administrator')
      )
    )
  ) THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Insufficient permissions to update competencies for this event'
    );
  END IF;

  -- Проверяем, что мероприятие завершено
  SELECT status, title INTO v_event_record
  FROM events
  WHERE id = p_event_id;
  
  IF v_event_record.status != 'completed' AND NOT p_auto_update THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Event is not completed yet'
    );
  END IF;

  -- Обновляем компетенции участников
  FOR v_competency_record IN
    SELECT ec.competency_id, ec.target_level, c.name
    FROM event_competencies ec
    JOIN competencies c ON c.id = ec.competency_id
    WHERE ec.event_id = p_event_id
  LOOP
    -- Для каждого участника мероприятия
    FOR v_participant_record IN
      SELECT ep.user_id
      FROM event_participants ep
      WHERE ep.event_id = p_event_id
      AND ep.attended = true
    LOOP
      BEGIN
        -- Проверяем текущий уровень компетенции пользователя
        DECLARE
          v_current_level integer;
        BEGIN
          SELECT level INTO v_current_level
          FROM user_competencies
          WHERE user_id = v_participant_record.user_id
          AND competency_id = v_competency_record.competency_id;
          
          -- Обновляем компетенцию, только если новый уровень выше текущего
          -- или если у пользователя еще нет оценки по этой компетенции
          IF v_current_level IS NULL OR v_current_level < v_competency_record.target_level THEN
            -- Вызываем функцию оценки компетенции
            PERFORM assess_user_competency(
              v_participant_record.user_id,
              v_competency_record.competency_id,
              v_competency_record.target_level,
              'event_completion',
              'Автоматическое обновление после завершения мероприятия: ' || v_event_record.title
            );
            
            v_updates_count := v_updates_count + 1;
          END IF;
        END;
      EXCEPTION WHEN OTHERS THEN
        v_errors_count := v_errors_count + 1;
        
        -- Логируем ошибку
        INSERT INTO admin_logs (
          admin_id,
          action,
          resource_type,
          resource_id,
          error_message,
          success
        ) VALUES (
          auth.uid(),
          'update_competencies_after_event_error',
          'user_competencies',
          v_participant_record.user_id,
          SQLERRM,
          false
        );
      END;
    END LOOP;
  END LOOP;
  
  -- Логируем успешное обновление
  INSERT INTO admin_logs (
    admin_id,
    action,
    resource_type,
    resource_id,
    new_values
  ) VALUES (
    auth.uid(),
    'update_competencies_after_event',
    'events',
    p_event_id,
    jsonb_build_object(
      'updates_count', v_updates_count,
      'errors_count', v_errors_count
    )
  );
  
  -- Формируем результат
  RETURN jsonb_build_object(
    'status', 'success',
    'event_id', p_event_id,
    'updates_count', v_updates_count,
    'errors_count', v_errors_count,
    'message', 'Competencies updated successfully'
  );
END;
$$;

-- 17. Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION update_competencies_after_event TO authenticated;

-- 18. Создаем триггер для автоматического обновления компетенций при завершении мероприятия
CREATE OR REPLACE FUNCTION on_event_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Если статус изменился на "completed"
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Проверяем, есть ли связанные компетенции для этого мероприятия
    IF EXISTS (
      SELECT 1 FROM event_competencies 
      WHERE event_id = NEW.id
    ) THEN
      -- Обновляем компетенции участников
      PERFORM update_competencies_after_event(NEW.id, true);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 19. Создаем триггер на таблице events
DROP TRIGGER IF EXISTS on_event_status_change ON events;
CREATE TRIGGER on_event_status_change
  AFTER UPDATE OF status ON events
  FOR EACH ROW
  EXECUTE FUNCTION on_event_status_change();

-- 20. Добавляем представление для отчета по компетенциям
CREATE OR REPLACE VIEW competency_report AS
SELECT
  t.id AS territory_id,
  t.name AS territory_name,
  c.id AS competency_id,
  c.name AS competency_name,
  c.category,
  COUNT(uc.id) AS assessed_users_count,
  COALESCE(AVG(uc.level), 0) AS average_level,
  SUM(CASE WHEN uc.level >= 4 THEN 1 ELSE 0 END) AS expert_count,
  SUM(CASE WHEN uc.level <= 2 THEN 1 ELSE 0 END) AS beginner_count,
  COUNT(DISTINCT u.id) AS total_users,
  EXTRACT(MONTH FROM current_date) AS report_month,
  EXTRACT(YEAR FROM current_date) AS report_year
FROM
  territories t
CROSS JOIN
  competencies c
LEFT JOIN
  users u ON u.territory_id = t.id AND u.is_active = true
LEFT JOIN
  user_competencies uc ON uc.user_id = u.id AND uc.competency_id = c.id
WHERE
  c.is_active = true
GROUP BY
  t.id, t.name, c.id, c.name, c.category;

-- Даем права на представление
GRANT SELECT ON competency_report TO authenticated;

-- 21. Добавляем комментарии к таблицам и колонкам
COMMENT ON TABLE competencies IS 'Справочник компетенций для оценки сотрудников';
COMMENT ON COLUMN competencies.name IS 'Название компетенции';
COMMENT ON COLUMN competencies.level_criteria IS 'Описания уровней компетенции от 1 до 5';

COMMENT ON TABLE user_competencies IS 'Оценки компетенций пользователей';
COMMENT ON COLUMN user_competencies.level IS 'Уровень владения компетенцией от 0 до 5';
COMMENT ON COLUMN user_competencies.evidence IS 'JSON-массив с доказательствами владения компетенцией (сертификаты, результаты тестов и т.д.)';

COMMENT ON TABLE competency_assessments IS 'История оценок компетенций пользователей';
COMMENT ON COLUMN competency_assessments.assessment_type IS 'Тип оценки: self (самооценка), manager (оценка руководителя), test (по результатам теста), event_completion (после мероприятия)';

COMMENT ON TABLE event_competencies IS 'Связь между мероприятиями и развиваемыми компетенциями';
COMMENT ON COLUMN event_competencies.target_level IS 'Целевой уровень компетенции, который можно достичь после мероприятия';