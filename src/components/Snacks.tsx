import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Plus, Minus, X, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useRefreshOn } from "../lib/useRealtimeUpdates";

interface Snack {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
}

export function Snacks() {
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ id: number; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const { isLoggedIn, isAdmin } = useAuth();

  const loadSnacks = useCallback(() => {
    api.snacks.list()
      .then(setSnacks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSnacks();
  }, [loadSnacks]);

  // Real-time: refresh when admin adds/updates/removes snacks
  useRefreshOn(loadSnacks, ["snack:added", "snack:updated", "snack:removed"]);

  const addToCart = (id: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing?.quantity === 1) {
        return prev.filter((item) => item.id !== id);
      }
      return prev.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity - 1 } : item
      );
    });
  };

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      alert("Please sign in to place an order");
      return;
    }
    if (isAdmin) {
      alert("Admin accounts cannot place orders. Please use a customer account.");
      return;
    }
    setOrdering(true);
    try {
      await api.orders.create({
        items: cart.map((item) => ({ id: item.id, quantity: item.quantity })),
      });
      setCart([]);
      setOrderSuccess(true);
      setTimeout(() => {
        setOrderSuccess(false);
        setIsCartOpen(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || "Order failed");
    } finally {
      setOrdering(false);
    }
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => {
    const snack = snacks.find((s) => s.id === item.id);
    return acc + (snack?.price || 0) * item.quantity;
  }, 0);

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
          Fuel Your <span className="text-secondary">Session</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Order snacks and drinks directly to your console. Never pause the action.
        </motion.p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-secondary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {snacks.map((snack, index) => (
            <motion.div
              key={snack.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
              className="bg-zinc-900 border-2 border-white/10 group relative transition-all duration-300 hover:border-secondary"
            >
              <div className="h-48 overflow-hidden relative clip-path-zentry">
                <img
                  src={snack.image}
                  alt={snack.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-transparent transition-colors duration-500" />
                <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-black/80 border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-secondary">{snack.category}</span>
                </div>
              </div>
              <div className="p-6 relative z-10">
                <h3 className="font-display font-black text-2xl mb-2 text-white group-hover:text-secondary transition-colors uppercase tracking-wider">{snack.name}</h3>
                <div className="flex items-center justify-between mt-6">
                  <span className="text-2xl font-black text-primary">₹{snack.price}</span>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addToCart(snack.id)}
                    className="w-12 h-12 bg-black border-2 border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-black transition-all duration-300 clip-path-zentry"
                  >
                    <Plus className="w-6 h-6" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Cart Button */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-8 right-8 z-40 w-20 h-20 bg-primary text-black flex items-center justify-center transition-transform duration-300 clip-path-zentry"
          >
            <ShoppingCart className="w-8 h-8" />
            <motion.span 
              key={totalItems}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-black text-primary text-sm font-black flex items-center justify-center border-2 border-primary"
            >
              {totalItems}
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-black border-l-2 border-white/10 z-50 flex flex-col"
            >
              <div className="p-8 border-b-2 border-white/10 flex items-center justify-between bg-zinc-900">
                <h2 className="text-3xl font-display font-black uppercase tracking-widest flex items-center gap-4 text-white">
                  <ShoppingCart className="w-8 h-8 text-primary" />
                  Your Cart
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-white hover:text-primary transition-colors"
                >
                  <X className="w-8 h-8" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {orderSuccess ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center mt-20"
                  >
                    <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-6" />
                    <p className="font-display font-black text-2xl text-white uppercase tracking-wider">Order Placed!</p>
                    <p className="text-muted-foreground uppercase tracking-widest mt-2">Preparing your order...</p>
                  </motion.div>
                ) : cart.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-muted-foreground mt-20"
                  >
                    <ShoppingCart className="w-20 h-20 mx-auto mb-6 opacity-20" />
                    <p className="font-medium uppercase tracking-widest">Your cart is empty.</p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {cart.map((item) => {
                      const snack = snacks.find((s) => s.id === item.id)!;
                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9, x: 50 }}
                          key={item.id}
                          className="flex items-center gap-6 bg-zinc-900 p-4 border-2 border-white/10 clip-path-zentry"
                        >
                          <img
                            src={snack.image}
                            alt={snack.name}
                            className="w-20 h-20 object-cover grayscale"
                          />
                          <div className="flex-1">
                            <h4 className="font-display font-black uppercase tracking-wider text-white">{snack.name}</h4>
                            <p className="text-primary font-black mt-1">₹{snack.price}</p>
                          </div>
                          <div className="flex items-center gap-4 bg-black border-2 border-white/10 p-2">
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeFromCart(item.id)}
                              className="p-1 text-white hover:text-primary"
                            >
                              <Minus className="w-5 h-5" />
                            </motion.button>
                            <span className="w-6 text-center font-black text-white">{item.quantity}</span>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => addToCart(item.id)}
                              className="p-1 text-white hover:text-primary"
                            >
                              <Plus className="w-5 h-5" />
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>

              {cart.length > 0 && !orderSuccess && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="p-8 border-t-2 border-white/10 bg-zinc-900"
                >
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-xl font-medium uppercase tracking-widest text-muted-foreground">Total</span>
                    <span className="text-4xl font-display font-black text-primary">₹{totalPrice}</span>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCheckout}
                    disabled={ordering}
                    className="w-full py-5 bg-primary text-black font-display font-black text-xl uppercase tracking-widest transition-all duration-300 hover:bg-white clip-path-zentry-reverse disabled:opacity-50"
                  >
                    {ordering ? "Placing Order..." : "Checkout Order"}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
