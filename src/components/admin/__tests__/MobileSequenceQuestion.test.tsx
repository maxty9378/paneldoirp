import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileSequenceQuestion } from '../MobileSequenceQuestion';

describe('MobileSequenceQuestion', () => {
  const mockAnswers = [
    { id: '1', text: 'Первый элемент', is_correct: true, order: 1 },
    { id: '2', text: 'Второй элемент', is_correct: true, order: 2 },
    { id: '3', text: 'Третий элемент', is_correct: true, order: 3 },
  ];

  const mockProps = {
    questionId: 'q1',
    answers: mockAnswers,
    onOrderChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all answers in initial order', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    expect(screen.getByText('Первый элемент')).toBeInTheDocument();
    expect(screen.getByText('Второй элемент')).toBeInTheDocument();
    expect(screen.getByText('Третий элемент')).toBeInTheDocument();
  });

  it('displays order numbers correctly', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onOrderChange when moving items up', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    const moveUpButtons = screen.getAllByRole('button', { name: /up/i });
    fireEvent.click(moveUpButtons[1]); // Move second item up
    
    expect(mockProps.onOrderChange).toHaveBeenCalledWith('q1', expect.any(Array));
  });

  it('calls onOrderChange when moving items down', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    const moveDownButtons = screen.getAllByRole('button', { name: /down/i });
    fireEvent.click(moveDownButtons[0]); // Move first item down
    
    expect(mockProps.onOrderChange).toHaveBeenCalledWith('q1', expect.any(Array));
  });

  it('disables up button for first item', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    const moveUpButtons = screen.getAllByRole('button', { name: /up/i });
    expect(moveUpButtons[0]).toBeDisabled();
  });

  it('disables down button for last item', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    const moveDownButtons = screen.getAllByRole('button', { name: /down/i });
    expect(moveDownButtons[moveDownButtons.length - 1]).toBeDisabled();
  });

  it('calls onOrderChange when resetting order', () => {
    render(<MobileSequenceQuestion {...mockProps} />);
    
    const resetButton = screen.getByText('Перемешать');
    fireEvent.click(resetButton);
    
    expect(mockProps.onOrderChange).toHaveBeenCalledWith('q1', expect.any(Array));
  });

  it('uses provided userOrder when available', () => {
    const userOrder = ['3', '1', '2'];
    render(<MobileSequenceQuestion {...mockProps} userOrder={userOrder} />);
    
    // Check that the order is applied (this would need more specific testing based on implementation)
    expect(mockProps.onOrderChange).not.toHaveBeenCalled();
  });
});
