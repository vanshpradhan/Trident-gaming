import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  Settings, Users, ShoppingBag, Activity, Monitor, Bell, Loader2, Lock,
  Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Gamepad2,
  CalendarDays, IndianRupee, TrendingUp, Eye, ChevronDown, LogOut, ArrowLeft,
  Plus, Trash2, Edit3, X, Tag, UtensilsCrossed, Save, Star, Award, Check, Percent, Zap, Trophy, History
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { AuthModal } from "./AuthModal";
import { useRefreshOn } from "../lib/useRealtimeUpdates";

// ─── Types ───────────────────────────────────────────────────────────
interface Stats {
  consoles: { total: number; active: number; available: number; display: string };
  orders: { pending: number };
  revenue: { today: number; bookings: number; orders: number; display: string };
  customers: { total: number };
  bookings: { today: number };
}

interface Session {
  id: string;
  console_id: string;
  console_name: string;
  console_type: string;
  user_name: string;
  user_email: string;
  time_remaining_mins: number;
  time_remaining_display: string;
  computed_status: string;
  start_time: string;
  end_time: string;
}

interface Booking {
  id: string;
  user_name: string;
  user_email: string;
  console_name: string;
  console_id: string;
  date: string;
  time_slot: string;
  duration_hours: number;
  players: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  total_visits: number;
  total_xp: number;
  tier: string;
  stars: number;
  total_bookings: number;
  total_spent: number;
}

interface Order {
  id: string;
  user_name: string;
  user_email: string;
  total_price: number;
  status: string;
  created_at: string;
  items: { snack_name: string; quantity: number; price: number }[];
}

interface Console {
  id: string;
  name: string;
  type: string;
  status: string;
  players: string;
  features: string[] | string;
  image: string;
}

interface Snack {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  available: number;
  created_at: string;
}

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
  created_at: string;
}

interface Game {
  id: number;
  title: string;
  image: string;
  genre: string;
  rating: string;
  players: string;
  display_order: number;
  active: boolean;
  created_at: string;
}

type Tab = "overview" | "sessions" | "bookings" | "orders" | "customers" | "consoles" | "snacks" | "games" | "loyalty" | "history";

// ─── Helpers ─────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  ending_soon: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  time_up: "text-red-400 bg-red-400/10 border-red-400/30",
  confirmed: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  cancelled: "text-red-400 bg-red-400/10 border-red-400/30",
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  preparing: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  ready: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  delivered: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  available: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  occupied: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  maintenance: "text-red-400 bg-red-400/10 border-red-400/30",
};

const tierColors: Record<string, string> = {
  Bronze: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  Silver: "text-zinc-300 bg-zinc-300/10 border-zinc-300/30",
  Gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  Platinum: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  Diamond: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  "Trident's Hero": "text-primary bg-primary/10 border-primary/30",
};

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${statusColors[status] || "text-white/60 bg-white/5 border-white/10"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className={`inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest border ${tierColors[tier] || tierColors.Bronze}`}>
      {tier}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export function AdminPreview() {
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [consoles, setConsoles] = useState<Console[]>([]);
  const [snacks, setSnacks] = useState<Snack[]>([]);
  const [games, setGames] = useState<Game[]>([]);

  const loadAllData = useCallback(async () => {
    try {
      const [statsData, sessionsData, bookingsData, ordersData, customersData, consolesData, snacksData, gamesData] =
        await Promise.all([
          api.admin.stats(),
          api.admin.sessions(),
          api.admin.bookings(),
          api.admin.orders(),
          api.admin.customers(),
          api.consoles.list(),
          api.admin.snacks(),
          api.admin.games(),
        ]);
      setStats(statsData);
      setSessions(sessionsData);
      setBookings(bookingsData);
      setOrders(ordersData);
      setCustomers(customersData);
      setConsoles(consolesData);
      setSnacks(snacksData);
      setGames(gamesData);
    } catch (err) {
      console.error("Admin data load failed:", err);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) {
      setLoading(false);
      return;
    }
    loadAllData().finally(() => setLoading(false));
  }, [isLoggedIn, isAdmin, loadAllData]);

  // Real-time: SSE-triggered refresh instead of polling
  useRefreshOn(loadAllData, [
    "booking:created", "booking:cancelled", "booking:approved",
    "order:created", "order:updated",
    "console:updated", "console:added", "console:removed",
    "session:ended", "session:started",
    "snack:added", "snack:updated", "snack:removed",
    "pricing:added", "pricing:updated", "pricing:removed",
    "game:added", "game:updated", "game:removed",
    "loyalty:updated",
  ], isLoggedIn && isAdmin);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await api.admin.endSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      const newStats = await api.admin.stats();
      setStats(newStats);
    } catch (err: any) {
      alert(err.message || "Failed to end session");
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      await api.admin.approveBooking(bookingId);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "confirmed" } : b))
      );
    } catch (err: any) {
      alert(err.message || "Failed to approve booking");
    }
  };

  const handleStartSession = async (bookingId: string, playerName: string) => {
    try {
      await api.admin.startSession(bookingId, playerName);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || "Failed to start session");
    }
  };

  const handleOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.orders.updateStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      if (status === "delivered" || status === "cancelled") {
        const newStats = await api.admin.stats();
        setStats(newStats);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update order");
    }
  };

  const handleConsoleStatus = async (consoleId: string, status: string) => {
    try {
      await api.consoles.updateStatus(consoleId, status);
      setConsoles((prev) =>
        prev.map((c) => (c.id === consoleId ? { ...c, status } : c))
      );
      const newStats = await api.admin.stats();
      setStats(newStats);
    } catch (err: any) {
      alert(err.message || "Failed to update console status");
    }
  };

  // ─── Lock Screen ──────────────────────────────────────────────────
  if (!isLoggedIn || !isAdmin) {
    return (
      <>
        <div className="min-h-screen bg-black flex items-center justify-center pt-24">
          <div className="text-center">
            <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-3xl font-display font-black text-white uppercase tracking-wider mb-3">
              Admin Access Required
            </h2>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm mb-6">
              Sign in with an admin account to access the dashboard.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => setShowAuth(true)}
                className="px-8 py-3 bg-secondary text-black font-display font-black uppercase tracking-widest text-sm hover:bg-white transition-colors"
              >
                Sign In
              </button>
              <Link
                to="/"
                className="text-xs text-muted-foreground uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" /> Back to Site
              </Link>
            </div>
          </div>
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-24">
        <Loader2 className="w-10 h-10 text-secondary animate-spin" />
      </div>
    );
  }

  // ─── Sidebar Tabs ─────────────────────────────────────────────────
  const tabs: { icon: React.ReactNode; label: string; key: Tab; count?: number }[] = [
    { icon: <Activity className="w-5 h-5" />, label: "Overview", key: "overview" },
    { icon: <Monitor className="w-5 h-5" />, label: "Sessions", key: "sessions", count: sessions.length },
    { icon: <CalendarDays className="w-5 h-5" />, label: "Bookings", key: "bookings", count: bookings.length },
    { icon: <ShoppingBag className="w-5 h-5" />, label: "Orders", key: "orders", count: orders.filter((o) => o.status === "pending" || o.status === "preparing").length },
    { icon: <Users className="w-5 h-5" />, label: "Customers", key: "customers", count: customers.length },
    { icon: <Gamepad2 className="w-5 h-5" />, label: "Consoles", key: "consoles", count: consoles.length },
    { icon: <UtensilsCrossed className="w-5 h-5" />, label: "Snacks", key: "snacks", count: snacks.length },
    { icon: <Gamepad2 className="w-5 h-5" />, label: "Games", key: "games", count: games.length },
    { icon: <Award className="w-5 h-5" />, label: "Loyalty", key: "loyalty", count: customers.length },
    { icon: <History className="w-5 h-5" />, label: "History", key: "history" },
  ];

  // ─── Dashboard Layout ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black pt-24">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-zinc-950">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-secondary flex items-center justify-center">
              <Settings className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="font-display font-black text-white text-xl uppercase tracking-wider">
                Trident Admin
              </h1>
              <p className="text-muted-foreground text-xs uppercase tracking-widest">
                Welcome, {user?.name}
              </p>
            </div>
            <span className="px-2 py-0.5 bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-white/10 hover:text-white hover:border-white/30 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" /> Site
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 border border-white/10 text-muted-foreground hover:text-white hover:border-white/30 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </motion.button>
            <div className="relative p-2 border border-white/10 text-muted-foreground">
              <Bell className="w-4 h-4" />
              {stats && stats.orders.pending > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="p-2 border border-white/10 text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-56 flex-shrink-0">
            {/* Desktop sidebar */}
            <div className="hidden lg:block space-y-1 sticky top-28">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 text-sm ${
                    activeTab === tab.key
                      ? "bg-secondary text-black font-black"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white font-medium"
                  }`}
                >
                  {tab.icon}
                  <span className="uppercase tracking-widest text-xs">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 ${
                      activeTab === tab.key
                        ? "bg-black/20 text-black"
                        : "bg-white/10 text-muted-foreground"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile tab bar */}
            <div className="lg:hidden flex overflow-x-auto gap-1 pb-2 scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                    activeTab === tab.key
                      ? "bg-secondary text-black"
                      : "bg-zinc-900 text-muted-foreground border border-white/10"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "overview" && <OverviewTab stats={stats} sessions={sessions} orders={orders} bookings={bookings} customers={customers} setActiveTab={setActiveTab} />}
            {activeTab === "sessions" && <SessionsTab sessions={sessions} onEndSession={handleEndSession} />}
            {activeTab === "bookings" && <BookingsTab bookings={bookings} onApprove={handleApproveBooking} onStartSession={handleStartSession} />}
            {activeTab === "orders" && <OrdersTab orders={orders} onStatusChange={handleOrderStatus} />}
            {activeTab === "customers" && <CustomersTab customers={customers} onRefresh={loadAllData} />}
            {activeTab === "consoles" && <ConsolesTab consoles={consoles} onStatusChange={handleConsoleStatus} onRefresh={loadAllData} />}
            {activeTab === "snacks" && <SnacksTab snacks={snacks} onRefresh={loadAllData} />}
            {activeTab === "games" && <GamesTab games={games} onRefresh={loadAllData} />}
            {activeTab === "loyalty" && <LoyaltyTab customers={customers} onRefresh={loadAllData} />}
            {activeTab === "history" && <HistoryTab bookings={bookings} orders={orders} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────
function OverviewTab({
  stats, sessions, orders, bookings, customers, setActiveTab,
}: {
  stats: Stats | null;
  sessions: Session[];
  orders: Order[];
  bookings: Booking[];
  customers: Customer[];
  setActiveTab: (t: Tab) => void;
}) {
  const statCards = [
    {
      label: "Today's Revenue",
      value: stats?.revenue.display || "₹0",
      sub: `Bookings: ₹${stats?.revenue.bookings?.toLocaleString("en-IN") || 0} | Orders: ₹${stats?.revenue.orders?.toLocaleString("en-IN") || 0}`,
      icon: <IndianRupee className="w-5 h-5" />,
      color: "border-emerald-500/50 text-emerald-400",
    },
    {
      label: "Active Sessions",
      value: stats?.consoles.display || "0/0",
      sub: `${stats?.consoles.available || 0} consoles available`,
      icon: <Monitor className="w-5 h-5" />,
      color: "border-blue-500/50 text-blue-400",
    },
    {
      label: "Today's Bookings",
      value: stats?.bookings.today || 0,
      sub: `${bookings.filter((b) => b.status === "confirmed").length} confirmed`,
      icon: <CalendarDays className="w-5 h-5" />,
      color: "border-purple-500/50 text-purple-400",
    },
    {
      label: "Total Customers",
      value: stats?.customers.total || 0,
      sub: `${orders.filter((o) => o.status === "pending").length} pending orders`,
      icon: <Users className="w-5 h-5" />,
      color: "border-secondary/50 text-secondary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-zinc-950 border ${card.color.split(" ")[0]} p-5`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</span>
              <span className={card.color.split(" ")[1]}>{card.icon}</span>
            </div>
            <div className="text-3xl font-display font-black text-white mb-1">{card.value}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{card.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick View: Active Sessions */}
      <div className="bg-zinc-950 border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm">Active Sessions</h3>
          <button onClick={() => setActiveTab("sessions")} className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:text-white transition-colors flex items-center gap-1">
            View All <Eye className="w-3 h-3" />
          </button>
        </div>
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs uppercase tracking-widest">No active sessions</div>
        ) : (
          <div className="divide-y divide-white/5">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-display font-black text-white w-16">{s.console_id}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">{s.user_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-display font-black text-white">{s.time_remaining_display}</span>
                  <Badge status={s.computed_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick View: Recent Orders */}
      <div className="bg-zinc-950 border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm">Recent Orders</h3>
          <button onClick={() => setActiveTab("orders")} className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:text-white transition-colors flex items-center gap-1">
            View All <Eye className="w-3 h-3" />
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs uppercase tracking-widest">No orders</div>
        ) : (
          <div className="divide-y divide-white/5">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">{o.user_name}</span>
                  <span className="text-xs text-white/40">{o.items?.map((i) => `${i.snack_name} x${i.quantity}`).join(", ")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-display font-black text-primary">₹{o.total_price}</span>
                  <Badge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick View: Recent Customers */}
      <div className="bg-zinc-950 border border-white/10">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm">Top Customers</h3>
          <button onClick={() => setActiveTab("customers")} className="text-[10px] font-bold uppercase tracking-widest text-secondary hover:text-white transition-colors flex items-center gap-1">
            View All <Eye className="w-3 h-3" />
          </button>
        </div>
        {customers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs uppercase tracking-widest">No customers yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {customers.slice(0, 5).map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-xs font-black text-white uppercase">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-display font-black text-primary">₹{c.total_spent.toLocaleString("en-IN")}</span>
                  <TierBadge tier={c.tier} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SESSIONS TAB ────────────────────────────────────────────────────
function SessionsTab({ sessions, onEndSession }: { sessions: Session[]; onEndSession: (id: string) => void }) {
  // Live client-side countdown timers: tick every second
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function formatTimeLeft(endTime: string): { display: string; status: string } {
    const msLeft = new Date(endTime).getTime() - now;
    if (msLeft <= 0) return { display: "Time Up", status: "time_up" };
    const totalSecs = Math.floor(msLeft / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const display = h > 0
      ? `${h}h ${m.toString().padStart(2, "0")}m`
      : `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
    const status = msLeft < 10 * 60 * 1000 ? "ending_soon" : "active";
    return { display, status };
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
          Active Sessions <span className="text-secondary">({sessions.length})</span>
        </h2>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <Monitor className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No active sessions right now</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Console</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Player</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time Left</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sessions.map((s) => {
                  const { display: liveDisplay, status: liveStatus } = formatTimeLeft(s.end_time);
                  return (
                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-sm font-display font-black text-white">{s.console_id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground uppercase tracking-widest">{s.console_type}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-white">{s.user_name}</div>
                      <div className="text-[10px] text-muted-foreground">{s.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-display font-black text-white">{liveDisplay}</td>
                    <td className="px-4 py-3"><Badge status={liveStatus} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onEndSession(s.id)}
                        className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
                      >
                        End Session
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BOOKINGS TAB ────────────────────────────────────────────────────
function BookingsTab({
  bookings,
  onApprove,
  onStartSession,
}: {
  bookings: Booking[];
  onApprove: (id: string) => Promise<void>;
  onStartSession: (bookingId: string, playerName: string) => Promise<void>;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [filter, setFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startSessionBooking, setStartSessionBooking] = useState<Booking | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // First filter by selected date (using booking date field), then by status
  const byDate = bookings.filter((b) => b.date === selectedDate);
  const filtered = filter === "all" ? byDate : byDate.filter((b) => b.status === filter);

  const statusCounts = byDate.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleApprove = async (id: string) => {
    setActionLoading(id + ":approve");
    try { await onApprove(id); } finally { setActionLoading(null); }
  };

  const handleStartSession = async () => {
    if (!startSessionBooking || !playerName.trim()) return;
    setActionLoading(startSessionBooking.id + ":start");
    try {
      await onStartSession(startSessionBooking.id, playerName.trim());
      setStartSessionBooking(null);
      setPlayerName("");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Start Session Modal */}
      {startSessionBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-950 border border-secondary/40 p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display font-black text-white uppercase tracking-wider text-sm">
              Start Session — {startSessionBooking.console_id}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Customer: {startSessionBooking.user_name} · {startSessionBooking.duration_hours}h · ₹{startSessionBooking.total_price}
            </p>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Player Name (at counter)</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartSession()}
                placeholder={startSessionBooking.user_name}
                className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleStartSession}
                disabled={actionLoading === startSessionBooking.id + ":start"}
                className="flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50"
              >
                {actionLoading === startSessionBooking.id + ":start" ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Start Session"}
              </button>
              <button
                onClick={() => { setStartSessionBooking(null); setPlayerName(""); }}
                className="flex-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
            Bookings <span className="text-secondary">({byDate.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setFilter("all"); }}
              className="bg-black border border-white/10 text-white text-xs px-3 py-1.5 focus:border-secondary/50 outline-none"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => { setSelectedDate(todayStr); setFilter("all"); }}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-white/10 text-muted-foreground hover:border-white/30 hover:text-white transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "confirmed", "active", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                filter === s
                  ? "bg-secondary text-black border-secondary"
                  : "bg-transparent text-muted-foreground border-white/10 hover:border-white/30"
              }`}
            >
              {s} {s !== "all" && statusCounts[s] ? `(${statusCounts[s]})` : s === "all" ? `(${byDate.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No bookings found</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Console</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Players</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-white">{b.user_name}</div>
                      <div className="text-[10px] text-muted-foreground">{b.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-display font-black text-white">{b.console_id}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{b.date}</td>
                    <td className="px-4 py-3 text-xs text-white font-bold">{b.time_slot}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{b.duration_hours}h</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{b.players}</td>
                    <td className="px-4 py-3 text-sm font-display font-black text-primary">₹{b.total_price}</td>
                    <td className="px-4 py-3"><Badge status={b.status} /></td>
                    <td className="px-4 py-3">
                      {b.status === "pending" && (
                        <button
                          onClick={() => handleApprove(b.id)}
                          disabled={actionLoading === b.id + ":approve"}
                          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {actionLoading === b.id + ":approve" ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approve"}
                        </button>
                      )}
                      {b.status === "confirmed" && (
                        <button
                          onClick={() => { setStartSessionBooking(b); setPlayerName(b.user_name); }}
                          className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          Start Session
                        </button>
                      )}
                      {!["pending", "confirmed"].includes(b.status) && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ORDERS TAB ──────────────────────────────────────────────────────
function OrdersTab({ orders, onStatusChange }: { orders: Order[]; onStatusChange: (id: string, status: string) => void }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [filter, setFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filter by date using created_at, then by status
  const byDate = orders.filter((o) => o.created_at?.slice(0, 10) === selectedDate);
  const filtered = filter === "all" ? byDate : byDate.filter((o) => o.status === filter);

  const statusCounts = byDate.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
            Orders <span className="text-secondary">({byDate.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setFilter("all"); }}
              className="bg-black border border-white/10 text-white text-xs px-3 py-1.5 focus:border-secondary/50 outline-none"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => { setSelectedDate(todayStr); setFilter("all"); }}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-white/10 text-muted-foreground hover:border-white/30 hover:text-white transition-colors"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "preparing", "ready", "delivered", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-colors ${
                filter === s
                  ? "bg-secondary text-black border-secondary"
                  : "bg-transparent text-muted-foreground border-white/10 hover:border-white/30"
              }`}
            >
              {s} {s !== "all" && statusCounts[s] ? `(${statusCounts[s]})` : s === "all" ? `(${byDate.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No orders found</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ordered</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-white">{o.user_name}</div>
                      <div className="text-[10px] text-muted-foreground">{o.user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70 max-w-[200px] truncate">
                      {o.items?.map((i) => `${i.snack_name} x${i.quantity}`).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-display font-black text-primary">₹{o.total_price}</td>
                    <td className="px-4 py-3"><Badge status={o.status} /></td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <OrderActions order={o} onStatusChange={onStatusChange} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderActions({ order, onStatusChange }: { order: Order; onStatusChange: (id: string, status: string) => void }) {
  if (order.status === "pending") {
    return (
      <div className="flex gap-2">
        <button onClick={() => onStatusChange(order.id, "preparing")} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition-colors">
          Accept
        </button>
        <button onClick={() => onStatusChange(order.id, "cancelled")} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors">
          Reject
        </button>
      </div>
    );
  }
  if (order.status === "preparing") {
    return (
      <button onClick={() => onStatusChange(order.id, "ready")} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors">
        Mark Ready
      </button>
    );
  }
  if (order.status === "ready") {
    return (
      <button onClick={() => onStatusChange(order.id, "delivered")} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors">
        Delivered
      </button>
    );
  }
  return <span className="text-[10px] text-muted-foreground uppercase tracking-widest">--</span>;
}

// ─── CUSTOMERS TAB ───────────────────────────────────────────────────
function CustomersTab({ customers, onRefresh }: { customers: Customer[]; onRefresh: () => Promise<void> }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleUpdateVisits = async (userId: string, delta: number) => {
    setUpdatingId(userId);
    try {
      await api.admin.updateVisits(userId, delta);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update visits");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
        Customers <span className="text-secondary">({customers.length})</span>
      </h2>

      {customers.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No customers yet</p>
        </div>
      ) : (
        <div className="bg-zinc-950 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black/50 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tier</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">XP</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Visits</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bookings</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Spent</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-xs font-black text-white uppercase flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.phone || "--"}</td>
                    <td className="px-4 py-3">
                      <TierBadge tier={c.tier} />
                      {c.stars > 0 && <span className="ml-1 text-xs">{"⭐".repeat(c.stars)}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-white">{c.total_xp.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateVisits(c.id, -1)}
                          disabled={updatingId === c.id || c.total_visits === 0}
                          className="w-6 h-6 flex items-center justify-center text-xs font-black bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="text-xs font-display font-black text-white w-8 text-center">{c.total_visits}</span>
                        <button
                          onClick={() => handleUpdateVisits(c.id, 1)}
                          disabled={updatingId === c.id}
                          className="w-6 h-6 flex items-center justify-center text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.total_bookings}</td>
                    <td className="px-4 py-3 text-sm font-display font-black text-primary">₹{c.total_spent.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CONSOLES TAB ────────────────────────────────────────────────────
function ConsolesTab({ consoles, onStatusChange, onRefresh }: { consoles: Console[]; onStatusChange: (id: string, status: string) => void; onRefresh: () => Promise<void> }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [form, setForm] = useState({ id: "", name: "", type: "ps5", image: "", players: "1-4", features: "" });

  const grouped = consoles.reduce((acc, c) => {
    if (!acc[c.type]) acc[c.type] = [];
    acc[c.type].push(c);
    return acc;
  }, {} as Record<string, Console[]>);

  const typeLabels: Record<string, string> = {
    ps5: "PlayStation 5",
    psvr2: "PSVR 2",
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const featuresArray = form.features ? form.features.split(",").map((f) => f.trim()).filter(Boolean) : [];
      await api.admin.addConsole({
        id: form.id,
        name: form.name,
        type: form.type,
        image: form.image || "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&q=80&w=800",
        players: form.players || "1-4",
        features: featuresArray,
      });
      setForm({ id: "", name: "", type: "ps5", image: "", players: "1-4", features: "" });
      setShowAddForm(false);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add console");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(`Remove console ${id}? This cannot be undone.`)) return;
    setRemoving(id);
    try {
      await api.admin.removeConsole(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove console");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
          Console Management <span className="text-secondary">({consoles.length})</span>
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
            showAddForm
              ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white"
              : "bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary hover:text-black"
          }`}
        >
          {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "Add Console"}
        </button>
      </div>

      {/* Add Console Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-secondary/30 p-6"
        >
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm mb-4">Add New Console</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Console ID *</label>
              <input type="text" required value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="e.g. PS5-03" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. PlayStation 5" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Type *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                <option value="ps5">PS5</option>
                <option value="psvr2">PSVR 2</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Image URL</label>
              <input type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Players</label>
              <input type="text" value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} placeholder="1-4" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Features (comma-separated)</label>
              <input type="text" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="4K 120Hz, DualSense, Ray Tracing" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={adding} className="flex items-center gap-2 px-6 py-2 bg-secondary text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50">
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Console
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="bg-zinc-950 border border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-display font-black text-white uppercase tracking-wider text-sm">
              {typeLabels[type] || type}
            </h3>
            <div className="flex gap-3 text-[10px] uppercase tracking-widest">
              <span className="text-emerald-400">{items.filter((c) => c.status === "available").length} Available</span>
              <span className="text-yellow-400">{items.filter((c) => c.status === "occupied").length} Occupied</span>
              <span className="text-red-400">{items.filter((c) => c.status === "maintenance").length} Maintenance</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {items.map((c) => (
              <div key={c.id} className={`border p-4 ${
                c.status === "available" ? "border-emerald-500/30 bg-emerald-500/5" :
                c.status === "occupied" ? "border-yellow-500/30 bg-yellow-500/5" :
                "border-red-500/30 bg-red-500/5"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-display font-black text-white">{c.id}</span>
                  <Badge status={c.status} />
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                  {c.players} players
                </div>
                <div className="flex gap-1.5">
                  {c.status !== "available" && (
                    <button
                      onClick={() => onStatusChange(c.id, "available")}
                      className="flex-1 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors"
                    >
                      Available
                    </button>
                  )}
                  {c.status !== "maintenance" && (
                    <button
                      onClick={() => onStatusChange(c.id, "maintenance")}
                      className="flex-1 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Maintenance
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(c.id)}
                    disabled={removing === c.id}
                    className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors disabled:opacity-50"
                    title="Remove console"
                  >
                    {removing === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {consoles.length === 0 && (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <Gamepad2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No consoles yet. Add one above.</p>
        </div>
      )}
    </div>
  );
}

// ─── SNACKS TAB ──────────────────────────────────────────────────────
function SnacksTab({ snacks, onRefresh }: { snacks: Snack[]; onRefresh: () => Promise<void> }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", price: "", image: "", category: "snack" });
  const [editForm, setEditForm] = useState({ name: "", price: "", image: "", category: "snack" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.admin.addSnack({
        name: form.name,
        price: parseInt(form.price),
        image: form.image,
        category: form.category,
      });
      setForm({ name: "", price: "", image: "", category: "snack" });
      setShowAddForm(false);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add snack");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: number) => {
    setSaving(true);
    try {
      await api.admin.editSnack(id, {
        name: editForm.name,
        price: parseInt(editForm.price),
        image: editForm.image,
        category: editForm.category,
      });
      setEditingId(null);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update snack");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this snack? This cannot be undone.")) return;
    setRemoving(id);
    try {
      await api.admin.removeSnack(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove snack");
    } finally {
      setRemoving(null);
    }
  };

  const startEdit = (snack: Snack) => {
    setEditingId(snack.id);
    setEditForm({
      name: snack.name,
      price: snack.price.toString(),
      image: snack.image,
      category: snack.category,
    });
  };

  const categoryColors: Record<string, string> = {
    snack: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    drink: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    combo: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
          Snack Management <span className="text-secondary">({snacks.length})</span>
        </h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
            showAddForm
              ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white"
              : "bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary hover:text-black"
          }`}
        >
          {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "Add Snack"}
        </button>
      </div>

      {/* Add Snack Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-secondary/30 p-6"
        >
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm mb-4">Add New Snack</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nachos & Cheese" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Price (₹) *</label>
              <input type="number" required min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="150" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Image URL *</label>
              <input type="url" required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                <option value="snack">Snack</option>
                <option value="drink">Drink</option>
                <option value="combo">Combo</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button type="submit" disabled={adding} className="flex items-center gap-2 px-6 py-2 bg-secondary text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50">
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Snack
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Snack List */}
      {snacks.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No snacks yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {snacks.map((snack) => (
            <div key={snack.id} className="bg-zinc-950 border border-white/10 overflow-hidden group">
              {editingId === snack.id ? (
                // Edit mode
                <div className="p-4 space-y-3">
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <input type="url" value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                    <option value="snack">Snack</option>
                    <option value="drink">Drink</option>
                    <option value="combo">Combo</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(snack.id)} disabled={saving} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <div className="h-32 overflow-hidden bg-zinc-900">
                    <img src={snack.image} alt={snack.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-display font-black text-white">{snack.name}</h4>
                      <span className="text-sm font-display font-black text-primary">₹{snack.price}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${categoryColors[snack.category] || categoryColors.snack}`}>
                        {snack.category}
                      </span>
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(snack)} className="p-1.5 text-zinc-500 hover:text-secondary transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRemove(snack.id)} disabled={removing === snack.id} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50" title="Remove">
                          {removing === snack.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRICING TAB ─────────────────────────────────────────────────────
function PricingTab({ plans, onRefresh }: { plans: PricingPlan[]; onRefresh: () => Promise<void> }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", price: "", duration: "per hour", description: "", features: "", console_type: "ps5", popular: false, color: "primary",
  });
  const [editForm, setEditForm] = useState({
    name: "", price: "", duration: "", description: "", features: "", console_type: "", popular: false, color: "",
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const featuresArray = form.features ? form.features.split(",").map((f) => f.trim()).filter(Boolean) : [];
      await api.admin.addPricing({
        name: form.name,
        price: parseInt(form.price),
        duration: form.duration,
        description: form.description,
        features: featuresArray,
        console_type: form.console_type,
        popular: form.popular,
        color: form.color,
      });
      setForm({ name: "", price: "", duration: "per hour", description: "", features: "", console_type: "ps5", popular: false, color: "primary" });
      setShowAddForm(false);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add pricing plan");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSaving(true);
    try {
      const featuresArray = editForm.features ? editForm.features.split(",").map((f) => f.trim()).filter(Boolean) : [];
      await api.admin.editPricing(id, {
        name: editForm.name,
        price: parseInt(editForm.price),
        duration: editForm.duration,
        description: editForm.description,
        features: featuresArray,
        console_type: editForm.console_type,
        popular: editForm.popular,
        color: editForm.color,
      });
      setEditingId(null);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update pricing plan");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this pricing plan? This cannot be undone.")) return;
    setRemoving(id);
    try {
      await api.admin.removePricing(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove pricing plan");
    } finally {
      setRemoving(null);
    }
  };

  const startEdit = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setEditForm({
      name: plan.name,
      price: plan.price.toString(),
      duration: plan.duration,
      description: plan.description,
      features: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      console_type: plan.console_type,
      popular: plan.popular,
      color: plan.color,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
          Pricing Plans <span className="text-secondary">({plans.length})</span>
        </h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
            showAddForm
              ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white"
              : "bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary hover:text-black"
          }`}
        >
          {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "Add Plan"}
        </button>
      </div>

      {/* Add Pricing Plan Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-secondary/30 p-6"
        >
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm mb-4">Add New Pricing Plan</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Plan Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Solo Player" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Price (₹) *</label>
              <input type="number" required min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="100" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Duration *</label>
              <input type="text" required value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="per hour" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Description *</label>
              <input type="text" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Perfect for single-player campaigns..." className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Features (comma-separated)</label>
              <input type="text" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="1 Player, Any PS5 Console, Standard Controller, Free Water" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Console Type *</label>
              <select value={form.console_type} onChange={(e) => setForm({ ...form, console_type: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                <option value="ps5">PS5</option>
                <option value="psvr2">PSVR 2</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Color Theme</label>
              <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                <option value="primary">Primary (blue)</option>
                <option value="secondary">Secondary (gold)</option>
                <option value="white">White</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} className="w-4 h-4 accent-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mark as Popular</span>
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={adding} className="flex items-center gap-2 px-6 py-2 bg-secondary text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50">
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Plan
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Pricing Plans List */}
      {plans.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No pricing plans yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-zinc-950 border overflow-hidden ${plan.popular ? "border-secondary/50" : "border-white/10"}`}>
              {editingId === plan.id ? (
                // Edit mode
                <div className="p-5 space-y-3">
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Plan Name" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                    <input type="text" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} placeholder="Duration" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  </div>
                  <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <input type="text" value={editForm.features} onChange={(e) => setEditForm({ ...editForm, features: e.target.value })} placeholder="Features (comma-separated)" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={editForm.console_type} onChange={(e) => setEditForm({ ...editForm, console_type: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                      <option value="ps5">PS5</option>
                      <option value="psvr2">PSVR 2</option>
                    </select>
                    <select value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                      <option value="primary">Primary</option>
                      <option value="secondary">Secondary</option>
                      <option value="white">White</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.popular} onChange={(e) => setEditForm({ ...editForm, popular: e.target.checked })} className="w-4 h-4 accent-secondary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Popular</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(plan.id)} disabled={saving} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-display font-black text-white">{plan.name}</h4>
                        {plan.popular && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-secondary/10 text-secondary border border-secondary/30">Popular</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-display font-black text-primary">₹{plan.price}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{plan.duration}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {plan.console_type === "ps5" ? "PlayStation 5" : "PSVR 2"}
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {plan.color} theme
                    </span>
                  </div>

                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div className="mb-4 space-y-1">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-white/70">{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <button onClick={() => startEdit(plan)} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors">
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => handleRemove(plan.id)} disabled={removing === plan.id} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
          {removing === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Remove
                     </button>
                   </div>
                 </div>
               )}
             </div>
           ))}
        </div>
      )}
    </div>
  );
}

// ─── HISTORY TAB ─────────────────────────────────────────────────────
function HistoryTab({ bookings, orders }: { bookings: Booking[]; orders: Order[] }) {
  const [view, setView] = useState<"bookings" | "orders">("bookings");

  const todayStr = new Date().toISOString().slice(0, 10);

  // All bookings NOT from today, sorted newest first
  const pastBookings = bookings
    .filter((b) => b.date < todayStr)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // All orders NOT from today, sorted newest first
  const pastOrders = orders
    .filter((o) => o.created_at?.slice(0, 10) < todayStr)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Group by date helper
  function groupByDate<T>(items: T[], getDate: (item: T) => string): { date: string; items: T[] }[] {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const d = getDate(item).slice(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(item);
    }
    // Sort groups newest first
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({ date, items }));
  }

  const bookingGroups = groupByDate(pastBookings, (b) => b.date);
  const orderGroups = groupByDate(pastOrders, (o) => o.created_at);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });

  const formatTime = (isoStr: string) =>
    new Date(isoStr).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display font-black text-white text-lg uppercase tracking-wider flex items-center gap-3">
            <History className="w-5 h-5 text-secondary" />
            History
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
            All records before today — stored with full date &amp; time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("bookings")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
              view === "bookings"
                ? "bg-secondary text-black border-secondary"
                : "bg-transparent text-muted-foreground border-white/10 hover:border-white/30"
            }`}
          >
            Bookings <span className="ml-1 opacity-70">({pastBookings.length})</span>
          </button>
          <button
            onClick={() => setView("orders")}
            className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
              view === "orders"
                ? "bg-secondary text-black border-secondary"
                : "bg-transparent text-muted-foreground border-white/10 hover:border-white/30"
            }`}
          >
            Orders <span className="ml-1 opacity-70">({pastOrders.length})</span>
          </button>
        </div>
      </div>

      {/* ── BOOKINGS HISTORY ── */}
      {view === "bookings" && (
        <div className="space-y-6">
          {bookingGroups.length === 0 ? (
            <div className="bg-zinc-950 border border-white/10 p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-xs uppercase tracking-widest">No booking history yet</p>
            </div>
          ) : bookingGroups.map(({ date, items }) => (
            <div key={date} className="space-y-2">
              {/* Date group header */}
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-secondary">{formatDate(date)}</span>
                <span className="text-[10px] text-muted-foreground">— {items.length} booking{items.length !== 1 ? "s" : ""}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="bg-zinc-950 border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/50 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Console</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time Slot</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duration</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Players</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Booked At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((b) => (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-white">{b.user_name}</div>
                            <div className="text-[10px] text-muted-foreground">{b.user_email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs font-display font-black text-white">{b.console_id}</td>
                          <td className="px-4 py-3 text-xs text-white font-bold">{b.time_slot}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{b.duration_hours}h</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{b.players}</td>
                          <td className="px-4 py-3 text-sm font-display font-black text-primary">₹{b.total_price}</td>
                          <td className="px-4 py-3"><Badge status={b.status} /></td>
                          <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatTime(b.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ORDERS HISTORY ── */}
      {view === "orders" && (
        <div className="space-y-6">
          {orderGroups.length === 0 ? (
            <div className="bg-zinc-950 border border-white/10 p-12 text-center">
              <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-xs uppercase tracking-widest">No order history yet</p>
            </div>
          ) : orderGroups.map(({ date, items }) => (
            <div key={date} className="space-y-2">
              {/* Date group header */}
              <div className="flex items-center gap-3">
                <CalendarDays className="w-4 h-4 text-secondary flex-shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-secondary">{formatDate(date)}</span>
                <span className="text-[10px] text-muted-foreground">— {items.length} order{items.length !== 1 ? "s" : ""}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              <div className="bg-zinc-950 border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-black/50 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Customer</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Items</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ordered At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {items.map((o) => (
                        <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-white">{o.user_name}</div>
                            <div className="text-[10px] text-muted-foreground">{o.user_email}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-white/70 max-w-[220px] truncate">
                            {o.items?.map((i) => `${i.snack_name} x${i.quantity}`).join(", ") || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm font-display font-black text-primary">₹{o.total_price}</td>
                          <td className="px-4 py-3"><Badge status={o.status} /></td>
                          <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(o.created_at).toLocaleString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit", hour12: true,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOYALTY TAB ─────────────────────────────────────────────────────
function LoyaltyTab({ customers, onRefresh }: { customers: Customer[]; onRefresh: () => Promise<void> }) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleVisit = async (userId: string, delta: number) => {
    setUpdatingId(userId);
    try {
      await api.admin.updateVisits(userId, delta);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update visits");
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
            Loyalty Management <span className="text-secondary">({customers.length})</span>
          </h2>
          <p className="text-muted-foreground text-xs uppercase tracking-widest mt-1">
            Mark visits or remove stamps from a customer's punch card
          </p>
        </div>
        {/* Search */}
        <div className="sm:ml-auto">
          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-muted-foreground focus:outline-none focus:border-secondary/50 uppercase tracking-widest"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">
            {search ? "No customers match your search" : "No customers yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => {
            const cycleVisits = c.total_visits % 10 === 0 && c.total_visits > 0 ? 10 : c.total_visits % 10;
            const isUpdating = updatingId === c.id;

            return (
              <div
                key={c.id}
                className="bg-zinc-950 border border-white/10 hover:border-white/20 transition-colors p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Customer info */}
                  <div className="flex items-center gap-3 min-w-0 sm:w-56 flex-shrink-0">
                    <div className="w-9 h-9 bg-white/10 flex items-center justify-center text-sm font-black text-white uppercase flex-shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{c.email}</div>
                    </div>
                  </div>

                  {/* Tier + XP */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <TierBadge tier={c.tier} />
                    {c.stars > 0 && (
                      <span className="text-xs text-yellow-400 font-black">+{c.stars}★</span>
                    )}
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {c.total_xp.toLocaleString()} XP
                    </span>
                  </div>

                  {/* Punch card */}
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 10 }, (_, i) => {
                        const stamped = i < cycleVisits;
                        const isMilestone = i === 4 || i === 9;
                        return (
                          <div
                            key={i}
                            title={
                              isMilestone
                                ? i === 4
                                  ? "Visit 5 — 50% off"
                                  : "Visit 10 — 1 hr free"
                                : `Visit ${i + 1}`
                            }
                            className={`
                              w-6 h-6 flex items-center justify-center border text-[9px] font-black flex-shrink-0 transition-colors
                              ${stamped
                                ? isMilestone
                                  ? "bg-primary border-primary text-white"
                                  : "bg-white/25 border-white/60 text-white"
                                : isMilestone
                                  ? "bg-transparent border-primary/40 border-dashed text-primary/40"
                                  : "bg-transparent border-white/15 text-white/15"
                              }
                            `}
                          >
                            {stamped ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                          </div>
                        );
                      })}
                      <span className="ml-2 text-[10px] text-muted-foreground uppercase tracking-widest flex-shrink-0">
                        {cycleVisits}/10
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest">
                      <span className="text-white/50">{c.total_visits} total visits</span>
                      {cycleVisits >= 5 && cycleVisits < 10 && (
                        <span className="text-secondary font-black">· 50% off unlocked</span>
                      )}
                      {cycleVisits === 10 || (c.total_visits > 0 && c.total_visits % 10 === 0) ? (
                        <span className="text-primary font-black">· 1 hr free unlocked</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Visit controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest hidden sm:block">
                      Visits
                    </span>
                    <button
                      onClick={() => handleVisit(c.id, -1)}
                      disabled={isUpdating || c.total_visits === 0}
                      title="Remove 1 visit"
                      className="w-8 h-8 flex items-center justify-center text-xs font-black bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : "−"}
                    </button>
                    <span className="w-10 text-center text-sm font-display font-black text-white">
                      {c.total_visits}
                    </span>
                    <button
                      onClick={() => handleVisit(c.id, 1)}
                      disabled={isUpdating}
                      title="Add 1 visit"
                      className="w-8 h-8 flex items-center justify-center text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : "+"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── GAMES TAB ───────────────────────────────────────────────────────
function GamesTab({ games, onRefresh }: { games: Game[]; onRefresh: () => Promise<void> }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", image: "", genre: "Action", rating: "4.5", players: "1", display_order: "0" });
  const [editForm, setEditForm] = useState({ title: "", image: "", genre: "", rating: "", players: "", display_order: "", active: true });

  const genres = ["Action", "RPG", "FPS", "Sports", "Fighting", "Open World", "Adventure", "Racing", "Horror", "Simulation"];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.admin.addGame({
        title: form.title,
        image: form.image,
        genre: form.genre,
        rating: form.rating,
        players: form.players,
        display_order: parseInt(form.display_order) || 0,
        active: true,
      });
      setForm({ title: "", image: "", genre: "Action", rating: "4.5", players: "1", display_order: "0" });
      setShowAddForm(false);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to add game");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: number) => {
    setSaving(true);
    try {
      await api.admin.editGame(id, {
        title: editForm.title,
        image: editForm.image,
        genre: editForm.genre,
        rating: editForm.rating,
        players: editForm.players,
        display_order: parseInt(editForm.display_order) || 0,
        active: editForm.active,
      });
      setEditingId(null);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to update game");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Remove this game? This cannot be undone.")) return;
    setRemoving(id);
    try {
      await api.admin.removeGame(id);
      await onRefresh();
    } catch (err: any) {
      alert(err.message || "Failed to remove game");
    } finally {
      setRemoving(null);
    }
  };

  const startEdit = (game: Game) => {
    setEditingId(game.id);
    setEditForm({
      title: game.title,
      image: game.image,
      genre: game.genre,
      rating: game.rating,
      players: game.players,
      display_order: game.display_order.toString(),
      active: game.active,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-black text-white text-lg uppercase tracking-wider">
          Games Management <span className="text-secondary">({games.length})</span>
        </h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border transition-colors ${
            showAddForm
              ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500 hover:text-white"
              : "bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary hover:text-black"
          }`}
        >
          {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "Add Game"}
        </button>
      </div>

      {/* Add Game Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border border-secondary/30 p-6"
        >
          <h3 className="font-display font-black text-white uppercase tracking-wider text-sm mb-4">Add New Game</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Title *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Spider-Man 2" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Genre *</label>
              <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                {genres.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Image URL *</label>
              <input type="url" required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Rating (e.g. 4.9)</label>
              <input type="text" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="4.5" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Players (e.g. 1-4)</label>
              <input type="text" value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} placeholder="1-4" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Display Order</label>
              <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} placeholder="0" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-secondary/50 outline-none" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={adding} className="flex items-center gap-2 px-6 py-2 bg-secondary text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50">
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add Game
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Games List */}
      {games.length === 0 ? (
        <div className="bg-zinc-950 border border-white/10 p-12 text-center">
          <Gamepad2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-xs uppercase tracking-widest">No games yet. Add one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {games.map((game) => (
            <div key={game.id} className={`bg-zinc-950 border overflow-hidden group ${game.active ? "border-white/10" : "border-white/5 opacity-60"}`}>
              {editingId === game.id ? (
                // Edit mode
                <div className="p-4 space-y-3">
                  <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <input type="url" value={editForm.image} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} placeholder="Image URL" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editForm.genre} onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })} className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none">
                      {genres.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <input type="text" value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} placeholder="Rating" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={editForm.players} onChange={(e) => setEditForm({ ...editForm, players: e.target.value })} placeholder="Players" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                    <input type="number" value={editForm.display_order} onChange={(e) => setEditForm({ ...editForm, display_order: e.target.value })} placeholder="Order" className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white focus:border-secondary/50 outline-none" />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} className="w-4 h-4 accent-secondary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active (shown on site)</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(game.id)} disabled={saving} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-50">
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="flex-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // Display mode
                <>
                  <div className="h-32 overflow-hidden bg-zinc-900 relative">
                    <img src={game.image} alt={game.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    {!game.active && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 border border-white/20 px-2 py-0.5">Hidden</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-black/70 border border-primary/50 text-primary text-[10px] font-bold">
                      <Star className="w-3 h-3 fill-current" />
                      {game.rating}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-display font-black text-white mb-2 truncate">{game.title}</h4>
                    <div className="flex items-center gap-3 mb-3 text-[10px] text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3 text-primary" />{game.genre}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3 text-secondary" />{game.players}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(game)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors">
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => handleRemove(game.id)} disabled={removing === game.id} className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors disabled:opacity-50" title="Remove">
                        {removing === game.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
