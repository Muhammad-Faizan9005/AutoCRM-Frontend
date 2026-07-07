import { useEffect, useRef } from 'react';

export const useOutsideDismiss = (enabled, onDismiss, refs = [], ignoreSelectors = []) => {
  const onDismissRef = useRef(onDismiss);
  const refsRef = useRef(refs);
  const ignoreSelectorsRef = useRef(ignoreSelectors);

  onDismissRef.current = onDismiss;
  refsRef.current = refs;
  ignoreSelectorsRef.current = ignoreSelectors;

  useEffect(() => {
    if (!enabled || typeof onDismiss !== 'function') return undefined;

    const handlePointerDown = (event) => {
      const clickedInside = refsRef.current.some((ref) => ref?.current?.contains(event.target));
      const ignored = ignoreSelectorsRef.current.some((selector) => event.target?.closest?.(selector));
      if (ignored) return;
      if (!clickedInside) onDismissRef.current?.(event);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onDismissRef.current?.(event);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
};

export const useCloseFilterMenusOnOutside = () => {
  useEffect(() => {
    const closeMenus = (event) => {
      document.querySelectorAll('details.filter-menu[open]').forEach((menu) => {
        if (!menu.contains(event.target)) menu.removeAttribute('open');
      });
    };

    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return;
      document.querySelectorAll('details.filter-menu[open]').forEach((menu) => {
        menu.removeAttribute('open');
      });
    };

    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
};
