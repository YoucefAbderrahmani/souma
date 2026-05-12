import "../css/euclid-circular-a-font.css";
import "../css/style.css";
import { RootAppShell } from "@/components/Layout/RootAppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <title>Vitrina Store</title>
        <meta name="description" content="Vitrina Store ecommerce website" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body suppressHydrationWarning={true}>
        <RootAppShell>{children}</RootAppShell>
      </body>
    </html>
  );
}
