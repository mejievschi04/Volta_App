import React, { createContext, useState, useCallback, useEffect } from 'react';
import { apiClient, resolveImageUrl } from '../../lib/apiClient';
import type { TemporaryCartItemRaw } from '../../lib/apiClient';
import { UserContext } from './UserContext';

/** Snapshot al produsului în coș (pentru afișare fără refetch) */
export interface CartProductSnapshot {
  id: string;
  name: string;
  price: number;
  currency: string;
  image_url: string | null;
}

export interface CartItem {
  productId: string;
  quantity: number;
  product: CartProductSnapshot;
  /** Id linie coș pe server (pentru PATCH/DELETE când user e autentificat) */
  cartLineId?: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  total: number;
  isLoadingCart: boolean;
  addToCart: (product: CartProductSnapshot, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

function parsePrice(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function mapApiCartToItems(rawList: TemporaryCartItemRaw[]): CartItem[] {
  return rawList.map((raw) => {
    const product = raw.product;
    const price = parsePrice(raw.cart_promotion_price ?? product.promotion_price ?? product.price);
    const imageUrl = product.product_gallery?.[0]?.image
      ? resolveImageUrl(product.product_gallery[0].image)
      : null;
    return {
      cartLineId: raw.id,
      productId: String(product.id),
      quantity: raw.quantity,
      product: {
        id: String(product.id),
        name: product.name ?? '',
        price,
        currency: 'MDL',
        image_url: imageUrl,
      },
    };
  });
}

export const CartContext = createContext<CartContextValue>({
  items: [],
  count: 0,
  total: 0,
  isLoadingCart: false,
  addToCart: () => {},
  removeFromCart: () => {},
  setQuantity: () => {},
  clearCart: () => {},
  refreshCart: async () => {},
});

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = React.useContext(UserContext);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!token) return;
    setIsLoadingCart(true);
    const res = await apiClient.getTemporaryCart();
    setIsLoadingCart(false);
    if (res.error) {
      if (__DEV__) console.warn('[CartContext] getTemporaryCart error:', res.error);
      return;
    }
    const list = Array.isArray(res.data) ? res.data : [];
    setItems(mapApiCartToItems(list));
  }, [token]);

  // La montare și când apare token-ul: încarcă coșul de pe server
  useEffect(() => {
    if (token) {
      refreshCart();
    } else {
      setItems([]);
    }
  }, [token, refreshCart]);

  const addToCart = useCallback(
    async (product: CartProductSnapshot, quantityToAdd: number = 1) => {
      if (token) {
        const productId = parseInt(product.id, 10);
        if (!Number.isFinite(productId)) return;
        const res = await apiClient.addToTemporaryCart(productId, quantityToAdd);
        if (res.error) {
          if (__DEV__) console.warn('[CartContext] addToTemporaryCart error:', res.error);
          return;
        }
        await refreshCart();
        return;
      }
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + quantityToAdd } : i
          );
        }
        return [...prev, { productId: product.id, quantity: quantityToAdd, product }];
      });
    },
    [token, refreshCart]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      const item = items.find((i) => i.productId === productId);
      if (token && item?.cartLineId != null) {
        const res = await apiClient.removeTemporaryCartItem(item.cartLineId);
        if (res.error) {
          if (__DEV__) console.warn('[CartContext] removeTemporaryCartItem error:', res.error);
          return;
        }
        await refreshCart();
        return;
      }
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    },
    [token, items, refreshCart]
  );

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      const item = items.find((i) => i.productId === productId);
      if (token && item?.cartLineId != null) {
        const res = await apiClient.updateTemporaryCartItem(item.cartLineId, quantity);
        if (res.error) {
          if (__DEV__) console.warn('[CartContext] updateTemporaryCartItem error:', res.error);
          return;
        }
        await refreshCart();
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
      );
    },
    [token, items, removeFromCart, refreshCart]
  );

  const clearCart = useCallback(async () => {
    if (token) {
      await apiClient.deleteTemporaryCartAll();
      await refreshCart();
    } else {
      setItems([]);
    }
  }, [token, refreshCart]);

  const count = items.reduce((acc, i) => acc + i.quantity, 0);
  const total = items.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        isLoadingCart,
        addToCart,
        removeFromCart,
        setQuantity,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
