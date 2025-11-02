import { useEffect, useRef } from 'react';

/**
 * Hook to debounce localStorage writes for performance
 * Batches multiple rapid updates into a single write operation
 */
export function useDebouncedLocalStorage<T>(
  key: string,
  value: T,
  delay: number = 500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip saving on first render (we just loaded from localStorage)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to save after delay
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
    }, delay);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);
}

/**
 * Hook to load data from localStorage once on mount
 */
export function useLocalStorageLoad<T>(
  key: string,
  defaultValue: T
): T {
  const valueRef = useRef<T | null>(null);

  if (valueRef.current === null) {
    try {
      const storedValue = localStorage.getItem(key);
      if (storedValue) {
        valueRef.current = JSON.parse(storedValue);
      } else {
        valueRef.current = defaultValue;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      valueRef.current = defaultValue;
    }
  }

  return valueRef.current;
}

