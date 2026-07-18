import type { Metadata } from "next";
import { RadarClient } from "./RadarClient";

export const metadata: Metadata = {
  title: "Radar Gamer BR — contagem regressiva para os próximos jogos",
  description:
    "Acompanhe os próximos grandes lançamentos de games, filtre por plataforma e compartilhe a contagem regressiva com seu duo.",
};

export default function Home() {
  return <RadarClient />;
}
