import { useCallback } from "react";

export function useToast() {
  return {
    toast: useCallback((msg: string) => alert(msg), [])
  };
} 