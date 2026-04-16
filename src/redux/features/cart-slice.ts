import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

type InitialState = {
  items: CartItem[];
};

export type CartItem = {
  id: number;
  title: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCartItem(input: Partial<CartItem> | null | undefined): CartItem | null {
  if (!input || typeof input !== "object") return null;

  const id = toFiniteNumber(input.id, NaN);
  if (!Number.isInteger(id)) return null;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return null;

  const price = toFiniteNumber(input.price, 0);
  const discountedPrice = toFiniteNumber(input.discountedPrice, price);
  const quantity = Math.max(1, Math.floor(toFiniteNumber(input.quantity, 1)));

  return {
    id,
    title,
    price,
    discountedPrice,
    quantity,
    imgs: input.imgs,
  };
}

const initialState: InitialState = {
  items: [],
};

export const cart = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItemToCart: (state, action: PayloadAction<CartItem>) => {
      const normalizedItem = normalizeCartItem(action.payload);
      if (!normalizedItem) return;

      const { id, title, price, quantity, discountedPrice, imgs } = normalizedItem;
      const existingItem = state.items.find((item) => item.id === id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          id,
          title,
          price,
          quantity,
          discountedPrice,
          imgs,
        });
      }
    },
    removeItemFromCart: (state, action: PayloadAction<number>) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
    },
    updateCartItemQuantity: (
      state,
      action: PayloadAction<{ id: number; quantity: number }>
    ) => {
      const id = toFiniteNumber(action.payload.id, NaN);
      const quantity = Math.max(1, Math.floor(toFiniteNumber(action.payload.quantity, 1)));
      if (!Number.isInteger(id)) return;
      const existingItem = state.items.find((item) => item.id === id);

      if (existingItem) {
        existingItem.quantity = quantity;
      }
    },

    removeAllItemsFromCart: (state) => {
      state.items = [];
    },
    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload
        .map((item) => normalizeCartItem(item))
        .filter((item): item is CartItem => Boolean(item));
    },
  },
});

export const selectCartItems = (state: RootState) => state.cartReducer.items;

export const selectTotalPrice = createSelector([selectCartItems], (items) => {
  const total = items.reduce((total, item) => {
    return total + item.discountedPrice * item.quantity;
  }, 0);
  return Math.round(total * 100) / 100;
});

export const selectTotalItems = createSelector([selectCartItems], (items) => {
  return items.reduce((total, item) => total + item.quantity, 0);
});

export const {
  addItemToCart,
  removeItemFromCart,
  updateCartItemQuantity,
  removeAllItemsFromCart,
  setCartItems,
} = cart.actions;
export default cart.reducer;
