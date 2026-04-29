import React from "react";
import BlogDetailsWithSidebar from "@/components/BlogDetailsWithSidebar";

import { Metadata } from "next";
export const metadata: Metadata = {
  title: "Blog Details Page | Vitrina Store Nextjs E-commerce",
  description: "This is Blog Details Page for Vitrina Store",
  // other metadata
};

const BlogDetailsWithSidebarPage = () => {
  return (
    <main>
      <BlogDetailsWithSidebar />
    </main>
  );
};

export default BlogDetailsWithSidebarPage;
