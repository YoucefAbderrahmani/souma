import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type InitialState = {
  items: WishListItem[];
};

export type WishListItem = {
  id: number;
  title: string;
  price: number;
  discountedPrice: number;
  quantity: number;
  status?: string;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeWishlistItem(
  input: Partial<WishListItem> | null | undefined
): WishListItem | null {
  if (!input || typeof input !== "object") return null;

  const id = toFiniteNumber(input.id, NaN);
  if (!Number.isInteger(id)) return null;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return null;

  const price = toFiniteNumber(input.price, 0);
  const discountedPrice = toFiniteNumber(input.discountedPrice, price);

  return {
    id,
    title,
    price,
    discountedPrice,
    quantity: 1,
    status: input.status,
    imgs: input.imgs,
  };
}

const initialState: InitialState = {
  items: [],
};

export const wishlist = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    addItemToWishlist: (state, action: PayloadAction<WishListItem>) => {
      const normalizedItem = normalizeWishlistItem(action.payload);
      if (!normalizedItem) return;

      const existingItem = state.items.find((item) => item.id === normalizedItem.id);
      if (existingItem) {
        existingItem.title = normalizedItem.title;
        existingItem.price = normalizedItem.price;
        existingItem.discountedPrice = normalizedItem.discountedPrice;
        existingItem.imgs = normalizedItem.imgs ?? existingItem.imgs;
        existingItem.status = normalizedItem.status ?? existingItem.status;
        return;
      }

      state.items.push(normalizedItem);
    },
    removeItemFromWishlist: (state, action: PayloadAction<number>) => {
      const itemId = action.payload;
      state.items = state.items.filter((item) => item.id !== itemId);
    },
    removeAllItemsFromWishlist: (state) => {
      state.items = [];
    },
    setWishlistItems: (state, action: PayloadAction<WishListItem[]>) => {
      const seen = new Set<number>();
      state.items = action.payload
        .map((item) => normalizeWishlistItem(item))
        .filter((item): item is WishListItem => {
          if (!item || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
    },
  },
});

export const {
  addItemToWishlist,
  removeItemFromWishlist,
  removeAllItemsFromWishlist,
  setWishlistItems,
} = wishlist.actions;
export default wishlist.reducer;
