import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Trophy, Star, Gift, Zap, Loader2, Lock, Crown, Award } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useRefreshOn } from "../lib/useRealtimeUpdates";

interface LoyaltyData {
  total_visits: number;
  total_xp: number;
  tier: string;
  stars: number;
  active_boosters: number;
  rewards: any[];
  progress: {
    current: number;
    target: number;
    percentage: number;
    next_tier_at: number;
  };
}

interface LeaderboardEntry {
  name: string;
  total_visits: number;
  tier: string;
  stars: number;
  total_xp: number;
}

const TIERS = [
  { name: "Bronze", minVisits: 0, color: "text-amber-600", bg: "bg-amber-600", border: "border-amber-600" },
  { name: "Silver", minVisits: 20, color: "text-gray-300", bg: "bg-gray-300", border: "border-gray-300" },
  { name: "Gold", minVisits: 30, color: "text-yellow-400", bg: "bg-yellow-400", border: "border-yellow-400" },
  { name: "Platinum", minVisits: 40, color: "text-cyan-300", bg: "bg-cyan-300", border: "border-cyan-300" },
  { name: "Diamond", minVisits: 50, color: "text-blue-400", bg: "bg-blue-400", border: "border-blue-400" },
  { name: "Trident's Hero", minVisits: 60, color: "text-primary", bg: "bg-primary", border: "border-primary" },
];

function getTierInfo(tierName: string) {
  return TIERS.find(t => t.name === tierName) || TIERS[0];
}

function getTierIndex(tierName: string) {
  const idx = TIERS.findIndex(t => t.name === tierName);
  return idx >= 0 ? idx : 0;
}

export function Loyalty() {
  const { isLoggedIn } = useAuth();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const boardData = await api.loyalty.leaderboard();
      setLeaderboard(boardData);
      if (isLoggedIn) {
        const data = await api.loyalty.get();
        setLoyalty(data);
        setRewards(data.rewards || []);
      } else {
        const rewardsList = await api.loyalty.rewards();
        setRewards(rewardsList);
      }
    } catch (err) {
      try {
        const rewardsList = await api.loyalty.rewards();
        setRewards(rewardsList);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { loadData(); }, [loadData]);

  useRefreshOn(loadData, ["loyalty:updated", "booking:created"]);

  const currentVisits = loyalty?.total_visits ?? 0;
  const progress = loyalty?.progress?.percentage ?? 0;
  const progressCurrent = loyalty?.progress?.current ?? 0;
  const tier = loyalty?.tier ?? "Bronze";
  const stars = loyalty?.stars ?? 0;
  const totalXp = loyalty?.total_xp ?? 0;
  const tierInfo = getTierInfo(tier);
  const tierIndex = getTierIndex(tier);

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

      <div className="grid lg:grid-cols-2 gap-16">
        {/* Left Column: Player Card + Tier Progress */}
        <div className="space-y-8">
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
                  <div className={`w-20 h-20 bg-black border-2 ${tierInfo.border} flex items-center justify-center clip-path-zentry`}>
                    <Trophy className={`w-10 h-10 ${tierInfo.color}`} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-display font-black text-white uppercase tracking-wider">
                      {tier}
                      {stars > 0 && (
                        <span className="ml-3 text-primary">
                          {"⭐".repeat(stars)}
                        </span>
                      )}
                    </h3>
                    <p className={`${tierInfo.color} font-medium uppercase tracking-widest`}>
                      {currentVisits} Total Visits
                    </p>
                  </div>
                </div>

                <div className="mb-12">
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Progress to Next Tier</span>
                    <span className="text-3xl font-display font-black text-white">{progressCurrent} / 10 Visits</span>
                  </div>
                  
                  <div className="h-6 w-full bg-black border-2 border-white/10 relative clip-path-zentry">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                      className={`h-full ${tierInfo.bg} relative`}
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
                    <Crown className="w-8 h-8 text-primary mb-4" />
                    <div className="font-display font-black text-2xl text-white uppercase tracking-wider">
                      Tier {tierIndex + 1} / 6
                    </div>
                    <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Current Level</div>
                  </motion.div>
                </div>
              </>
            )}
          </motion.div>

          {/* Tier Progression Visual */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="bg-zinc-900 border-2 border-white/10 p-8 clip-path-zentry"
          >
            <h3 className="text-2xl font-display font-black mb-6 flex items-center gap-4 text-white uppercase tracking-wider">
              <Award className="w-8 h-8 text-secondary" />
              Tier Progression
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {TIERS.map((t, i) => {
                const isActive = i <= tierIndex && isLoggedIn;
                const isCurrent = t.name === tier && isLoggedIn;
                return (
                  <motion.div
                    key={t.name}
                    whileHover={{ y: -5 }}
                    className={`p-3 border-2 text-center transition-all duration-300 ${
                      isCurrent ? `${t.border} ${t.bg} text-black` :
                      isActive ? `${t.border} bg-black/50` :
                      "border-white/10 bg-black"
                    }`}
                  >
                    <div className={`text-xs font-display font-black uppercase tracking-wider ${
                      isCurrent ? "text-black" : isActive ? t.color : "text-muted-foreground"
                    }`}>
                      {t.name === "Trident's Hero" ? "HERO" : t.name.toUpperCase()}
                    </div>
                    <div className={`text-lg font-display font-black ${
                      isCurrent ? "text-black" : isActive ? "text-white" : "text-muted-foreground"
                    }`}>
                      {t.minVisits}+
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Rules Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="bg-zinc-900 border-2 border-white/10 p-8 clip-path-zentry"
          >
            <h3 className="text-2xl font-display font-black mb-6 text-white uppercase tracking-wider">Reward Rules</h3>
            <div className="space-y-4">
              {[
                { label: "Minimum Visit", value: "1 hour per session", icon: "🕐" },
                { label: "5th Visit", value: "50% OFF your session", icon: "🎉" },
                { label: "10th Visit", value: "100% FREE (1 hr)", icon: "🆓" },
                { label: "Tier Upgrade", value: "Every 10 visits", icon: "⬆️" },
                { label: "Max Tier", value: "Trident's Hero (60+ visits)", icon: "🔱" },
                { label: "Beyond Hero", value: "Earn ⭐ for every 10 visits", icon: "⭐" },
              ].map((rule) => (
                <div key={rule.label} className="flex items-center gap-4 p-4 bg-black border-2 border-white/10 hover:border-primary transition-colors">
                  <span className="text-2xl flex-shrink-0">{rule.icon}</span>
                  <div className="flex-1">
                    <span className="text-sm font-display font-black text-white uppercase tracking-wider">{rule.label}</span>
                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest ml-4">{rule.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Rewards List + Leaderboard */}
        <div className="space-y-8">
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

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
            className="bg-zinc-900 border-2 border-white/10 p-8 clip-path-zentry"
          >
            <h3 className="text-2xl font-display font-black mb-6 flex items-center gap-4 text-white uppercase tracking-wider">
              <Crown className="w-8 h-8 text-primary" />
              Leaderboard
              <span className="ml-auto text-xs text-muted-foreground font-medium uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Live
              </span>
            </h3>

            {leaderboard.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 uppercase tracking-widest text-sm">No players yet. Be the first!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-white/10">
                      <th className="pb-4 text-left text-xs font-display font-black uppercase tracking-widest text-muted-foreground">#</th>
                      <th className="pb-4 text-left text-xs font-display font-black uppercase tracking-widest text-muted-foreground">Player</th>
                      <th className="pb-4 text-center text-xs font-display font-black uppercase tracking-widest text-muted-foreground">Visits</th>
                      <th className="pb-4 text-center text-xs font-display font-black uppercase tracking-widest text-muted-foreground">Tier</th>
                      <th className="pb-4 text-right text-xs font-display font-black uppercase tracking-widest text-muted-foreground">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => {
                      const entryTier = getTierInfo(entry.tier);
                      const medals = ["🥇", "🥈", "🥉"];
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 text-xl font-display font-black text-white">
                            {i < 3 ? medals[i] : i + 1}
                          </td>
                          <td className="py-4">
                            <span className="font-display font-black text-white uppercase tracking-wider">{entry.name}</span>
                            {entry.stars > 0 && <span className="ml-2">{"⭐".repeat(entry.stars)}</span>}
                          </td>
                          <td className="py-4 text-center font-display font-black text-white">{entry.total_visits}</td>
                          <td className="py-4 text-center">
                            <span className={`${entryTier.color} font-display font-black text-sm uppercase tracking-wider`}>
                              {entry.tier === "Trident's Hero" ? "HERO" : entry.tier}
                            </span>
                          </td>
                          <td className="py-4 text-right font-display font-black text-primary">{entry.total_xp.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
