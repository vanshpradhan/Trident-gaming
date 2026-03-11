import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Trophy, Star, Gift, Zap, Loader2, Lock } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface LoyaltyData {
  total_visits: number;
  total_xp: number;
  tier: string;
  active_boosters: number;
  rewards: any[];
  progress: {
    current: number;
    target: number;
    percentage: number;
  };
}

export function Loyalty() {
  const { isLoggedIn } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isLoggedIn) {
          const data = await api.loyalty.get();
          setLoyalty(data);
          setRewards(data.rewards || []);
        } else {
          const rewardsList = await api.loyalty.rewards();
          setRewards(rewardsList);
        }
      } catch (err) {
        // Fallback: try public rewards
        try {
          const rewardsList = await api.loyalty.rewards();
          setRewards(rewardsList);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isLoggedIn]);

  // Fallback values for logged-out state
  const currentVisits = loyalty?.total_visits ?? 0;
  const maxVisits = loyalty?.progress?.target ?? 10;
  const progress = loyalty?.progress?.percentage ?? 0;
  const tier = loyalty?.tier ?? "Bronze";
  const totalXp = loyalty?.total_xp ?? 0;
  const boosters = loyalty?.active_boosters ?? 0;

  const tierLevel = tier === "Elite" ? 4 : tier === "Gold" ? 3 : tier === "Silver" ? 2 : 1;

  if (loading) {
    return (
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </section>
    );
  }

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
          Trident <span className="text-primary">Rewards</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Play more, earn more. Level up your gaming experience with exclusive perks.
        </motion.p>
      </div>

      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="bg-zinc-900 border-2 border-white/10 p-10 relative overflow-hidden group clip-path-zentry transition-all duration-300 hover:border-primary"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -z-10 group-hover:bg-primary/20 transition-colors duration-500" />
          
          {!isLoggedIn ? (
            <div className="text-center py-12">
              <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-wider mb-4">Sign In to Track Rewards</h3>
              <p className="text-muted-foreground font-medium uppercase tracking-widest">Log in to see your loyalty progress, tier, and earned rewards.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-6 mb-12">
                <div className="w-20 h-20 bg-black border-2 border-primary flex items-center justify-center clip-path-zentry">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-3xl font-display font-black text-white uppercase tracking-wider">Level {tierLevel} Gamer</h3>
                  <p className="text-primary font-medium uppercase tracking-widest">{tier} Tier</p>
                </div>
              </div>

              <div className="mb-12">
                <div className="flex justify-between items-end mb-6">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Progress to Next Reward</span>
                  <span className="text-3xl font-display font-black text-white">{currentVisits} / {maxVisits} Visits</span>
                </div>
                
                <div className="h-6 w-full bg-black border-2 border-white/10 relative clip-path-zentry">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${progress}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                    className="h-full bg-primary relative"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_1s_linear_infinite]" />
                  </motion.div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <motion.div whileHover={{ y: -5 }} className="bg-black p-6 border-2 border-white/10 hover:border-secondary transition-colors clip-path-zentry">
                  <Star className="w-8 h-8 text-secondary mb-4" />
                  <div className="font-display font-black text-2xl text-white uppercase tracking-wider">{totalXp.toLocaleString()} XP</div>
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Total Earned</div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} className="bg-black p-6 border-2 border-white/10 hover:border-primary transition-colors clip-path-zentry">
                  <Zap className="w-8 h-8 text-primary mb-4" />
                  <div className="font-display font-black text-2xl text-white uppercase tracking-wider">{boosters} Active</div>
                  <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Boosters</div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="space-y-8"
        >
          {rewards.map((reward, i) => {
            const isUnlocked = reward.user_status === "unlocked" || reward.user_status === "redeemed";
            const isRedeemed = reward.user_status === "redeemed";
            const rewardProgress = isLoggedIn && loyalty
              ? Math.min(100, Math.round((currentVisits / reward.visits_required) * 100))
              : 0;
            const visitsRemaining = Math.max(0, reward.visits_required - currentVisits);

            return (
              <motion.div
                key={reward.id}
                whileHover={{ x: -10 }}
                className={`bg-zinc-900 p-8 border-l-4 relative overflow-hidden group cursor-pointer transition-all duration-300 hover:bg-black ${
                  isUnlocked ? "border-l-secondary" : "border-l-primary"
                }`}
              >
                <div className="flex items-start gap-6 relative z-10">
                  <div className={`w-16 h-16 bg-black border-2 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 clip-path-zentry ${
                    isUnlocked ? "border-secondary" : "border-primary"
                  }`}>
                    {isUnlocked ? (
                      <Gift className="w-8 h-8 text-secondary" />
                    ) : (
                      <Trophy className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-2xl font-display font-black text-white mb-2 transition-colors uppercase tracking-wider ${
                      isUnlocked ? "group-hover:text-secondary" : "group-hover:text-primary"
                    }`}>
                      {reward.name}
                    </h4>
                    <p className="text-muted-foreground mb-4 font-medium uppercase tracking-widest">{reward.description}</p>
                    
                    {isRedeemed ? (
                      <span className="inline-flex items-center px-4 py-1 bg-white/10 text-white/50 font-black text-xs uppercase tracking-widest clip-path-zentry">
                        Redeemed
                      </span>
                    ) : isUnlocked ? (
                      <span className="inline-flex items-center px-4 py-1 bg-secondary text-black font-black text-xs uppercase tracking-widest clip-path-zentry">
                        Unlocked
                      </span>
                    ) : isLoggedIn ? (
                      <>
                        <div className="w-full bg-black border-2 border-white/10 h-3 mb-3 overflow-hidden clip-path-zentry">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${rewardProgress}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                            className="bg-primary h-full"
                          />
                        </div>
                        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                          {visitsRemaining} visits remaining
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center px-4 py-1 bg-white/5 text-muted-foreground font-black text-xs uppercase tracking-widest clip-path-zentry">
                        {reward.visits_required} Visits Required
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
