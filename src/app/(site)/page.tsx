import Home from "@/components/Home";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vitrina Store",
  description: "Home page for Vitrina Store",
  // other metadata
};

export default function HomePage() {
  return (
    <>
      <Home />
    </>
  );
}
