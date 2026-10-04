import { useEffect, useRef, useState } from 'react';

/** Defer expensive effects until near the viewport; pause them while hidden. */
export function useEffectVisibility<T extends HTMLElement>(rootMargin = '150px') {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [visited, setVisited] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => !document.hidden);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setVisited(true);
    }, { rootMargin });
    const onVisibility = () => setDocumentVisible(!document.hidden);
    observer.observe(element);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [rootMargin]);
  return { ref, visited, active: visible && documentVisible };
}
