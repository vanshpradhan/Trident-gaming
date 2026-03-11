import { motion } from "motion/react";
import { Star, Users, Gamepad2 } from "lucide-react";

const games = [
  {
    id: 1,
    title: "Grand Theft Auto V",
    image: "https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&q=80&w=800",
    genre: "Open World",
    rating: "4.9",
    players: "1-30",
  },
  {
    id: 2,
    title: "Cyberpunk 2077",
    image: "https://images.unsplash.com/photo-1605648916361-9bc12ad6a569?auto=format&fit=crop&q=80&w=800",
    genre: "RPG",
    rating: "4.8",
    players: "1",
  },
  {
    id: 3,
    title: "Spider-Man 2",
    image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&q=80&w=800",
    genre: "Action",
    rating: "4.9",
    players: "1",
  },
  {
    id: 4,
    title: "EA Sports FC 24",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800",
    genre: "Sports",
    rating: "4.7",
    players: "1-4",
  },
  {
    id: 5,
    title: "Call of Duty: MW III",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800",
    genre: "FPS",
    rating: "4.6",
    players: "1-64",
  },
  {
    id: 6,
    title: "Tekken 8",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800",
    genre: "Fighting",
    rating: "4.8",
    players: "1-2",
  },
];

export function PopularGames() {
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
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 border-2 border-white/10 bg-transparent text-white font-display font-black uppercase tracking-widest group-hover:bg-secondary group-hover:text-black group-hover:border-secondary transition-all duration-300 clip-path-zentry-reverse"
              >
                View Details
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
