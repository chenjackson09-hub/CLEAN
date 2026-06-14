import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LangProvider } from "@/context/LangContext";
import type { Lang } from "@/lib/lang";

export const metadata: Metadata = {
  title: "Clean",
  description: "Find verified cleaning professionals near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = (cookies().get("lang")?.value === "he" ? "he" : "en") as Lang;

  return (
    <html lang={lang} dir={lang === "he" ? "rtl" : "ltr"}>
      <body>
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
