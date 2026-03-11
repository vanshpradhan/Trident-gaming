import { motion } from "motion/react";

export function Marquee() {
  return (
    <div className="relative w-full overflow-hidden bg-primary py-4 -rotate-2 scale-110 z-20">
      <div className="flex whitespace-nowrap">
        <motion.div
          className="flex gap-8 text-black font-display font-black text-4xl uppercase tracking-wide"
          animate={{ x: [0, -1035] }}
          transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
        >
          <span>LEVEL UP YOUR GAME</span>
          <span>•</span>
          <span>TRIDENT GAMING CAFE</span>
          <span>•</span>
          <span>NEXT-GEN CONSOLES</span>
          <span>•</span>
          <span>PREMIUM SNACKS</span>
          <span>•</span>
          <span>LEVEL UP YOUR GAME</span>
          <span>•</span>
          <span>TRIDENT GAMING CAFE</span>
          <span>•</span>
          <span>NEXT-GEN CONSOLES</span>
          <span>•</span>
          <span>PREMIUM SNACKS</span>
          <span>•</span>
        </motion.div>
      </div>
    </div>
  );
}
