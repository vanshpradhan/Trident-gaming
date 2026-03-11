import { motion, useScroll, useTransform } from "motion/react";
import { ChevronDown, Gamepad2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";

export function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Scale the video container up as we scroll down
  const scaleVideo = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const clipPathVideo = useTransform(
    scrollYProgress,
    [0, 0.5],
    [
      "polygon(20% 0%, 80% 0%, 100% 80%, 80% 100%, 0% 100%)",
      "polygon(0% 0%, 100% 0%, 100% 100%, 100% 100%, 0% 100%)"
    ]
  );
  
  return (
    <section ref={ref} className="relative min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center">
      
      {/* Massive Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h1 className="text-[25vw] font-display font-black text-white/5 leading-none tracking-tighter uppercase whitespace-nowrap">
          TRIDENT
        </h1>
      </div>

      {/* Clipped Video/Image Container */}
      <motion.div 
        style={{ scale: scaleVideo, clipPath: clipPathVideo }}
        className="absolute inset-0 z-10 bg-zinc-900"
      >
        <img 
          src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2000" 
          alt="Gaming"
          className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
      </motion.div>

      {/* Foreground Content */}
      <div className="relative z-20 container mx-auto px-4 flex flex-col items-center justify-center h-full text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 inline-flex items-center rounded-none border border-primary bg-black/50 px-4 py-2 text-sm font-bold text-primary uppercase tracking-widest backdrop-blur-md"
        >
          <span className="relative flex h-2 w-2 mr-3">
            <span className="animate-ping absolute inline-flex h-full w-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 bg-primary"></span>
          </span>
          Enter the Metagame
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="mb-6 text-6xl md:text-8xl lg:text-[10rem] font-display font-black tracking-tighter uppercase leading-[0.85] text-white mix-blend-difference"
        >
          TRIDENT<br/>
          <span className="text-primary">GAMING</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12"
        >
          <Link to="/booking" className="group relative inline-flex items-center justify-center overflow-hidden bg-primary px-10 py-5 font-display text-xl font-black text-black uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:bg-white clip-path-zentry">
            <span className="relative z-10 flex items-center">
              <Gamepad2 className="mr-3 h-6 w-6" />
              Book a Console
            </span>
          </Link>
          
          <Link to="/consoles" className="group relative inline-flex items-center justify-center overflow-hidden border-2 border-white bg-transparent px-10 py-5 font-display text-xl font-black text-white uppercase tracking-wider transition-all duration-300 hover:bg-white hover:text-black clip-path-zentry-reverse">
            <span className="relative z-10">Explore Consoles</span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-20"
      >
        <ChevronDown className="h-10 w-10 text-primary" />
      </motion.div>
    </section>
  );
}
