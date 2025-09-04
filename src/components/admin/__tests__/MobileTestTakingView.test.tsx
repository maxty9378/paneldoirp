import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedMobileTestTakingView } from '../EnhancedMobileTestTakingView';
import { useMobileTest } from '../../../hooks/useMobileTest';
import { useAuth } from '../../../hooks/useAuth';

// Mock hooks
jest.mock('../../../hooks/useMobileTest');
jest.mock('../../../hooks/useAuth');

const mockUseMobileTest = useMobileTest as jest.MockedFunction<typeof useMobileTest>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('EnhancedMobileTestTakingView', () => {
  const mockProps = {
    testId: 'test-1',
    eventId: 'event-1',
    attemptId: 'attempt-1',
    onComplete: jest.fn(),
    onCancel: jest.fn(),
    onTestLoaded: jest.fn(),
  };

  const mockTest = {
    id: 'test-1',
    title: 'Тестовый тест',
    description: 'Описание теста',
    type: 'entry',
    passing_score: 70,
    time_limit: 30,
  };

  const mockQuestions = [
    {
      id: 'q1',
      question: 'Какой цвет неба?',
      question_type: 'single_choice',
      points: 1,
      order: 1,
      answers: [
        { id: 'a1', text: 'Синий', is_correct: true, order: 1 },
        { id: 'a2', text: 'Красный', is_correct: false, order: 2 },
      ],
    },
  ];

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      userProfile: { id: 'user-1', role: 'employee' },
    } as any);

    mockUseMobileTest.mockReturnValue({
      test: mockTest,
      questions: mockQuestions,
      userAnswers: [],
      timeRemaining: 1800,
      loading: false,
      error: null,
      hasExistingProgress: false,
      attempt: null,
      updateAnswer: jest.fn(),
      markQuestion: jest.fn(),
      submitTest: jest.fn(),
      getQuestionProgress: jest.fn().mockReturnValue([
        { index: 0, questionId: 'q1', answered: false, marked: false },
      ]),
      getCurrentAnswer: jest.fn(),
      formatTime: jest.fn().mockReturnValue('30:00'),
      loadTestData: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders test title and question', () => {
    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    expect(screen.getByText('Тестовый тест')).toBeInTheDocument();
    expect(screen.getByText('Какой цвет неба?')).toBeInTheDocument();
  });

  it('displays progress information', () => {
    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    expect(screen.getByText('1 из 1')).toBeInTheDocument();
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('handles answer selection', async () => {
    const mockUpdateAnswer = jest.fn();
    mockUseMobileTest.mockReturnValue({
      ...mockUseMobileTest(),
      updateAnswer: mockUpdateAnswer,
    } as any);

    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    const answerOption = screen.getByText('Синий');
    fireEvent.click(answerOption);
    
    expect(mockUpdateAnswer).toHaveBeenCalledWith('q1', 'a1');
  });

  it('shows loading state', () => {
    mockUseMobileTest.mockReturnValue({
      ...mockUseMobileTest(),
      loading: true,
    } as any);

    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    expect(screen.getByText('Загрузка теста...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseMobileTest.mockReturnValue({
      ...mockUseMobileTest(),
      error: 'Ошибка загрузки',
    } as any);

    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    expect(screen.getByText('Ошибка')).toBeInTheDocument();
    expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
  });

  it('shows restore modal when there is existing progress', () => {
    mockUseMobileTest.mockReturnValue({
      ...mockUseMobileTest(),
      hasExistingProgress: true,
    } as any);

    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    expect(screen.getByText('Продолжить тест?')).toBeInTheDocument();
    expect(screen.getByText('Продолжить')).toBeInTheDocument();
    expect(screen.getByText('Начать заново')).toBeInTheDocument();
  });

  it('handles test completion', async () => {
    const mockSubmitTest = jest.fn().mockResolvedValue({ score: 100, maxScore: 100, passed: true });
    mockUseMobileTest.mockReturnValue({
      ...mockUseMobileTest(),
      submitTest: mockSubmitTest,
    } as any);

    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    const submitButton = screen.getByText('Завершить');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockSubmitTest).toHaveBeenCalled();
    });
  });

  it('handles navigation between questions', () => {
    const mockQuestions = [
      ...mockQuestions,
      {
        id: 'q2',
        question: 'Второй вопрос',
        question_type: 'single_choice',
        points: 1,
        order: 2,
        answers: [
          { id: 'a3', text: 'Ответ 1', is_correct: true, order: 1 },
        ],
      },
    ];

    mockUseMobileTest.mockReturnValue({
      ...mockUseMobileTest(),
      questions: mockQuestions,
      getQuestionProgress: jest.fn().mockReturnValue([
        { index: 0, questionId: 'q1', answered: false, marked: false },
        { index: 1, questionId: 'q2', answered: false, marked: false },
      ]),
    } as any);

    render(<EnhancedMobileTestTakingView {...mockProps} />);
    
    const nextButton = screen.getByText('Далее');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('2 из 2')).toBeInTheDocument();
  });
});
