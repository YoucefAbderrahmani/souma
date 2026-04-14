import Home from "@/components/Home";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Souma Store | Nextjs E-commerce",
  description: "Home page for Souma Store",
  // other metadata
};

export default function HomePage() {
  return (
    <>
      <Home />
    </>
  );
}
