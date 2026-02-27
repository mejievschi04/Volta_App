import { useMemo, useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Breakpoints aliniate cu BottomMenu (app/_components/BottomMenu.tsx) */
const getBottomMenuHeight = (width: number): number => {
  const isSmall = width < 375;
  const isMedium = width >= 375 && width < 768;
  // paddingTop + row height + paddingBottom din BottomMenu
  if (isSmall) return 12 + 56 + 12;   // 80
  if (isMedium) return 14 + 60 + 14; // 88
  return 14 + 64 + 14;                // 92
};

/**
 * Returnează padding-ul de jos necesar ca conținutul să nu intre sub bara de meniu.
 * Responsive: se actualizează la schimbarea dimensiunii ecranului (rotație, split screen).
 */
export function useBottomMenuInset(): number {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(() => Dimensions.get('window').width);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      setWidth(window.width);
    });
    return () => sub?.remove();
  }, []);

  return useMemo(() => insets.bottom + getBottomMenuHeight(width), [insets.bottom, width]);
}
