import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface SkeletonCardProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export const SkeletonCard = ({ width = '100%', height = 200, borderRadius = 8 }: SkeletonCardProps) => {
  const { colors } = useDarkMode();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  return (
    <View style={[styles.skeletonContainer, { width, height, borderRadius, backgroundColor: colors.skeletonBackground || '#e0e0e0' }]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity,
            backgroundColor: colors.skeletonShimmer || '#f0f0f0',
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default SkeletonCard;
