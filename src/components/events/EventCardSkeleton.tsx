import React from 'react';
import { clsx } from 'clsx';

interface EventCardSkeletonProps {
  variant?: 'default' | 'compact' | 'detailed';
}

export function EventCardSkeleton({ variant = 'default' }: EventCardSkeletonProps) {
  const cardSize = variant === 'compact' ? 'p-4' : variant === 'detailed' ? 'p-8' : 'p-6';
  
  return (
    <div className={clsx(
      "relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg",
      "bg-gradient-to-br from-white via-gray-50/30 to-gray-50/30",
      "animate-pulse"
    )}>
      <div className={clsx("relative flex flex-col h-full", cardSize)}>
        {/* Header Skeleton */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="w-24 h-6 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="w-3/4 h-6 bg-gray-200 rounded mb-2"></div>
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          </div>
        </div>

        {/* Description Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="w-full h-4 bg-gray-200 rounded"></div>
          <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
        </div>

        {/* Metadata Grid Skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>

        {/* Statistics Skeleton */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-8 h-6 bg-gray-200 rounded mx-auto mb-1"></div>
                <div className="w-12 h-3 bg-gray-200 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-20 h-3 bg-gray-200 rounded"></div>
          </div>
          <div className="w-20 h-8 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
} 