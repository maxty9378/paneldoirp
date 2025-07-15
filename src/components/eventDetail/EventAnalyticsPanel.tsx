import React from 'react';
import { TestStatsBlock } from './EventAnalytics/TestStatsBlock';
import { TestTimeBlock } from './EventAnalytics/TestTimeBlock';
import { QuestionAnalysisBlock } from './EventAnalytics/QuestionAnalysisBlock';
import { FeedbackStatsBlock } from './EventAnalytics/FeedbackStatsBlock';
import { TestFeedbackCorrelationBlock } from './EventAnalytics/TestFeedbackCorrelationBlock';

export function EventAnalyticsPanel({ eventId }: { eventId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
      <TestStatsBlock eventId={eventId} />
      <TestTimeBlock eventId={eventId} />
      <QuestionAnalysisBlock eventId={eventId} />
      <FeedbackStatsBlock eventId={eventId} />
      <TestFeedbackCorrelationBlock eventId={eventId} />
    </div>
  );
} 