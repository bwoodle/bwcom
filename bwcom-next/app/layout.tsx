import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@cloudscape-design/global-styles/index.css";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import Providers from "../components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "~/brentwoodle",
  description: "Brent Woodle's personal website and blog.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <NavBar />
          <main>{children}</main>
        </Providers>
        <Footer />
      </body>
    </html>
  );
}
