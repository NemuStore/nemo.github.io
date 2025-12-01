import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonCard } from './SkeletonCard';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { Platform, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const itemWidth = isWeb 
  ? Math.min(250, Math.floor((Math.min(width, 1400) - 60) / 4))
  : (width - 40) / 2;

interface ProductCardSkeletonProps {
  count?: number;
}

export const ProductCardSkeleton = ({ count = 8 }: ProductCardSkeletonProps) => {
  const { colors } = useDarkMode();

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[styles.productCard, { backgroundColor: colors.card || '#fff' }]}
        >
          <SkeletonCard
            width="100%"
            height={itemWidth * 1.2}
            borderRadius={8}
          />
          <View style={styles.productInfo}>
            <SkeletonCard width="80%" height={16} borderRadius={4} />
            <View style={styles.priceContainer}>
              <SkeletonCard width="40%" height={20} borderRadius={4} />
              <SkeletonCard width="30%" height={16} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: itemWidth,
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    padding: 10,
    gap: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
});

export default ProductCardSkeleton;

