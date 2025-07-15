import React from 'react';

interface SkeletonLoaderProps {
  count?: number;
}

export function SkeletonLoader({ count = 6 }: SkeletonLoaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            </div>
            
            {/* Description */}
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
            
            {/* Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center">
                <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="flex items-center">
                <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="flex items-center">
                <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-4 border-t border-gray-100">
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}