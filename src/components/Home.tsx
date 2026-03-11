import { Hero } from "./Hero";
import { SectionCards } from "./SectionCards";
import { PopularGames } from "./PopularGames";
import { Marquee } from "./Marquee";

export function Home() {
  return (
    <div className="flex flex-col">
      <Hero />
      <Marquee />
      <SectionCards />
      <PopularGames />
    </div>
  );
}
