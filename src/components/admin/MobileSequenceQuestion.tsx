import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';

interface Answer {
  id: string;
  text: string;
  is_correct: boolean;
  order: number;
}

interface MobileSequenceQuestionProps {
  questionId: string;
  answers: Answer[];
  userOrder?: (string | number)[];
  onOrderChange: (questionId: string, newOrder: (string | number)[]) => void;
}

export const MobileSequenceQuestion: React.FC<MobileSequenceQuestionProps> = ({
  questionId,
  answers,
  userOrder = [],
  onOrderChange
}) => {
  const [currentOrder, setCurrentOrder] = useState<(string | number)[]>(() => {
    if (userOrder.length > 0) {
      return userOrder;
    }
    // Shuffle answers for initial order
    return answers.map(a => a.id).sort(() => Math.random() - 0.5);
  });

  // Обновляем порядок при изменении userOrder или answers
  useEffect(() => {
    console.log('MobileSequenceQuestion useEffect:', { 
      questionId, 
      userOrder, 
      answersLength: answers.length, 
      currentOrderLength: currentOrder.length 
    });
    
    if (userOrder.length > 0) {
      // Используем сохраненный порядок, только если он отличается от текущего
      if (JSON.stringify(userOrder) !== JSON.stringify(currentOrder)) {
        setCurrentOrder(userOrder);
      }
    } else if (answers.length > 0 && currentOrder.length !== answers.length) {
      // Если нет сохраненного порядка и количество элементов не совпадает, создаем перемешанный
      const shuffled = answers.map(a => a.id).sort(() => Math.random() - 0.5);
      console.log('Creating shuffled order for question:', questionId, shuffled);
      setCurrentOrder(shuffled);
    }
  }, [questionId, userOrder, answers, currentOrder]);

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...currentOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setCurrentOrder(newOrder);
      onOrderChange(questionId, newOrder);
    }
  };

  const resetOrder = () => {
    const shuffled = answers.map(a => a.id).sort(() => Math.random() - 0.5);
    setCurrentOrder(shuffled);
    onOrderChange(questionId, shuffled);
  };

  const getAnswerById = (id: string | number) => {
    return answers.find(a => a.id === id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Расставьте элементы в правильном порядке:
        </p>
        <button
          onClick={resetOrder}
          className="flex items-center space-x-1 text-xs text-[#06A478] hover:text-[#047857]"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Перемешать</span>
        </button>
      </div>

      <div className="space-y-2">
        {currentOrder.map((answerId, index) => {
          const answer = getAnswerById(answerId);
          if (!answer) return null;

          return (
            <div
              key={answerId}
              className="flex items-center space-x-3 p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm"
            >
              {/* Order number */}
              <div className="w-8 h-8 bg-[#f0fdf4] text-[#06A478] rounded-lg flex items-center justify-center text-sm font-semibold">
                {index + 1}
              </div>

              {/* Answer text */}
              <span className="text-gray-900 text-sm flex-1 leading-[1.2]">
                {answer.text}
              </span>

              {/* Move buttons */}
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:text-gray-200 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === currentOrder.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:text-gray-200 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-gray-500 text-center">
        Используйте кнопки ↑↓ для изменения порядка элементов
      </div>
    </div>
  );
};
