import { useState, useEffect, useCallback, type ReactNode } from "react";
import { motion } from "motion/react";
import { Trophy, Star, Loader2, Lock, Crown, Award, Check, Percent, Zap } from "lucide-react";
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

// ── Sub-components ──────────────────────────────────────────────────────────

interface LoyaltyPunchCardProps {
  visits: number;
  isLoggedIn: boolean;
}

function LoyaltyPunchCard({ visits, isLoggedIn }: LoyaltyPunchCardProps) {
  const cycleVisits = isLoggedIn ? visits % 10 : 0;

  const circles = Array.from({ length: 10 }, (_, i) => {
    const stamped = i < cycleVisits;
    const isMilestone = i === 4 || i === 9; // 5th and 10th
    return { index: i, stamped, isMilestone };
  });

  const rows = [circles.slice(0, 5), circles.slice(5, 10)];

  return (
    <div className="space-y-3">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-5 gap-3">
          {row.map(({ index, stamped, isMilestone }) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.08 }}
              className={`
                relative aspect-square flex items-center justify-center
                border-2 transition-all duration-300
                ${stamped
                  ? isMilestone
                    ? "bg-primary border-primary shadow-[0_0_12px_rgba(var(--primary-rgb,220,38,38),0.6)]"
                    : "bg-white/20 border-white/60"
                  : isMilestone
                    ? "bg-transparent border-primary/40 border-dashed"
                    : isLoggedIn
                      ? "bg-transparent border-white/20"
                      : "bg-transparent border-white/10"
                }
              `}
            >
              {stamped ? (
                <Check
                  className={`w-5 h-5 ${isMilestone ? "text-white" : "text-white"}`}
                  strokeWidth={3}
                />
              ) : (
                <span
                  className={`text-xs font-display font-black ${
                    isMilestone ? "text-primary/60" : "text-white/20"
                  }`}
                >
                  {index + 1}
                </span>
              )}

              {/* Milestone marker */}
              {isMilestone && !stamped && (
                <span className="absolute -top-2 -right-2 text-[9px] font-black bg-primary text-black px-1 leading-tight">
                  {index === 4 ? "5TH" : "10TH"}
                </span>
              )}
              {isMilestone && stamped && (
                <span className="absolute -top-2 -right-2 text-[9px] font-black bg-white text-black px-1 leading-tight">
                  {index === 4 ? "5TH" : "10TH"}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      ))}
      {isLoggedIn && (
        <p className="text-center text-xs text-muted-foreground font-medium uppercase tracking-widest pt-1">
          {cycleVisits === 0
            ? "Start visiting to earn stamps"
            : cycleVisits === 10
              ? "Card complete — new card started!"
              : `${cycleVisits} / 10 stamps this card`}
        </p>
      )}
    </div>
  );
}

interface MilestoneCardProps {
  visit: number;
  current: number;
  icon: ReactNode;
  label: string;
  sublabel: string;
  color: string;
  borderColor: string;
  bgColor: string;
  activeBg: string;
  activeBorder: string;
}

function MilestoneCard({
  visit, current, icon, label, sublabel,
  color, borderColor, bgColor, activeBg, activeBorder,
}: MilestoneCardProps) {
  // milestone is "reached" when cycleVisits >= visit (i.e. stamped on current card)
  const cycleVisits = current % 10 === 0 && current > 0 ? 10 : current % 10;
  const reached = cycleVisits >= visit;
  const toGo = visit - cycleVisits;

  return (
    <div
      className={`
        p-4 border-2 transition-all duration-300 flex flex-col gap-2
        ${reached ? `${activeBg} ${activeBorder}` : `${bgColor} ${borderColor}`}
      `}
    >
      <div className={`flex items-center gap-2 ${reached ? color : "text-muted-foreground"}`}>
        {icon}
        <span className="font-display font-black text-sm uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{sublabel}</p>
      {reached ? (
        <span className={`text-xs font-black uppercase tracking-widest ${color}`}>
          Unlocked!
        </span>
      ) : (
        <span className="text-xs text-muted-foreground font-medium">
          {toGo} visit{toGo !== 1 ? "s" : ""} to go
        </span>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

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
                { label: "Minimum Visit", value: "1 hour per session" },
                { label: "5th Visit", value: "50% OFF your session" },
                { label: "10th Visit", value: "100% FREE (1 hr)" },
                { label: "Tier Upgrade", value: "Every 10 visits" },
                { label: "Max Tier", value: "Trident's Hero (60+ visits)" },
                { label: "Beyond Hero", value: "Earn a star for every 10 visits" },
              ].map((rule) => (
                <div key={rule.label} className="flex items-center gap-4 p-4 bg-black border-2 border-white/10 hover:border-primary transition-colors">
                  <div className="flex-1">
                    <span className="text-sm font-display font-black text-white uppercase tracking-wider">{rule.label}</span>
                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-widest ml-4">{rule.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: Loyalty Punch Card + Leaderboard */}
        <div className="space-y-8">
          {/* ── Loyalty Punch Card ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="bg-zinc-900 border-2 border-white/10 p-8 clip-path-zentry relative overflow-hidden group hover:border-primary transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -z-10 group-hover:bg-primary/10 transition-colors duration-500" />

            <h3 className="text-2xl font-display font-black mb-2 text-white uppercase tracking-wider text-center">
              Loyalty Card
            </h3>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest text-center mb-8">
              Every visit earns a stamp — collect rewards at visit 5 &amp; 10
            </p>

            {/* 10 circles — 2 rows of 5 */}
            <LoyaltyPunchCard visits={currentVisits} isLoggedIn={isLoggedIn} />

            {/* Milestone reward labels */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <MilestoneCard
                visit={5}
                current={currentVisits}
                icon={<Percent className="w-5 h-5" />}
                label="50% Off"
                sublabel="Your next session"
                color="text-secondary"
                borderColor="border-secondary/40"
                bgColor="bg-secondary/5"
                activeBg="bg-secondary/20"
                activeBorder="border-secondary"
              />
              <MilestoneCard
                visit={10}
                current={currentVisits}
                icon={<Zap className="w-5 h-5" />}
                label="1 Hour Free"
                sublabel="100% off (1 hr session)"
                color="text-primary"
                borderColor="border-primary/40"
                bgColor="bg-primary/5"
                activeBg="bg-primary/20"
                activeBorder="border-primary"
              />
            </div>

            {!isLoggedIn && (
              <div className="mt-6 flex items-center justify-center gap-3 p-4 bg-black/60 border border-white/10">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Sign in to track your visits
                </span>
              </div>
            )}
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
