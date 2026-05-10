import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { getLocale, getDictionary } from "@/lib/i18n/server";
import { htmlLang } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/client";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  return {
    title: dict.brand,
    description: dict.metaDescription,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dictionary = getDictionary(locale);

  return (
    <html lang={htmlLang(locale)}>
      <body className={`${inter.className} antialiased`}>
        <LocaleProvider locale={locale} dictionary={dictionary}>
          {children}
        </LocaleProvider>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
