import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({ variable: "--font-display", weight: "400", subsets: ["latin"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "500", "600"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Radar Gamer BR",
  description: "Contagem regressiva para os próximos grandes lançamentos de games.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Radar Gamer BR — O próximo jogo começa aqui",
    description: "Datas oficiais, countdown ao vivo e links prontos para mandar pro seu duo.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/og.png", width: 1728, height: 910, alt: "Radar Gamer BR — contagem regressiva ao vivo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Radar Gamer BR",
    description: "Quanto falta para o próximo grande lançamento?",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${display.variable} ${mono.variable}`}>{children}</body></html>;
}
