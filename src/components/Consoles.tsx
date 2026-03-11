import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Users, Gamepad2, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useRefreshOn } from "../lib/useRealtimeUpdates";

interface ConsoleGroup {
  id: string;
  name: string;
  type: string;
  image: string;
  status: string;
  players: string;
  features: string[];
  total: number;
  available: number;
  occupied: number;
}

export function Consoles() {
  const [consoles, setConsoles] = useState<ConsoleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConsoles = useCallback(() => {
    api.consoles.grouped()
      .then(setConsoles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConsoles();
  }, [loadConsoles]);

  // Real-time: refresh when console status changes or consoles are added/removed
  useRefreshOn(loadConsoles, ["console:updated", "console:added", "console:removed", "session:ended", "booking:created", "booking:cancelled"]);

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
          Console <span className="text-primary">Availability</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Real-time status of our high-end gaming rigs. Book your slot before someone else does.
        </motion.p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {consoles.map((consoleItem, index) => (
            <motion.div
              key={consoleItem.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
              className={`bg-zinc-900 border-2 border-white/10 overflow-hidden relative group transition-all duration-300 ${
                consoleItem.available > 0 ? "hover:border-primary" : "hover:border-rose-500"
              }`}
            >
              <div className="relative h-64 overflow-hidden clip-path-zentry">
                <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-transparent transition-colors duration-500" />
                <img
                  src={consoleItem.image}
                  alt={consoleItem.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-black border-2 border-white/10">
                  {consoleItem.available > 0 ? (
                    <>
                      <span className="w-3 h-3 bg-primary animate-pulse" />
                      <span className="text-sm font-black text-primary uppercase tracking-widest">{consoleItem.available} Available</span>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 bg-rose-500" />
                      <span className="text-sm font-black text-rose-500 uppercase tracking-widest">All Occupied</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8 relative z-20">
                <h3 className="text-3xl font-display font-black mb-4 text-white group-hover:text-primary transition-colors uppercase tracking-wider">{consoleItem.name}</h3>
                
                <div className="flex items-center gap-6 mb-8 text-sm text-muted-foreground font-medium uppercase tracking-widest">
                  <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5 text-primary" />
                    <span>{consoleItem.players}</span>
                  </div>
                  <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                    <Gamepad2 className="w-5 h-5 text-secondary" />
                    <span>{consoleItem.total} Units</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {consoleItem.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm font-medium uppercase tracking-widest text-gray-300">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  to={consoleItem.available > 0 ? "/booking" : "#"}
                  className={`w-full py-4 font-display font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 clip-path-zentry-reverse ${
                    consoleItem.available > 0
                      ? "bg-primary text-black hover:bg-white border-2 border-transparent"
                      : "bg-transparent text-white/30 cursor-not-allowed border-2 border-white/10"
                  }`}
                >
                  {consoleItem.available > 0 ? (
                    "Book Now"
                  ) : (
                    <>
                      <Clock className="w-5 h-5" />
                      Waitlist
                    </>
                  )}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
