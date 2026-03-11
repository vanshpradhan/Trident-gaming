import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Star, Users, Gamepad2 } from "lucide-react";
import { api } from "../lib/api";

interface Game {
  id: number;
  title: string;
  image: string;
  genre: string;
  rating: string;
  players: string;
  display_order: number;
  active: boolean;
}

export function PopularGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.games.list()
      .then(setGames)
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-black">
      <div className="mb-16">
        <motion.h2
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-display font-black mb-4 uppercase tracking-tighter text-white"
        >
          Popular <span className="text-secondary">Games</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Our most played titles. Constantly updated with the latest releases.
        </motion.p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-900 border-2 border-white/10 animate-pulse">
              <div className="h-64 bg-zinc-800" />
              <div className="p-8 space-y-4">
                <div className="h-6 bg-zinc-800 w-3/4" />
                <div className="h-4 bg-zinc-800 w-1/2" />
                <div className="h-12 bg-zinc-800 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && games.length === 0 && (
        <div className="text-center py-24">
          <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-30" />
          <p className="text-muted-foreground uppercase tracking-widest font-medium text-sm">
            No games added yet — check back soon!
          </p>
        </div>
      )}

      {/* Games grid */}
      {!loading && games.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
              className="bg-zinc-900 border-2 border-white/10 group relative cursor-pointer overflow-hidden transition-all duration-300 hover:border-secondary"
            >
              <div className="relative h-64 overflow-hidden clip-path-zentry">
                <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-transparent transition-colors duration-500" />
                <img
                  src={game.image}
                  alt={game.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 px-3 py-1 bg-black border-2 border-primary text-primary text-sm font-bold uppercase tracking-wider">
                  <Star className="w-4 h-4 fill-current" />
                  {game.rating}
                </div>
              </div>

              <div className="p-8 relative z-20">
                <h3 className="text-3xl font-display font-black mb-4 text-white group-hover:text-secondary transition-colors uppercase tracking-wider">{game.title}</h3>

                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8 font-medium uppercase tracking-widest">
                  <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    <span>{game.genre}</span>
                  </div>
                  <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5 text-secondary" />
                    <span>{game.players}</span>
                  </div>
                </div>


              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
