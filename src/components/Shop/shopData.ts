import { Product } from "@/types/product";
const shopData: Product[] = [
  {
    title: "Havit HV-G69 USB Gamepad",
    description:
      "Ergonomic USB gamepad with responsive buttons and dual analog sticks for smooth PC gaming sessions.",
    reviews: 15,
    detailPrice: 59.0,
    jomlaPrice: 41.3,
    category: "games-videos",
    id: 1,
    imgs: {
      thumbnails: [
        "/images/products/product-1-sm-1.png",
        "/images/products/product-1-sm-2.png",
      ],
      previews: [
        "/images/products/product-1-bg-1.png",
        "/images/products/product-1-bg-2.png",
      ],
    },
  },
  {
    title: "iPhone 14 Plus , 6/128GB",
    description:
      "Large-screen iPhone with 128GB storage, strong battery life, and excellent cameras for daily use.",
    reviews: 5,
    detailPrice: 899.0,
    category: "mobile-tablets",
    id: 2,
    imgs: {
      thumbnails: [
        "/images/products/product-2-sm-1.png",
        "/images/products/product-2-sm-2.png",
      ],
      previews: [
        "/images/products/product-2-bg-1.png",
        "/images/products/product-2-bg-2.png",
      ],
    },
  },
  {
    title: "Apple iMac M1 24-inch 2021",
    description:
      "24-inch all-in-one desktop powered by Apple M1, ideal for design, office work, and creative tasks.",
    reviews: 5,
    detailPrice: 1299.0,
    category: "laptop-pc",
    id: 3,
    imgs: {
      thumbnails: [
        "/images/products/product-3-sm-1.png",
        "/images/products/product-3-sm-2.png",
      ],
      previews: [
        "/images/products/product-3-bg-1.png",
        "/images/products/product-3-bg-2.png",
      ],
    },
  },
  {
    title: "MacBook Air M1 chip, 8/256GB",
    description:
      "Lightweight MacBook Air with M1 performance, 8GB memory, and 256GB SSD for work and study.",
    reviews: 6,
    detailPrice: 999.0,
    category: "laptop-pc",
    id: 4,
    imgs: {
      thumbnails: [
        "/images/products/product-4-sm-1.png",
        "/images/products/product-4-sm-2.png",
      ],
      previews: [
        "/images/products/product-4-bg-1.png",
        "/images/products/product-4-bg-2.png",
      ],
    },
  },
  {
    title: "Apple Watch Ultra",
    description:
      "Premium smart watch with durable build, advanced fitness tracking, and long battery for active users.",
    reviews: 3,
    detailPrice: 799.0,
    jomlaPrice: 559.3,
    category: "watches",
    id: 5,
    imgs: {
      thumbnails: [
        "/images/products/product-5-sm-1.png",
        "/images/products/product-5-sm-2.png",
      ],
      previews: [
        "/images/products/product-5-bg-1.png",
        "/images/products/product-5-bg-2.png",
      ],
    },
  },
  {
    title: "Logitech MX Master 3 Mouse",
    description:
      "High-precision wireless productivity mouse with comfortable shape, fast scrolling, and multi-device support.",
    reviews: 15,
    detailPrice: 99.0,
    jomlaPrice: 69.3,
    category: "accessories",
    id: 6,
    imgs: {
      thumbnails: [
        "/images/products/product-6-sm-1.png",
        "/images/products/product-6-sm-2.png",
      ],
      previews: [
        "/images/products/product-6-bg-1.png",
        "/images/products/product-6-bg-2.png",
      ],
    },
  },
  {
    title: "Apple iPad Air 5th Gen - 64GB",
    description:
      "Powerful and portable iPad Air with 64GB storage, perfect for entertainment, notes, and mobile creativity.",
    reviews: 15,
    detailPrice: 599.0,
    category: "mobile-tablets",
    id: 7,
    imgs: {
      thumbnails: [
        "/images/products/product-7-sm-1.png",
        "/images/products/product-7-sm-2.png",
      ],
      previews: [
        "/images/products/product-7-bg-1.png",
        "/images/products/product-7-bg-2.png",
      ],
    },
  },
  {
    title: "Asus RT Dual Band Router",
    description:
      "Dual-band Wi-Fi router delivering stable home coverage for streaming, gaming, and connected devices.",
    reviews: 15,
    detailPrice: 149.0,
    jomlaPrice: 104.3,
    category: "home-appliances",
    id: 8,
    imgs: {
      thumbnails: [
        "/images/products/product-8-sm-1.png",
        "/images/products/product-8-sm-2.png",
      ],
      previews: [
        "/images/products/product-8-bg-1.png",
        "/images/products/product-8-bg-2.png",
      ],
    },
  },
  {
    title: "Wireless Headphone",
    description:
      "Over-ear wireless headphones with immersive sound and comfortable fit for music, calls, and travel.",
    reviews: 11,
    detailPrice: 699.0,
    jomlaPrice: 489.3,
    category: "health-sports",
    id: 9,
    imgs: {
      thumbnails: [
        "/images/hero/hero-01.png",
        "/images/hero/hero-01.png",
      ],
      previews: [
        "/images/hero/hero-01.png",
        "/images/hero/hero-01.png",
      ],
    },
  },
  {
    title: "T Shirtt",
    description:
      "Soft everyday t-shirt with a relaxed fit, easy to pair with jeans or casual outfits.",
    reviews: 4,
    detailPrice: 10.0,
    jomlaPrice: 7.0,
    category: "fashion",
    id: 10,
    imgs: {
      thumbnails: ["/images/products/product-10-bg-1.png", "/images/products/product-10-bg-1.png"],
      previews: ["/images/products/product-10-bg-1.png", "/images/products/product-10-bg-1.png"],
    },
  },
  {
    title: "Pants",
    description:
      "Comfortable everyday pants with a clean cut, suitable for casual wear and daily movement.",
    reviews: 4,
    detailPrice: 20.0,
    jomlaPrice: 14.0,
    category: "fashion",
    id: 11,
    imgs: {
      thumbnails: ["/images/products/product-11-bg-1.png", "/images/products/product-11-bg-1.png"],
      previews: ["/images/products/product-11-bg-1.png", "/images/products/product-11-bg-1.png"],
    },
  },
  {
    title: "Hat",
    description:
      "Classic lightweight hat that adds style while helping protect from sun and light weather.",
    reviews: 4,
    detailPrice: 15.0,
    jomlaPrice: 10.5,
    category: "fashion",
    id: 12,
    imgs: {
      thumbnails: ["/images/products/product-12-bg-1.png", "/images/products/product-12-bg-1.png"],
      previews: ["/images/products/product-12-bg-1.png", "/images/products/product-12-bg-1.png"],
    },
  },
  {
    title: "Logitech G Pro X Headset",
    description:
      "Premium wired gaming headset with clear detachable mic, balanced surround sound, and comfortable memory-foam ear cushions for long competitive sessions.",
    reviews: 9,
    detailPrice: 130.0,
    jomlaPrice: 91.0,
    category: "health-sports",
    id: 13,
    imgs: {
      thumbnails: [
        "/images/products/product-13-headset-logitech.png",
        "/images/products/product-13-headset-logitech.png",
      ],
      previews: [
        "/images/products/product-13-headset-logitech.png",
        "/images/products/product-13-headset-logitech.png",
      ],
    },
  },
  {
    title: "HyperX Cloud II Headset",
    description:
      "Comfortable over-ear gaming headset with immersive audio, noise-reducing microphone, and durable build for daily gaming, calls, and multimedia use.",
    reviews: 12,
    detailPrice: 90.0,
    jomlaPrice: 63.0,
    category: "health-sports",
    id: 14,
    imgs: {
      thumbnails: [
        "/images/products/product-14-headset-hyperx.png",
        "/images/products/product-14-headset-hyperx.png",
      ],
      previews: [
        "/images/products/product-14-headset-hyperx.png",
        "/images/products/product-14-headset-hyperx.png",
      ],
    },
  },
];

export default shopData;
