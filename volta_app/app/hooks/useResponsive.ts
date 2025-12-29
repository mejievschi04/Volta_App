import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export interface ResponsiveDimensions {
  width: number;
  height: number;
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isTablet: boolean;
  scale: number;
}

const getWindowDimensions = (): ResponsiveDimensions => {
  const { width, height } = Dimensions.get('window');
  const scale = width / 375; // Base scale on iPhone X (375px width)
  
  return {
    width,
    height,
    isSmallScreen: width < 375,
    isMediumScreen: width >= 375 && width < 768,
    isLargeScreen: width >= 768,
    isTablet: width >= 768,
    scale,
  };
};

export const useResponsive = (): ResponsiveDimensions => {
  const [dimensions, setDimensions] = useState<ResponsiveDimensions>(getWindowDimensions);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      const { width, height } = window;
      const scale = width / 375;
      
      setDimensions({
        width,
        height,
        isSmallScreen: width < 375,
        isMediumScreen: width >= 375 && width < 768,
        isLargeScreen: width >= 768,
        isTablet: width >= 768,
        scale,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

// Helper functions for responsive values
export const responsiveSize = (size: number, scale?: number): number => {
  const { scale: currentScale } = getWindowDimensions();
  return size * (scale || currentScale);
};

export const responsiveWidth = (percentage: number): number => {
  const { width } = Dimensions.get('window');
  return (width * percentage) / 100;
};

export const responsiveHeight = (percentage: number): number => {
  const { height } = Dimensions.get('window');
  return (height * percentage) / 100;
};

