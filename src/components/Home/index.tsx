import React from "react";
import type { Product } from "@/types/product";
import Hero from "./Hero";
import Categories from "./Categories";
import NewArrival from "./NewArrivals";
import PromoBanner from "./PromoBanner";
import BestSeller from "./BestSeller";
import CounDown from "./Countdown";
import Testimonials from "./Testimonials";
import Newsletter from "../Common/Newsletter";

const Home = ({ products }: { products: Product[] }) => {
  return (
    <main className="min-w-0">
      <Hero products={products} />
      <Categories />
      <NewArrival products={products} />
      <PromoBanner />
      <BestSeller products={products} />
      <CounDown />
      <Testimonials />
      <Newsletter />
    </main>
  );
};

export default Home;
