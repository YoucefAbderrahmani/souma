import { notFound } from "next/navigation";

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  notFound();
  return children;
}
