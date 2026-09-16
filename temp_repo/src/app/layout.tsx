import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Affeto Pães",
  description: "Produtos feitos com carinho, agora também na palma da mão.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
