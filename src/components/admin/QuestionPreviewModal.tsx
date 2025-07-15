import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface Question {
  id?: string;
  question: string;
  question_type: string;
  order: number;
  points: number;
  explanation?: string;
  answers?: Answer[];
}

interface Answer {
  id?: string;
  text: string;
  is_correct: boolean;
  order: number;
  answer_order?: number;
}

interface QuestionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
}

export function QuestionPreviewModal({ isOpen, onClose, question }: QuestionPreviewModalProps) {
  if (!isOpen || !question) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Предпросмотр вопроса</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-start">
              <div className="mr-3 mt-1">
                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                  {question.order}
                </div>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">{question.question}</h4>
                <div className="flex items-center mt-2 space-x-2">
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    question.question_type === 'single_choice' ? "bg-blue-100 text-blue-800" :
                    question.question_type === 'multiple_choice' ? "bg-purple-100 text-purple-800" :
                    question.question_type === 'sequence' ? "bg-green-100 text-green-800" :
                    "bg-green-100 text-green-800"
                  )}>
                    {question.question_type === 'single_choice' ? 'Один вариант' :
                     question.question_type === 'multiple_choice' ? 'Несколько вариантов' :
                     question.question_type === 'sequence' ? 'Последовательность' : 'Текстовый ответ'}
                  </span>
                  <span className="text-xs text-gray-500">{question.points} балл(ов)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Варианты ответов */}
          {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && 
           question.answers && question.answers.length > 0 ? (
            <div className="space-y-3 mb-6">
              <h5 className="text-sm font-medium text-gray-700">Варианты ответов:</h5>
              {question.answers.map((answer, index) => (
                <div 
                  key={index}
                  className={clsx(
                    "p-3 border rounded-lg flex items-center",
                    answer.is_correct ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"
                  )}
                >
                  <div className="mr-3">
                    {question.question_type === 'single_choice' ? (
                      <div className={clsx(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        answer.is_correct ? "border-green-500 bg-green-100" : "border-gray-300"
                      )}>
                        {answer.is_correct && (
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        )}
                      </div>
                    ) : (
                      <div className={clsx(
                        "w-4 h-4 rounded border flex items-center justify-center",
                        answer.is_correct ? "border-green-500 bg-green-100" : "border-gray-300"
                      )}>
                        {answer.is_correct && (
                          <CheckCircle size={10} className="text-green-500" />
                        )}
                      </div>
                    )}
                  </div>
                  <span className={answer.is_correct ? "font-medium" : "text-gray-700"}>
                    {answer.text}
                  </span>
                  {answer.is_correct && (
                    <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle size={12} className="mr-1" />
                      Правильный
                    </span>
                  )}
                </div>
              ))}
              
              {question.explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-1">Пояснение:</h5>
                  <p className="text-sm text-blue-700">{question.explanation}</p>
                </div>
              )}
            </div>
          ) : question.question_type === 'sequence' && question.answers && question.answers.length > 0 ? (
            <div className="space-y-3 mb-6">
              <h5 className="text-sm font-medium text-gray-700">Варианты ответа (правильная последовательность):</h5>
              <ol className="list-decimal pl-5">
                {question.answers
                  .sort((a, b) => (a.order || a.answer_order) - (b.order || b.answer_order))
                  .map((answer, idx) => (
                    <li key={answer.id} className="py-1 text-gray-900">{answer.text || answer.answer_text}</li>
                  ))}
              </ol>
              {question.explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-1">Пояснение:</h5>
                  <p className="text-sm text-blue-700">{question.explanation}</p>
                </div>
              )}
            </div>
          ) : question.question_type === 'text' ? (
            <div className="mb-6">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-gray-600 text-sm italic">
                  Поле для ввода текстового ответа пользователем
                </p>
              </div>
              {question.explanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-1">Пояснение:</h5>
                  <p className="text-sm text-blue-700">{question.explanation}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center text-yellow-800">
                <AlertTriangle size={20} className="mr-2" />
                <span>У вопроса нет вариантов ответа</span>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}