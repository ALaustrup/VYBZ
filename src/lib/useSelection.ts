import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Multi-select over an ordered id list. Supports click to toggle, shift-click to extend
 * a range from the last anchor, select-all over the *currently visible* ids, and clear.
 *
 * Selection is stored as ids rather than indexes so it survives re-sorting and filtering;
 * ids that leave the visible set are pruned by `visibleSelected`.
 */
export function useSelection(orderedIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const anchor = useRef<string | null>(null);

  const indexOf = useCallback(
    (id: string) => orderedIds.indexOf(id),
    [orderedIds]
  );

  const toggle = useCallback((id: string) => {
    anchor.current = id;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Shift-click: select every id between the anchor and this one, inclusive. */
  const extendTo = useCallback(
    (id: string) => {
      const from = anchor.current ? indexOf(anchor.current) : -1;
      const to = indexOf(id);
      if (from < 0 || to < 0) {
        toggle(id);
        return;
      }
      const [lo, hi] = from <= to ? [from, to] : [to, from];
      setSelected((prev) => {
        const next = new Set(prev);
        for (let i = lo; i <= hi; i++) {
          const at = orderedIds[i];
          if (at) next.add(at);
        }
        return next;
      });
    },
    [indexOf, orderedIds, toggle]
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(orderedIds));
    anchor.current = orderedIds[0] ?? null;
  }, [orderedIds]);

  const clear = useCallback(() => {
    setSelected(new Set());
    anchor.current = null;
  }, []);

  const remove = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  /** Selected ids that are still visible, in display order. */
  const visibleSelected = useMemo(
    () => orderedIds.filter((id) => selected.has(id)),
    [orderedIds, selected]
  );

  const allVisibleSelected =
    orderedIds.length > 0 && visibleSelected.length === orderedIds.length;

  return {
    selected,
    visibleSelected,
    count: visibleSelected.length,
    allVisibleSelected,
    isSelected: useCallback((id: string) => selected.has(id), [selected]),
    toggle,
    extendTo,
    selectAll,
    clear,
    remove,
    active: visibleSelected.length > 0,
  };
}
