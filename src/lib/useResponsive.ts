import { useWindowDimensions } from 'react-native';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isNarrowMobile: boolean; // < 360px (e.g. 320px)
  isMobile: boolean;       // < 768px (320px - 767px)
  isTablet: boolean;       // 768px - 1023px
  isDesktop: boolean;      // >= 1024px (1024px, 1366px+)
  contentPadding: number;
  maxContentWidth: number;
  columns: number;
}

export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();

  const isNarrowMobile = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  let contentPadding = 16;
  if (isNarrowMobile) {
    contentPadding = 12;
  } else if (isTablet) {
    contentPadding = 24;
  } else if (isDesktop) {
    contentPadding = 32;
  }

  let columns = 1;
  if (width >= 1200) {
    columns = 4;
  } else if (width >= 768) {
    columns = 2;
  } else if (width >= 420) {
    columns = 2;
  } else {
    columns = 1;
  }

  return {
    width,
    height,
    isNarrowMobile,
    isMobile,
    isTablet,
    isDesktop,
    contentPadding,
    maxContentWidth: 1240,
    columns,
  };
}
