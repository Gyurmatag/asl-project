import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sign2voice work – ASL jelnyelv felismerés",
  description: "ASL jelnyelv felismerés valós időben, TensorFlow.js és MediaPipe segítségével",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>
        {children}
      </body>
    </html>
  );
}
