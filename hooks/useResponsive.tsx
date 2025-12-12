import { useState, useEffect } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

// Breakpoints for responsive design
const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

export interface ResponsiveValues {
  width: number;
  height: number;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  columns: number; // Number of columns for grid layouts
  maxContentWidth: number; // Max width for content containers
  padding: number; // Responsive padding
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

export function useResponsive(): ResponsiveValues {
  const [dimensions, setDimensions] = useState(() => {
    const { width, height } = Dimensions.get('window');
    return { width, height };
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: ScaledSize }) => {
        setDimensions({ width: window.width, height: window.height });
      }
    );

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isWeb = Platform.OS === 'web';
  const isMobile = !isWeb && width < BREAKPOINTS.md;
  const isTablet = !isWeb && width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = isWeb || width >= BREAKPOINTS.lg;

  // Determine breakpoint
  let breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' = 'xs';
  if (width >= BREAKPOINTS.xxl) breakpoint = 'xxl';
  else if (width >= BREAKPOINTS.xl) breakpoint = 'xl';
  else if (width >= BREAKPOINTS.lg) breakpoint = 'lg';
  else if (width >= BREAKPOINTS.md) breakpoint = 'md';
  else if (width >= BREAKPOINTS.sm) breakpoint = 'sm';
  else breakpoint = 'xs';

  const isSmallScreen = width < BREAKPOINTS.md;
  const isMediumScreen = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isLargeScreen = width >= BREAKPOINTS.lg;

  // Calculate number of columns based on screen size
  let columns = 2; // Default for mobile
  if (isWeb) {
    if (width >= BREAKPOINTS.xxl) columns = 6;
    else if (width >= BREAKPOINTS.xl) columns = 5;
    else if (width >= BREAKPOINTS.lg) columns = 4;
    else if (width >= BREAKPOINTS.md) columns = 3;
    else columns = 2;
  } else if (isTablet) {
    columns = 3;
  }

  // Max content width for containers
  const maxContentWidth = isWeb
    ? Math.min(width, BREAKPOINTS.xxl)
    : width;

  // Responsive padding
  const padding = isWeb
    ? width >= BREAKPOINTS.lg ? 24 : width >= BREAKPOINTS.md ? 16 : 12
    : 12;

  // Responsive font sizes
  const fontSize = {
    xs: isWeb ? 10 : 10,
    sm: isWeb ? 12 : 12,
    md: isWeb ? 14 : 14,
    lg: isWeb ? 16 : 16,
    xl: isWeb ? 18 : 18,
    xxl: isWeb ? 24 : 20,
  };

  return {
    width,
    height,
    isWeb,
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    columns,
    maxContentWidth,
    padding,
    fontSize,
  };
}

// Helper function to calculate item width for grid layouts
export function useItemWidth(
  columns: number,
  gap: number = 12,
  containerPadding: number = 16
): number {
  const { width, isWeb, maxContentWidth } = useResponsive();
  
  if (isWeb) {
    const availableWidth = Math.min(width, maxContentWidth) - (containerPadding * 2);
    return Math.floor((availableWidth - (gap * (columns - 1))) / columns);
  } else {
    const availableWidth = width - (containerPadding * 2);
    return Math.floor((availableWidth - (gap * (columns - 1))) / columns);
  }
}

// Helper function for responsive values
export function useResponsiveValue<T>(
  mobile: T,
  tablet?: T,
  desktop?: T
): T {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  if (isMobile) return mobile;
  if (isTablet && tablet !== undefined) return tablet;
  if (isDesktop && desktop !== undefined) return desktop;
  return mobile;
}

