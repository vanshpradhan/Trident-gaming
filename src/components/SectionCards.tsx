import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Gamepad2, Calendar, Coffee, Tag, Trophy, MapPin } from "lucide-react";

const sections = [
  { title: "Consoles", path: "/consoles", icon: <Gamepad2 className="w-8 h-8"/>, desc: "View available gaming rigs", color: "text-primary" },
  { title: "Booking", path: "/booking", icon: <Calendar className="w-8 h-8"/>, desc: "Reserve your slot", color: "text-secondary" },
  { title: "Snacks", path: "/snacks", icon: <Coffee className="w-8 h-8"/>, desc: "Order food & drinks", color: "text-primary" },
  { title: "Pricing", path: "/pricing", icon: <Tag className="w-8 h-8"/>, desc: "Check our rates", color: "text-secondary" },
  { title: "Rewards", path: "/rewards", icon: <Trophy className="w-8 h-8"/>, desc: "Loyalty program", color: "text-primary" },
  { title: "Location", path: "/map", icon: <MapPin className="w-8 h-8"/>, desc: "Find us", color: "text-secondary" },
];

export function SectionCards() {
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
          Explore <span className="text-primary">Trident</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Navigate through our premium services and facilities.
        </motion.p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sections.map((section, index) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
            className="h-full"
          >
            <Link to={section.path} className="block h-full bg-zinc-900 border-2 border-white/10 p-8 transition-all duration-300 hover:border-primary hover:bg-primary group relative overflow-hidden clip-path-zentry">
              
              <div className={`relative z-10 w-16 h-16 bg-black flex items-center justify-center mb-8 group-hover:bg-black transition-colors duration-300 ${section.color}`}>
                {section.icon}
              </div>
              <h3 className="relative z-10 text-3xl font-display font-black text-white mb-2 group-hover:text-black transition-colors uppercase tracking-wider flex items-center justify-between">
                {section.title}
                <motion.span 
                  className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-black"
                >
                  →
                </motion.span>
              </h3>
              <p className="relative z-10 text-muted-foreground group-hover:text-black/80 transition-colors font-medium uppercase tracking-widest text-sm">{section.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
