import React, { useState } from 'react';
import { MessageSquare, User, MapPin, Calendar, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface FeedbackComment {
  id: string;
  user_id: string;
  user_full_name: string;
  user_territory?: string;
  user_territory_region?: string;
  value: string;
  submission_id: string;
  is_anonymous: boolean;
  created_at?: string;
}

interface FeedbackCommentsProps {
  comments: FeedbackComment[];
  title?: string;
}

export function FeedbackComments({ comments, title = "Комментарии и предложения" }: FeedbackCommentsProps) {
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const commentsPerPage = 1;

  const toggleComment = (commentId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedComments(newExpanded);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const totalPages = Math.ceil(comments.length / commentsPerPage);
  const startIndex = currentPage * commentsPerPage;
  const endIndex = startIndex + commentsPerPage;
  const currentComments = comments.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getUserColor = (userId: string | undefined): string => {
    if (!userId) return 'bg-gray-500';
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-yellow-500', 'bg-indigo-500'];
    const sum = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!comments || comments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-center py-6">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Пока нет комментариев и предложений</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {comments.length} {comments.length === 1 ? 'комментарий' : comments.length < 5 ? 'комментария' : 'комментариев'}
        </span>
      </div>

      <div className="space-y-4">
        {currentComments.map((comment, index) => (
          <div 
            key={comment.id || index} 
            className="rounded-xl p-4 border shadow-sm"
            style={{ borderColor: '#06A478', backgroundColor: '#06A47810' }}
          >
            {/* Информация об отправителе */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm",
                  getUserColor(comment.user_id)
                )}
              >
                {comment.is_anonymous ? 'А' : getInitials(comment.user_full_name)}
              </div>
              <div>
                <div className="font-bold text-gray-900 uppercase text-sm">
                  {comment.is_anonymous ? 'АНОНИМНЫЙ УЧАСТНИК' : comment.user_full_name.toUpperCase()}
                </div>
                <div className="text-gray-500 text-xs">
                  {comment.user_territory || 'СНС'}
                  {comment.user_territory_region && `-${comment.user_territory_region}`}
                </div>
              </div>
            </div>

            {/* Цитата */}
            <div className="relative bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              {/* Кнопка копирования */}
              <button
                onClick={() => copyToClipboard(comment.value)}
                className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                title="Скопировать комментарий"
              >
                <Copy className="w-4 h-4 text-gray-300 hover:text-gray-500" />
              </button>
              
              <div className="text-gray-800 leading-relaxed pr-10">
                {comment.value.length > 200 && !expandedComments.has(comment.id) ? (
                  <div>
                    <p className="mb-2">{comment.value.substring(0, 200)}...</p>
                    <button
                      onClick={() => toggleComment(comment.id)}
                      className="text-sm font-medium hover:underline"
                      style={{ color: '#06A478' }}
                    >
                      Читать полностью
                    </button>
                  </div>
                ) : (
                  <div>
                    <p>{comment.value}</p>
                    {comment.value.length > 200 && expandedComments.has(comment.id) && (
                      <button
                        onClick={() => toggleComment(comment.id)}
                        className="text-sm font-medium mt-2 hover:underline block"
                        style={{ color: '#06A478' }}
                      >
                        Свернуть
                      </button>
                    )}
                  </div>
                )}
              </div>
              

            </div>
          </div>
        ))}
      </div>

      {/* Навигация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              className={clsx(
                "p-2 rounded-lg transition-colors duration-200",
                currentPage === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              )}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="text-sm text-gray-600">
              {currentPage + 1} из {totalPages}
            </span>
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              className={clsx(
                "p-2 rounded-lg transition-colors duration-200",
                currentPage === totalPages - 1
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              )}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={clsx(
                  "w-2 h-2 rounded-full transition-colors duration-200",
                  i === currentPage
                    ? "bg-gray-600"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 