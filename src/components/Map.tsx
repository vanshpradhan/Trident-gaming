import { motion } from "motion/react";
import { MapPin, Navigation } from "lucide-react";

export function Map() {
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
          Find <span className="text-primary">Us</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Located in the heart of the city. Easy access, ample parking.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 50 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="bg-zinc-900 border-2 border-white/10 overflow-hidden relative h-[600px] group clip-path-zentry transition-all duration-300 hover:border-primary"
      >
        {/* Simulated Map Background */}
        <div className="absolute inset-0 bg-black opacity-80" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1600')] bg-cover bg-center mix-blend-overlay opacity-40 grayscale group-hover:scale-105 transition-transform duration-1000" />
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e4ff001a_1px,transparent_1px),linear-gradient(to_bottom,#e4ff001a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />

        {/* Animated Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="relative"
          >
            <MapPin className="w-16 h-16 text-primary drop-shadow-[0_0_15px_rgba(228,255,0,0.8)]" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-black/80 rounded-full blur-[2px]" />
          </motion.div>
          
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="mt-6 bg-black border-2 border-primary px-8 py-4 text-center cursor-pointer hover:bg-primary group/marker transition-colors clip-path-zentry"
          >
            <h3 className="font-display font-black text-white text-2xl uppercase tracking-wider group-hover/marker:text-black transition-colors">Trident Gaming Café</h3>
            <p className="text-sm font-medium uppercase tracking-widest text-primary group-hover/marker:text-black transition-colors">123 Neon Street, Cyber City</p>
          </motion.div>
        </div>

        {/* Radar Sweep Effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/20 pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-0 rounded-full border-t-4 border-primary/50 shadow-[0_0_30px_rgba(228,255,0,0.5)]"
            style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%)" }}
          />
        </div>

        {/* Floating Action Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute bottom-10 right-10 z-30 flex items-center gap-3 bg-primary text-black px-8 py-4 font-display font-black text-xl uppercase tracking-widest hover:bg-white transition-colors clip-path-zentry-reverse"
        >
          <Navigation className="w-6 h-6" />
          Get Directions
        </motion.button>
      </motion.div>
    </section>
  );
}
