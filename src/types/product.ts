export type Product = {
  title: string;
  description?: string;
  reviews: number;
  // detail mode (retail) price
  detailPrice: number;
  // optional vitrina mode (wholesale) price
  jomlaPrice?: number;
  category: string;
  id: number;
  imgs?: {
    thumbnails: string[];
    previews: string[];
  };
};
