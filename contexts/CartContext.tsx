import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '@/types';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string, variantId?: string | null) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@nemu_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    saveCart();
  }, [cartItems]);

  const loadCart = async () => {
    try {
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        setCartItems(JSON.parse(cartData));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async () => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prevItems) => {
      // التحقق من المنتج بنفس ID ونفس variant_id (لون/مقاس)
      const productVariantId = (product as any).variant_id || null;
      const existingItem = prevItems.find((item) => {
        const itemVariantId = (item.product as any).variant_id || null;
        // نفس المنتج ونفس المتغير (variant)
        return item.product.id === product.id && itemVariantId === productVariantId;
      });
      
      if (existingItem) {
        // إذا كان المنتج موجود بنفس المتغير، نزيد الكمية
        return prevItems.map((item) => {
          const itemVariantId = (item.product as any).variant_id || null;
          if (item.product.id === product.id && itemVariantId === productVariantId) {
            return { ...item, quantity: item.quantity + quantity };
          }
          return item;
        });
      }
      // إذا كان المنتج غير موجود أو بنفس المنتج بمتغير مختلف، نضيفه كعنصر جديد
      return [...prevItems, { product, quantity }];
    });
  };

  const removeFromCart = (productId: string, variantId?: string | null) => {
    setCartItems((prevItems) => {
      return prevItems.filter((item) => {
        const itemVariantId = (item.product as any).variant_id || null;
        // إزالة العنصر إذا كان نفس المنتج ونفس المتغير
        if (item.product.id === productId) {
          if (variantId === undefined) {
            // إذا لم يتم تحديد variant_id، نزيل أول عنصر نجد له نفس product.id
            return false;
          }
          return itemVariantId !== variantId;
        }
        return true;
      });
    });
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string | null) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const itemVariantId = (item.product as any).variant_id || null;
        // تحديث الكمية إذا كان نفس المنتج ونفس المتغير
        if (item.product.id === productId) {
          if (variantId === undefined) {
            // إذا لم يتم تحديد variant_id، نحدث أول عنصر نجد له نفس product.id
            return { ...item, quantity };
          }
          if (itemVariantId === variantId) {
            return { ...item, quantity };
          }
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    AsyncStorage.removeItem(CART_STORAGE_KEY);
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

