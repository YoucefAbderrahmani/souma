import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Category from "@/components/Category";
import categories from "@/components/Home/Categories/categoryData";
import { getCatalogProducts } from "@/server/data-access/product-catalog";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  return {
    title: category
      ? `${category.title} | Vitrina Store`
      : "Category | Vitrina Store",
    description: category
      ? `Browse ${category.title} products`
      : "Browse products by category",
  };
}

const CategoryPage = async ({ params }: CategoryPageProps) => {
  const { slug } = await params;
  const categoryExists = categories.some((item) => item.slug === slug);

  if (!categoryExists) {
    notFound();
  }

  const products = await getCatalogProducts();

  return (
    <main>
      <Category slug={slug} products={products} />
    </main>
  );
};

export default CategoryPage;
