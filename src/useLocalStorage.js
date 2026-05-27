import { useEffect, useState } from "react";

// A small hook that keeps a piece of state in sync with the browser's
// local storage, so values such as the watchlist and portfolio survive
// a page reload. It fails quietly if storage is unavailable.

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Storage may be full or disabled. The application still works,
      // it simply will not remember the value between visits.
    }
  }, [key, value]);

  return [value, setValue];
}
