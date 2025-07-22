import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsCardProps {
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

export function StatsCard({ title, value, change, changeType, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-squircle-lg shadow-soft p-6 hover:shadow-medium transition-all duration-200 hover:scale-[1.02] squircle24">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className={clsx(
            "flex items-center mt-2 text-sm",
            changeType === 'positive' && "text-green-600",
            changeType === 'negative' && "text-red-600",
            changeType === 'neutral' && "text-gray-600"
          )}>
            {changeType === 'positive' && <TrendingUp className="h-4 w-4 mr-1" />}
            {changeType === 'negative' && <TrendingDown className="h-4 w-4 mr-1" />}
            <span className="font-medium">{change}</span>
          </div>
        </div>
        <div className={clsx(
          "w-12 h-12 rounded-squircle flex items-center justify-center",
          changeType === 'positive' && "bg-green-100 text-green-600",
          changeType === 'negative' && "bg-red-100 text-red-600",
          changeType === 'neutral' && "bg-sns-100 text-sns-600"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}