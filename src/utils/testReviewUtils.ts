import { supabase } from '../lib/supabase';

export interface ReviewResult {
  attemptId: string;
  score: number;
  passed: boolean;
  correctAnswers: number;
  totalAnswers: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

/**
 * Получает результаты проверки теста из test_answer_reviews
 */
export async function getTestReviewResult(attemptId: string): Promise<ReviewResult | null> {
  try {
    // Получаем все записи проверки для данной попытки
    const { data: reviews, error: reviewsError } = await supabase
      .from('test_answer_reviews')
      .select('is_correct, created_at, reviewer_id')
      .eq('attempt_id', attemptId);

    if (reviewsError) {
      console.error('Error fetching review results:', reviewsError);
      return null;
    }

    if (!reviews || reviews.length === 0) {
      return null;
    }

    // Вычисляем результаты
    const correctAnswers = reviews.filter(r => r.is_correct).length;
    const totalAnswers = reviews.length;
    const score = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    // Получаем информацию о проходном балле
    const { data: attemptData, error: attemptError } = await supabase
      .from('user_test_attempts')
      .select('test:tests(passing_score)')
      .eq('id', attemptId)
      .single();

    const passingScore = attemptData?.test?.passing_score || 70;
    const passed = score >= passingScore;

    return {
      attemptId,
      score,
      passed,
      correctAnswers,
      totalAnswers,
      reviewedBy: reviews[0]?.reviewer_id || null,
      reviewedAt: reviews[0]?.created_at || null
    };
  } catch (error) {
    console.error('Error in getTestReviewResult:', error);
    return null;
  }
}

/**
 * Проверяет, есть ли результаты проверки для попытки
 */
export async function hasReviewResult(attemptId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('test_answer_reviews')
      .select('id')
      .eq('attempt_id', attemptId)
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    console.error('Error checking review result:', error);
    return false;
  }
}
