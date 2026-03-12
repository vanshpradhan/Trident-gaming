import { motion } from "motion/react";
import { Navigation } from "lucide-react";

const MAPS_LINK = "https://maps.app.goo.gl/bzqTrj3nb6rSU1g88";

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
          KB Pradhan Plaza, NS Road, Jaigaon — easy access, ample parking.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 50 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative overflow-hidden border-2 border-white/10 hover:border-primary transition-colors duration-300 group"
      >
        {/* Clickable map image */}
        <a
          href={MAPS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative cursor-pointer"
        >
          <img
            src="/map-preview.png"
            alt="Trident Gaming Café location map"
            className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
            style={{ display: "block" }}
          />

          {/* Dark hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />

          {/* Centre label that appears on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-primary text-black font-display font-black text-xl uppercase tracking-widest px-8 py-4 flex items-center gap-3 shadow-[0_0_40px_rgba(228,255,0,0.6)]">
              <Navigation className="w-5 h-5" />
              Open in Google Maps
            </div>
          </div>
        </a>

        {/* Always-visible Get Directions button */}
        <div className="absolute bottom-6 right-6 z-10">
          <motion.a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3 bg-primary text-black px-8 py-4 font-display font-black text-lg uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_30px_rgba(228,255,0,0.4)]"
          >
            <Navigation className="w-5 h-5" />
            Get Directions
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}
