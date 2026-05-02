import { useState, useEffect } from 'react';
import { Timer, Play, Square } from 'lucide-react';
import { motion } from 'motion/react';

export function CountdownTimer() {
  const [minutes, setMinutes] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // NEW: absolute end time (fixes mobile freeze issue)
  const [endTime, setEndTime] = useState<number | null>(null);

  // Start countdown
  const handleStart = () => {
    const duration = minutes * 60;

    setTimeLeft(duration);

    const end = Date.now() + duration * 1000;
    setEndTime(end);

    setIsRunning(true);
  };

  // Stop countdown
  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(0);
    setEndTime(null);
  };

  // Main timer (stable, no drift, no freeze)
  useEffect(() => {
    if (!isRunning || !endTime) return;

    const update = () => {
      const diff = Math.max(0, endTime - Date.now());
      const seconds = Math.floor(diff / 1000);

      setTimeLeft(seconds);

      if (seconds <= 0) {
        setIsRunning(false);
      }
    };

    update(); // immediate sync

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [isRunning, endTime]);

  // FIX: works even when phone locks / tab switches
  useEffect(() => {
    const handleVisibility = () => {
      if (!endTime) return;

      const diff = Math.max(0, endTime - Date.now());
      const seconds = Math.floor(diff / 1000);

      setTimeLeft(seconds);

      if (seconds <= 0) {
        setIsRunning(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [endTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const progress =
    timeLeft > 0 ? (timeLeft / (minutes * 60)) * 100 : 0;

  return (
    <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow">
      
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--light-blue)' }}
        >
          <Timer className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-foreground text-xl">Countdown</h3>
      </div>

      {/* NOT RUNNING STATE */}
      {!isRunning ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Minutes
            </label>

            <input
              type="number"
              value={minutes}
              onChange={(e) =>
                setMinutes(Math.max(1, parseInt(e.target.value) || 1))
              }
              min="1"
              max="120"
              className="w-full px-4 py-3 rounded-xl bg-input-background border-2 border-border text-black outline-none focus:border-primary transition-colors text-base"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md border-2 border-transparent hover:border-white/30"
            style={{ background: 'var(--light-blue)', color: '#ffffff' }}
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </motion.button>
        </div>
      ) : (
        /* RUNNING STATE */
        <div className="space-y-4">
          <div className="relative">
            <div className="text-3xl sm:text-4xl font-mono text-center mb-4 text-foreground">
              {formatTime(timeLeft)}
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden border-2 border-border">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--light-blue)' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStop}
            className="w-full px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md border-2 border-transparent hover:border-white/30"
            style={{ background: 'var(--soft-red)', color: '#ffffff' }}
          >
            <Square className="w-4 h-4" />
            <span>Stop</span>
          </motion.button>
        </div>
      )}
    </div>
  );
}