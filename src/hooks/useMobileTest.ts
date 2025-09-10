import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Test {
  id: string;
  title: string;
  description?: string;
  type: string;
  passing_score: number;
  time_limit: number;
}

interface Question {
  id: string;
  question: string;
  question_type: string;
  points: number;
  order: number;
  answers?: Answer[];
  correct_order?: string[];
}

interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

interface UserAnswer {
  questionId: string;
  answerId?: string;
  textAnswer?: string;
  marked: boolean;
  userOrder?: (string | number)[];
}

interface TestAttempt {
  id: string;
  test_id: string;
  user_id: string;
  event_id: string;
  started_at: string;
  completed_at?: string;
  score?: number;
  max_score?: number;
  passed?: boolean;
  current_question_index?: number;
}

export const useMobileTest = (testId: string, eventId: string, attemptId: string) => {
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingProgress, setHasExistingProgress] = useState(false);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load test data
  const loadTestData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load test info
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) throw testError;
      setTest(testData);

      // Load questions with answers
      const { data: questionsData, error: questionsError } = await supabase
        .from('test_questions')
        .select(`
          *,
          test_answers (*)
        `)
        .eq('test_id', testId)
        .order('order');

      if (questionsError) throw questionsError;

      // Format questions with answers
      const questionsWithAnswers = (questionsData || []).map((q: any) => ({
        ...q,
        answers: q.test_answers?.sort((a: any, b: any) => a.order - b.order) || [],
        correct_order: q.correct_order,
      }));

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

      const formattedQuestions = questionsWithAnswers;

      setQuestions(formattedQuestions);

      // Load attempt data
      const { data: attemptData, error: attemptError } = await supabase
        .from('user_test_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError) {
        console.error('Error loading attempt:', attemptError);
        throw attemptError;
      }
      console.log('Loaded attempt data:', attemptData);
      console.log('Current question index from DB:', attemptData?.current_question_index);
      setAttempt(attemptData);

      // Load existing answers
      const { data: answersData, error: answersError } = await supabase
        .from('user_test_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      if (answersError) throw answersError;

      if (answersData && answersData.length > 0) {
        const existingAnswers = answersData.map(ua => ({
          questionId: ua.question_id,
          answerId: ua.answer_id,
          textAnswer: ua.text_answer,
          marked: ua.marked || false,
          userOrder: ua.user_order || undefined
        }));
        setUserAnswers(existingAnswers);
        setHasExistingProgress(true);
      } else {
        // Initialize user answers for sequence questions
        const initialUserAnswers: UserAnswer[] = formattedQuestions.map((q: any) => {
          if (q.question_type === 'sequence') {
            const shuffled = (q.answers || [])
              .map((a: any) => String(a.id))
              .sort(() => Math.random() - 0.5);
            return {
              questionId: q.id,
              marked: false,
              userOrder: shuffled,
              textAnswer: '',
              answerId: '',
            };
          }
          return {
            questionId: q.id,
            marked: false,
            textAnswer: '',
            answerId: '',
          };
        });
        setUserAnswers(initialUserAnswers);
      }

      // Initialize current question index from attempt data
      console.log('Setting initial question index:', attemptData?.current_question_index);
      if (attemptData?.current_question_index !== undefined && attemptData?.current_question_index !== null) {
        setCurrentQuestionIndex(attemptData.current_question_index);
      } else {
        setCurrentQuestionIndex(0);
      }

      // Calculate time remaining
      if (testData.time_limit > 0 && !attemptData.completed_at && attemptData.started_at) {
        const startTime = new Date(attemptData.started_at).getTime();
        if (!isNaN(startTime)) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, testData.time_limit * 60 - elapsed);
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(testData.time_limit * 60);
        }
      } else if (testData.time_limit > 0) {
        setTimeRemaining(testData.time_limit * 60);
      }

    } catch (err) {
      console.error('Error loading test data:', err);
      setError('Ошибка загрузки теста');
    } finally {
      setLoading(false);
    }
  }, [testId, attemptId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining]);

  // Auto-save answers
  const saveAnswer = useCallback(async (answer: UserAnswer) => {
    try {
      const { error } = await supabase
        .from('user_test_answers')
        .upsert({
          attempt_id: attemptId,
          question_id: answer.questionId,
          answer_id: answer.answerId,
          text_answer: answer.textAnswer,
          marked: answer.marked,
          user_order: answer.userOrder || null
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error saving answer:', err);
    }
  }, [attemptId]);

  // Update answer
  const updateAnswer = useCallback((questionId: string, answerId?: string, textAnswer?: string, userOrder?: (string | number)[]) => {
    const newAnswer: UserAnswer = {
      questionId,
      answerId,
      textAnswer,
      userOrder,
      marked: true
    };

    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      const updated = existing 
        ? prev.map(a => a.questionId === questionId ? { ...a, ...newAnswer } : a)
        : [...prev, newAnswer];
      
      // Auto-save
      saveAnswer(newAnswer);
      
      return updated;
    });
  }, [saveAnswer]);

  // Mark question
  const markQuestion = useCallback((questionId: string) => {
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      const updated = existing 
        ? prev.map(a => a.questionId === questionId ? { ...a, marked: !a.marked } : a)
        : [...prev, { questionId, marked: true }];
      
      // Auto-save
      if (existing) {
        saveAnswer({ ...existing, marked: !existing.marked });
      } else {
        saveAnswer({ questionId, marked: true });
      }
      
      return updated;
    });
  }, [saveAnswer]);

  // Save current question position
  const saveCurrentPosition = useCallback(async (questionIndex: number) => {
    try {
      console.log('Saving position:', questionIndex, 'for attempt:', attemptId);
      const { error } = await supabase
        .from('user_test_attempts')
        .update({ current_question_index: questionIndex })
        .eq('id', attemptId);

      if (error) {
        console.error('Error saving position:', error);
        throw error;
      }
      console.log('Position saved successfully');
    } catch (err) {
      console.error('Error saving current position:', err);
    }
  }, [attemptId]);

  // Submit test
  const submitTest = useCallback(async () => {
    try {
      // Check if test has open-ended questions (text type)
      const hasOpenEndedQuestions = questions.some(q => q.question_type === 'text');
      
      // Calculate score
      let totalScore = 0;
      let maxScore = 0;

      for (const question of questions) {
        maxScore += question.points;
        const userAnswer = userAnswers.find(a => a.questionId === question.id);
        
        if (!userAnswer) continue;

        if (question.question_type === 'single_choice') {
          const correctAnswer = question.answers?.find(a => a.is_correct);
          if (userAnswer.answerId === correctAnswer?.id) {
            totalScore += question.points;
          }
        } else if (question.question_type === 'multiple_choice') {
          const correctAnswers = question.answers?.filter(a => a.is_correct) || [];
          const userSelectedAnswers = question.answers?.filter(a => 
            correctAnswers.some(ca => ca.id === a.id) && a.id === userAnswer.answerId
          ) || [];
          
          if (userSelectedAnswers.length === correctAnswers.length) {
            totalScore += question.points;
          }
        } else if (question.question_type === 'sequence') {
          // Check if user order matches correct order
          const correctOrder = question.answers?.sort((a, b) => a.order - b.order).map(a => a.id) || [];
          const userOrder = userAnswer.userOrder || [];
          
          if (correctOrder.length === userOrder.length && 
              correctOrder.every((id, index) => id === userOrder[index])) {
            totalScore += question.points;
          }
        }
        // For text questions, we don't calculate score automatically - they need manual review
      }

      // Determine status based on question types
      const status = hasOpenEndedQuestions ? 'pending_review' : 'completed';
      
      // Update attempt
      console.log('Updating attempt status:', { attemptId, status, totalScore, maxScore, hasOpenEndedQuestions });
      const { error: updateError } = await supabase
        .from('user_test_attempts')
        .update({
          status: status,
          completed_at: new Date().toISOString(),
          score: hasOpenEndedQuestions ? 0 : totalScore, // Set score to 0 for pending review
          max_score: maxScore,
          passed: hasOpenEndedQuestions ? false : totalScore >= (test?.passing_score || 0)
        })
        .eq('id', attemptId);

      if (updateError) {
        console.error('Error updating attempt:', updateError);
        throw updateError;
      }

      console.log('Attempt updated successfully');
      return { score: totalScore, maxScore, passed: totalScore >= (test?.passing_score || 0) };

    } catch (err) {
      console.error('Error submitting test:', err);
      throw new Error('Ошибка отправки теста');
    }
  }, [questions, userAnswers, test, attemptId]);

  // Get question progress
  const getQuestionProgress = useCallback(() => {
    return questions.map((question, index) => {
      const answer = userAnswers.find(a => a.questionId === question.id);
      return {
        index,
        questionId: question.id,
        answered: !!(answer?.answerId || answer?.textAnswer || answer?.userOrder),
        marked: answer?.marked || false
      };
    });
  }, [questions, userAnswers]);

  // Get current answer
  const getCurrentAnswer = useCallback((questionId: string) => {
    if (!questionId) {
      console.log('No questionId provided to getCurrentAnswer');
      return undefined;
    }
    const answer = userAnswers.find(a => a.questionId === questionId);
    if (!answer) {
      console.log('No answer found for question:', questionId, 'Total answers:', userAnswers.length);
    }
    return answer;
  }, [userAnswers]);

  // Format time
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Load data on mount
  useEffect(() => {
    loadTestData();
  }, [loadTestData]);

  return {
    test,
    questions,
    userAnswers,
    timeRemaining,
    loading,
    error,
    hasExistingProgress,
    attempt,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    updateAnswer,
    markQuestion,
    submitTest,
    getQuestionProgress,
    getCurrentAnswer,
    formatTime,
    loadTestData,
    saveCurrentPosition
  };
};
