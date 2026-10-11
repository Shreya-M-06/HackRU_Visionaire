import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. Customized title header properties for HackRU
export const metadata = {
  title: "Visionaire Canvas AI",
  description: "HackRU Interactive On-Device Gesture Concept Map",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      {/* 2. Lock screen sizing boundaries to match the infinite mapping surface constraints */}
      <body className={`${geistSans.variable} ${geistMono.variable} h-screen w-screen overflow-hidden bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
