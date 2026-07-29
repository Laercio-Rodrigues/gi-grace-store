import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string | null;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size: string | null) => void;
  updateQty: (productId: string, size: string | null, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartState | null>(null);
const STORAGE_KEY = "ksp:cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartState>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
    const same = (a: CartItem, id: string, size: string | null) =>
      a.productId === id && (a.size ?? null) === (size ?? null);
    return {
      items,
      count,
      subtotal,
      addItem: (item) =>
        setItems((prev) => {
          const idx = prev.findIndex((p) => same(p, item.productId, item.size));
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + item.quantity };
            return copy;
          }
          return [...prev, item];
        }),
      removeItem: (id, size) =>
        setItems((prev) => prev.filter((p) => !same(p, id, size))),
      updateQty: (id, size, qty) =>
        setItems((prev) =>
          prev.map((p) => (same(p, id, size) ? { ...p, quantity: Math.max(1, qty) } : p)),
        ),
      clear: () => setItems([]),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
