import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cymatics Visualizer — Sound into Sacred Geometry",
  description:
    "Real-time cymatics simulator. Generate Chladni patterns from tone frequencies, microphone input, or audio files. Watch sound become geometry.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
