import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Users, Gamepad2, CheckCircle2, Clock, Loader2, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useRefreshOn } from "../lib/useRealtimeUpdates";

interface IndividualConsole {
  id: string;
  name: string;
  type: string;
  image: string;
  status: string;
  players: string;
  features: string[];
}

export function Consoles() {
  const [consoles, setConsoles] = useState<IndividualConsole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConsoles = useCallback(() => {
    api.consoles.list()
      .then((data) => setConsoles(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadConsoles();
  }, [loadConsoles]);

  // Real-time: refresh when console status changes or sessions start/end
  useRefreshOn(loadConsoles, [
    "console:updated", "console:added", "console:removed",
    "session:ended", "session:started",
    "booking:created", "booking:cancelled",
  ]);

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-black">
      <div className="mb-16">
        <motion.h2
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-display font-black mb-4 uppercase tracking-tight text-white"
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
          {consoles.map((c, index) => {
            const isAvailable = c.status === "available";
            const isMaintenance = c.status === "maintenance";
            const isOccupied = c.status === "occupied";

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
                className={`bg-zinc-900 border-2 overflow-hidden relative group transition-all duration-300 ${
                  isAvailable
                    ? "border-white/10 hover:border-primary"
                    : isMaintenance
                    ? "border-white/10 hover:border-yellow-500"
                    : "border-white/10 hover:border-rose-500"
                }`}
              >
                <div className="relative h-64 overflow-hidden clip-path-zentry">
                  <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-transparent transition-colors duration-500" />
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  />
                  {/* Status badge */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-black border-2 border-white/10">
                    {isAvailable && (
                      <>
                        <span className="w-3 h-3 bg-primary animate-pulse" />
                        <span className="text-sm font-black text-primary uppercase tracking-widest">Available</span>
                      </>
                    )}
                    {isOccupied && (
                      <>
                        <span className="w-3 h-3 bg-rose-500" />
                        <span className="text-sm font-black text-rose-500 uppercase tracking-widest">In Use</span>
                      </>
                    )}
                    {isMaintenance && (
                      <>
                        <span className="w-3 h-3 bg-yellow-500" />
                        <span className="text-sm font-black text-yellow-500 uppercase tracking-widest">Maintenance</span>
                      </>
                    )}
                  </div>
                  {/* Console ID tag */}
                  <div className="absolute bottom-4 left-4 z-20 px-3 py-1 bg-black/80 border border-white/20">
                    <span className="text-xs font-display font-black text-white uppercase tracking-widest">{c.id}</span>
                  </div>
                </div>

                <div className="p-8 relative z-20">
                  <h3 className={`text-3xl font-display font-black mb-4 transition-colors uppercase tracking-wider ${
                    isAvailable ? "text-white group-hover:text-primary" :
                    isMaintenance ? "text-white group-hover:text-yellow-400" :
                    "text-white group-hover:text-rose-400"
                  }`}>{c.name}</h3>

                  <div className="flex items-center gap-6 mb-8 text-sm text-muted-foreground font-medium uppercase tracking-widest">
                    <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                      <Users className="w-5 h-5 text-primary" />
                      <span>{c.players}</span>
                    </div>
                    <div className="flex items-center gap-2 group-hover:text-white transition-colors">
                      <Gamepad2 className="w-5 h-5 text-secondary" />
                      <span>{c.type === "ps5" ? "PlayStation 5" : "PSVR 2"}</span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    {Array.isArray(c.features) && c.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 text-sm font-medium uppercase tracking-widest text-gray-300">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        {feature}
                      </div>
                    ))}
                  </div>

                  {isAvailable ? (
                    <Link
                      to="/booking"
                      className="w-full py-4 font-display font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 clip-path-zentry-reverse bg-primary text-black hover:bg-white border-2 border-transparent"
                    >
                      Book Now
                    </Link>
                  ) : isMaintenance ? (
                    <div className="w-full py-4 font-display font-black uppercase tracking-widest flex items-center justify-center gap-3 clip-path-zentry-reverse bg-transparent text-yellow-500/60 cursor-not-allowed border-2 border-yellow-500/20">
                      <Wrench className="w-5 h-5" />
                      Under Maintenance
                    </div>
                  ) : (
                    <div className="w-full py-4 font-display font-black uppercase tracking-widest flex items-center justify-center gap-3 clip-path-zentry-reverse bg-transparent text-white/30 cursor-not-allowed border-2 border-white/10">
                      <Clock className="w-5 h-5" />
                      Currently In Use
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
