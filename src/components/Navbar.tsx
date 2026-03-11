import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Gamepad2, LogOut, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AuthModal } from "./AuthModal";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const allNavLinks = [
    { name: "Home", href: "/", public: true },
    { name: "Consoles", href: "/consoles", public: true },
    { name: "Booking", href: "/booking", public: false, customerOnly: true },
    { name: "Snacks", href: "/snacks", public: false, customerOnly: true },
    { name: "Pricing", href: "/pricing", public: true },
    { name: "Rewards", href: "/rewards", public: false, customerOnly: true },
  ];

  // Admin sees only public pages; customers and guests see everything
  const navLinks = allNavLinks.filter((link) => {
    if (isAdmin) return link.public;
    return true;
  });

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-black/90 backdrop-blur-lg border-b-2 border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center gap-3 cursor-pointer group">
              <motion.div 
                whileHover={{ rotate: 90, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="w-12 h-12 bg-transparent flex items-center justify-center overflow-hidden"
              >
                <img src="/logo.png" alt="Trident" className="w-10 h-10 object-contain" />
              </motion.div>
              <span className="font-display text-4xl font-black text-white tracking-tight uppercase group-hover:text-primary transition-colors duration-300">
                TRIDENT
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`text-sm font-display font-black uppercase tracking-widest transition-colors relative group ${
                      isActive ? "text-primary" : "text-white hover:text-primary"
                    }`}
                  >
                    {link.name}
                    <span className={`absolute -bottom-2 left-0 h-1 bg-primary transition-all duration-300 ${
                      isActive ? "w-full" : "w-0 group-hover:w-full"
                    }`} />
                  </Link>
                );
              })}

              {isLoggedIn ? (
                <div className="flex items-center gap-4">
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 text-sm font-display font-black uppercase tracking-widest text-secondary hover:text-white transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Admin
                    </Link>
                  )}
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest">
                    {user?.name}
                  </span>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={logout}
                    className="flex items-center gap-2 bg-transparent text-white px-6 py-3 font-display font-black uppercase tracking-widest border-2 border-white/20 transition-all duration-300 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 clip-path-zentry"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </motion.button>
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAuth(true)}
                  className="bg-white text-black px-8 py-3 font-display font-black uppercase tracking-widest border-2 border-transparent transition-all duration-300 hover:bg-transparent hover:text-white hover:border-white clip-path-zentry"
                >
                  Sign In
                </motion.button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-primary p-2"
              >
                {isMobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="md:hidden bg-black border-b-2 border-white/10 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-1 flex flex-col">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      to={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-5 text-xl font-display font-black uppercase tracking-widest transition-colors ${
                        isActive
                          ? "text-black bg-primary"
                          : "text-white hover:text-primary hover:bg-white/5"
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
                {isLoggedIn ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-4 py-5 text-xl font-display font-black uppercase tracking-widest text-secondary hover:bg-white/5"
                      >
                        Admin Dashboard
                      </Link>
                    )}
                    <div className="px-4 py-3 text-sm text-muted-foreground font-medium uppercase tracking-widest">
                      Signed in as {user?.name}
                    </div>
                    <button
                      onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                      className="mt-2 w-full bg-transparent text-red-400 border-2 border-red-500/30 px-5 py-4 font-display font-black uppercase tracking-widest clip-path-zentry"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowAuth(true); setIsMobileMenuOpen(false); }}
                    className="mt-6 w-full bg-white text-black px-5 py-4 font-display font-black uppercase tracking-widest clip-path-zentry"
                  >
                    Sign In
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
