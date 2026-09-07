import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce fast changing values (such as search queries or filter inputs)
 * preventing high CPU load or unneeded re-computations on large datasets.
 */
export function useDebounce<T>(value: T, delayMs: number = 180): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
