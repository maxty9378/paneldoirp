import { useState, useEffect } from 'react';
import { getTestReviewResult, hasReviewResult } from '../utils/testReviewUtils';

export function useTestReviewResults(attemptId: string | null) {
  const [reviewResult, setReviewResult] = useState(null);
  const [hasReview, setHasReview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      setReviewResult(null);
      setHasReview(false);
      return;
    }

    const checkReview = async () => {
      setLoading(true);
      try {
        const hasReviewData = await hasReviewResult(attemptId);
        setHasReview(hasReviewData);

        if (hasReviewData) {
          const result = await getTestReviewResult(attemptId);
          setReviewResult(result);
        } else {
          setReviewResult(null);
        }
      } catch (error) {
        console.error('Error checking review results:', error);
        setHasReview(false);
        setReviewResult(null);
      } finally {
        setLoading(false);
      }
    };

    checkReview();
  }, [attemptId]);

  return {
    reviewResult,
    hasReview,
    loading
  };
}
