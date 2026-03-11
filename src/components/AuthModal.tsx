import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mail, Lock, User, Phone } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useNavigate } from "react-router-dom";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password, phone || undefined);
      }
      // Check if the logged-in user is an admin to redirect
      const stored = localStorage.getItem("trident_user");
      const userData = stored ? JSON.parse(stored) : null;
      onClose();
      setEmail("");
      setPassword("");
      setName("");
      setPhone("");
      if (userData?.role === "admin") {
        navigate("/admin");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-zinc-900 border-2 border-white/10 w-full max-w-md relative clip-path-zentry overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[80px]" />
              
              <div className="p-8 border-b-2 border-white/10 flex items-center justify-between relative z-10">
                <h2 className="text-3xl font-display font-black uppercase tracking-wider text-white">
                  {mode === "login" ? "Sign In" : "Create Account"}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 text-white hover:text-primary transition-colors"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border-2 border-red-500/30 p-4 text-red-400 text-sm font-medium uppercase tracking-widest"
                  >
                    {error}
                  </motion.div>
                )}

                {mode === "register" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-black border-2 border-white/10 pl-12 pr-4 py-4 text-white font-medium uppercase tracking-wider focus:outline-none focus:border-primary transition-colors clip-path-zentry"
                        placeholder="Your name"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-black border-2 border-white/10 pl-12 pr-4 py-4 text-white font-medium uppercase tracking-wider focus:outline-none focus:border-primary transition-colors clip-path-zentry"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-black border-2 border-white/10 pl-12 pr-4 py-4 text-white font-medium uppercase tracking-wider focus:outline-none focus:border-primary transition-colors clip-path-zentry"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>

                {mode === "register" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Phone (optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-black border-2 border-white/10 pl-12 pr-4 py-4 text-white font-medium uppercase tracking-wider focus:outline-none focus:border-primary transition-colors clip-path-zentry"
                        placeholder="+91-9876543210"
                      />
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-primary text-black font-display font-black text-xl uppercase tracking-widest transition-all duration-300 hover:bg-white clip-path-zentry-reverse disabled:opacity-50"
                >
                  {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
                </motion.button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                    className="text-sm font-medium uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                  >
                    {mode === "login" ? "Don't have an account? Register" : "Already have an account? Sign In"}
                  </button>
                </div>

              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
