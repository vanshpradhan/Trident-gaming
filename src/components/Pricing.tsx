import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Check, Gamepad2, Zap, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useRefreshOn } from "../lib/useRealtimeUpdates";

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
  console_type: string;
  popular: boolean;
  color: string;
}

const iconMap: Record<string, React.ReactNode> = {
  primary: <Gamepad2 className="w-8 h-8 text-black" />,
  secondary: <Zap className="w-8 h-8 text-black" />,
  white: <Gamepad2 className="w-8 h-8 text-black" />,
};

export function Pricing() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPricing = useCallback(() => {
    api.pricing.list()
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  // Real-time: refresh when admin changes pricing
  useRefreshOn(loadPricing, ["pricing:added", "pricing:updated", "pricing:removed"]);

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
          Transparent <span className="text-primary">Pricing</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          No hidden fees. Just pure gaming. Add extra players for ₹50/hr.
        </motion.p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, type: "spring", stiffness: 100, damping: 20 }}
              className={`bg-zinc-900 border-2 p-8 relative overflow-hidden group transition-all duration-300 clip-path-zentry ${
                plan.popular ? "border-primary" : "border-white/10 hover:border-secondary"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-black text-sm font-black px-6 py-2 uppercase tracking-widest clip-path-zentry">
                  Most Popular
                </div>
              )}
              
              <div className={`w-16 h-16 flex items-center justify-center mb-8 bg-${plan.color} clip-path-zentry group-hover:scale-110 transition-transform duration-300`}>
                {iconMap[plan.color] || <Gamepad2 className="w-8 h-8 text-black" />}
              </div>
              
              <h3 className={`text-4xl font-display font-black mb-4 uppercase tracking-wider transition-colors ${plan.popular ? "text-primary" : "text-white group-hover:text-secondary"}`}>{plan.name}</h3>
              <p className="text-muted-foreground mb-8 h-16 font-medium uppercase tracking-widest">{plan.description}</p>
              
              <div className="mb-10 flex items-baseline gap-2">
                <span className="text-6xl font-display font-black text-white">₹{plan.price}</span>
                <span className="text-muted-foreground font-medium uppercase tracking-widest">/ {plan.duration}</span>
              </div>
              
              <ul className="space-y-6 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-4 text-gray-300 font-medium uppercase tracking-widest">
                    <Check className={`w-6 h-6 text-${plan.color}`} />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <Link to="/booking">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-5 font-display font-black text-xl uppercase tracking-widest transition-all duration-300 clip-path-zentry-reverse ${
                    plan.popular
                      ? "bg-primary text-black hover:bg-white"
                      : "bg-transparent text-white border-2 border-white/10 hover:bg-secondary hover:text-black hover:border-secondary"
                  }`}
                >
                  Choose Plan
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
