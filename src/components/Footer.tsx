import { Gamepad2, Twitter, Instagram, Facebook, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

export function Footer() {
  return (
    <footer className="relative border-t-2 border-white/10 bg-black pt-24 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-8 group cursor-pointer">
              <motion.div 
                whileHover={{ rotate: 90, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="w-12 h-12 bg-transparent flex items-center justify-center overflow-hidden"
              >
                <img src="/logo.png" alt="Trident" className="w-10 h-10 object-contain" />
              </motion.div>
              <span className="font-display text-4xl font-black text-white tracking-tight uppercase group-hover:text-primary transition-colors">
                TRIDENT
              </span>
            </Link>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest leading-relaxed mb-8">
              The ultimate destination for gamers. High-end consoles, premium snacks, and an atmosphere built for champions.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Instagram, Facebook, Youtube].map((Icon, i) => (
                <motion.a
                  key={i}
                  href="#"
                  whileHover={{ scale: 1.1, y: -5 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-12 h-12 bg-zinc-900 border-2 border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black hover:border-primary transition-all duration-300 clip-path-zentry"
                >
                  <Icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-black text-white mb-8 uppercase tracking-widest text-xl">Quick Links</h4>
            <ul className="space-y-4">
              {[
                { name: "Book a Console", path: "/booking" },
                { name: "Explore Games", path: "/" },
                { name: "Snack Menu", path: "/snacks" },
                { name: "Loyalty Program", path: "/rewards" },
                { name: "Pricing", path: "/pricing" }
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium uppercase tracking-widest flex items-center gap-4 group">
                    <span className="w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-6" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-black text-white mb-8 uppercase tracking-widest text-xl">Support</h4>
            <ul className="space-y-4">
              {["FAQ", "Contact Us", "Terms of Service", "Privacy Policy", "Refund Policy"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium uppercase tracking-widest flex items-center gap-4 group">
                    <span className="w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-6" />
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-black text-white mb-8 uppercase tracking-widest text-xl">Newsletter</h4>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mb-6">
              Subscribe to get updates on new games, tournaments, and exclusive offers.
            </p>
            <form className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="ENTER YOUR EMAIL"
                className="bg-zinc-900 border-2 border-white/10 px-4 py-4 text-sm font-medium uppercase tracking-widest text-white focus:outline-none focus:border-primary w-full transition-all clip-path-zentry-reverse"
              />
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-primary text-black px-4 py-4 text-sm font-display font-black uppercase tracking-widest transition-colors hover:bg-white clip-path-zentry"
              >
                Join Now
              </motion.button>
            </form>
          </div>
        </div>

        <div className="border-t-2 border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
            © {new Date().getFullYear()} Trident Gaming Café. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-sm font-display font-black uppercase tracking-widest text-black bg-primary px-6 py-2 clip-path-zentry">
            <span className="w-2 h-2 bg-black animate-pulse" />
            Systems Online
          </div>
        </div>
      </div>
    </footer>
  );
}
