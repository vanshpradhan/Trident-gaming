import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, Clock, Users, CreditCard, ChevronRight, Gamepad2, CheckCircle2, AlertCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export function Booking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [players, setPlayers] = useState<number>(1);
  const [consoleType, setConsoleType] = useState<"ps5" | "psvr2">("ps5");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isLoggedIn, isAdmin } = useAuth();

  const dates = Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i));
  const times = [
    "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM",
    "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM"
  ];

  const calculatePrice = () => {
    let basePrice = 0;
    if (consoleType === "psvr2") {
      basePrice = 500;
    } else {
      if (players === 1) basePrice = 100;
      else if (players === 2) basePrice = 150;
      else basePrice = 150 + (players - 2) * 50;
    }
    return basePrice * duration;
  };

  const handleBooking = async () => {
    if (!isLoggedIn) {
      setError("Please sign in to book a session");
      return;
    }
    if (isAdmin) {
      setError("Admin accounts cannot make bookings. Please use a customer account.");
      return;
    }
    if (!selectedTime) return;

    setLoading(true);
    setError("");

    try {
      const result = await api.bookings.create({
        console_type: consoleType,
        date: format(selectedDate, "yyyy-MM-dd"),
        time_slot: selectedTime,
        players: consoleType === "psvr2" ? 1 : players,
        duration_hours: duration,
      });
      setBooking(result);
    } catch (err: any) {
      setError(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } }
  };

  if (booking) {
    return (
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto bg-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border-2 border-primary p-12 text-center clip-path-zentry"
        >
          <CheckCircle2 className="w-20 h-20 text-primary mx-auto mb-8" />
          <h2 className="text-5xl font-display font-black mb-4 text-white uppercase tracking-wider">Booked!</h2>
          <p className="text-muted-foreground text-xl mb-8 font-medium uppercase tracking-widest">Your gaming session is confirmed.</p>
          
          <div className="space-y-4 text-left bg-black p-8 border-2 border-white/10 mb-8">
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase tracking-widest text-sm">Console</span>
              <span className="font-display font-black text-white">{booking.console_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase tracking-widest text-sm">Station</span>
              <span className="font-display font-black text-white">{booking.console_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase tracking-widest text-sm">Date</span>
              <span className="font-display font-black text-white">{booking.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase tracking-widest text-sm">Time</span>
              <span className="font-display font-black text-white">{booking.time_slot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground uppercase tracking-widest text-sm">Duration</span>
              <span className="font-display font-black text-white">{booking.duration_hours} {booking.duration_hours === 1 ? 'hr' : 'hrs'}</span>
            </div>
            <div className="flex justify-between pt-4 border-t-2 border-white/10">
              <span className="text-muted-foreground uppercase tracking-widest text-sm">Total</span>
              <span className="font-display font-black text-primary text-2xl">₹{booking.total_price}</span>
            </div>
          </div>

          <button
            onClick={() => { setBooking(null); setSelectedTime(null); }}
            className="w-full py-5 bg-primary text-black font-display font-black text-xl uppercase tracking-widest hover:bg-white transition-colors clip-path-zentry-reverse"
          >
            Book Another Session
          </button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="relative py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-black">
      <div className="mb-16 relative z-10">
        <motion.h2
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-display font-black mb-4 uppercase tracking-tighter text-white"
        >
          Secure Your <span className="text-primary">Spot</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground text-xl max-w-2xl font-medium uppercase tracking-widest"
        >
          Book your gaming session in seconds. Choose your console, time, and squad size.
        </motion.p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Console Selection */}
          <div className="bg-zinc-900 border-2 border-white/10 p-8 clip-path-zentry">
            <h3 className="text-2xl font-display font-black mb-6 flex items-center gap-4 text-white uppercase tracking-wider">
              <Gamepad2 className="w-8 h-8 text-primary" />
              Select Console
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setConsoleType("ps5")}
                className={`p-6 border-2 transition-all duration-300 clip-path-zentry ${
                  consoleType === "ps5"
                    ? "bg-primary border-primary text-black"
                    : "bg-black border-white/10 text-white hover:border-primary"
                }`}
              >
                <div className="font-display font-black text-2xl mb-2 uppercase tracking-wider">PlayStation 5</div>
                <div className="text-sm font-medium uppercase tracking-widest opacity-80">4K Gaming</div>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setConsoleType("psvr2")}
                className={`p-6 border-2 transition-all duration-300 clip-path-zentry ${
                  consoleType === "psvr2"
                    ? "bg-secondary border-secondary text-black"
                    : "bg-black border-white/10 text-white hover:border-secondary"
                }`}
              >
                <div className="font-display font-black text-2xl mb-2 uppercase tracking-wider">PSVR 2</div>
                <div className="text-sm font-medium uppercase tracking-widest opacity-80">Virtual Reality</div>
              </motion.button>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="bg-zinc-900 border-2 border-white/10 p-8 clip-path-zentry">
            <h3 className="text-2xl font-display font-black mb-6 flex items-center gap-4 text-white uppercase tracking-wider">
              <CalendarIcon className="w-8 h-8 text-secondary" />
              Date & Time
            </h3>
            
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="flex gap-4 overflow-x-auto pb-6 mb-8 scrollbar-hide"
            >
              {dates.map((date, i) => (
                <motion.button
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={i}
                  onClick={() => setSelectedDate(date)}
                  className={`flex-shrink-0 w-24 h-28 border-2 flex flex-col items-center justify-center transition-all duration-300 clip-path-zentry ${
                    format(selectedDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
                      ? "bg-secondary text-black border-secondary"
                      : "bg-black border-white/10 text-white hover:border-secondary"
                  }`}
                >
                  <span className="text-sm font-medium uppercase tracking-widest mb-2">{format(date, "EEE")}</span>
                  <span className="text-4xl font-display font-black">{format(date, "d")}</span>
                </motion.button>
              ))}
            </motion.div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid grid-cols-3 sm:grid-cols-4 gap-4"
            >
              {times.map((time) => (
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-4 border-2 text-sm font-display font-black uppercase tracking-widest transition-all duration-300 clip-path-zentry ${
                    selectedTime === time
                      ? "bg-primary text-black border-primary"
                      : "bg-black border-white/10 text-white hover:border-primary"
                  }`}
                >
                  {time}
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Player Count */}
          <AnimatePresence>
            {consoleType === "ps5" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-zinc-900 border-2 border-white/10 p-8 overflow-hidden clip-path-zentry"
              >
                <h3 className="text-2xl font-display font-black mb-6 flex items-center gap-4 text-white uppercase tracking-wider">
                  <Users className="w-8 h-8 text-primary" />
                  Number of Players
                </h3>
                <div className="flex items-center gap-6">
                  {[1, 2, 3, 4].map((num) => (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      key={num}
                      onClick={() => setPlayers(num)}
                      className={`w-16 h-16 border-2 flex items-center justify-center text-2xl font-display font-black transition-all duration-300 clip-path-zentry ${
                        players === num
                          ? "bg-primary text-black border-primary"
                          : "bg-black border-white/10 text-white hover:border-primary"
                      }`}
                    >
                      {num}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Duration Selection */}
          <div className="bg-zinc-900 border-2 border-white/10 p-8 overflow-hidden clip-path-zentry">
            <h3 className="text-2xl font-display font-black mb-6 flex items-center gap-4 text-white uppercase tracking-wider">
              <Clock className="w-8 h-8 text-primary" />
              Duration
            </h3>
            <div className="flex flex-wrap items-center gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  key={num}
                  onClick={() => setDuration(num)}
                  className={`px-6 py-4 border-2 flex items-center justify-center text-xl font-display font-black transition-all duration-300 clip-path-zentry ${
                    duration === num
                      ? "bg-primary text-black border-primary"
                      : "bg-black border-white/10 text-white hover:border-primary"
                  }`}
                >
                  {num} {num === 1 ? 'HR' : 'HRS'}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="lg:col-span-1"
        >
          <div className="bg-zinc-900 border-2 border-white/10 p-8 sticky top-32 clip-path-zentry">
            <h3 className="text-3xl font-display font-black mb-8 text-white uppercase tracking-wider">Booking Summary</h3>
            
            <div className="space-y-6 mb-10">
              <div className="flex justify-between items-center pb-6 border-b-2 border-white/10">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Console</span>
                <span className="font-display font-black text-xl text-white uppercase tracking-wider">{consoleType === "ps5" ? "PlayStation 5" : "PSVR 2"}</span>
              </div>
              <div className="flex justify-between items-center pb-6 border-b-2 border-white/10">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Date</span>
                <span className="font-display font-black text-xl text-white uppercase tracking-wider">{format(selectedDate, "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between items-center pb-6 border-b-2 border-white/10">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Time</span>
                <span className="font-display font-black text-xl text-white uppercase tracking-wider">{selectedTime || "Select time"}</span>
              </div>
              {consoleType === "ps5" && (
                <div className="flex justify-between items-center pb-6 border-b-2 border-white/10">
                  <span className="text-muted-foreground font-medium uppercase tracking-widest">Players</span>
                  <span className="font-display font-black text-xl text-white uppercase tracking-wider">{players}</span>
                </div>
              )}
              <div className="flex justify-between items-center pb-6 border-b-2 border-white/10">
                <span className="text-muted-foreground font-medium uppercase tracking-widest">Duration</span>
                <span className="font-display font-black text-xl text-white uppercase tracking-wider">{duration} {duration === 1 ? 'hr' : 'hrs'}</span>
              </div>
              <div className="flex justify-between items-center pt-6">
                <span className="text-xl text-muted-foreground font-medium uppercase tracking-widest">Total</span>
                <span className="text-4xl font-display font-black text-primary">
                  ₹{calculatePrice()}
                </span>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-red-500/10 border-2 border-red-500/30 p-4 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm font-medium uppercase tracking-widest">{error}</span>
              </motion.div>
            )}

            <motion.button
              whileHover={selectedTime ? { scale: 1.02 } : {}}
              whileTap={selectedTime ? { scale: 0.98 } : {}}
              disabled={!selectedTime || loading}
              onClick={handleBooking}
              className={`w-full py-5 font-display font-black text-xl uppercase tracking-widest flex items-center justify-center gap-3 transition-all duration-300 clip-path-zentry-reverse ${
                selectedTime && !loading
                  ? "bg-primary text-black hover:bg-white"
                  : "bg-black text-white/30 cursor-not-allowed border-2 border-white/10"
              }`}
            >
              {loading ? (
                "Booking..."
              ) : (
                <>
                  <CreditCard className="w-6 h-6" />
                  Confirm Booking
                  <ChevronRight className="w-6 h-6" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
