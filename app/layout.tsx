import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sign2voice work – ASL Sign Language Recognition",
  description: "Real-time ASL sign language recognition with TensorFlow.js and MediaPipe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
