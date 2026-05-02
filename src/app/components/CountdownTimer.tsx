import { useState, useEffect } from 'react';
import { Timer, Play, Square } from 'lucide-react';
import { motion } from 'motion/react';

export function CountdownTimer() {
  const [minutes, setMinutes] = useState(25);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    let interval: number | undefined;

    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    setTimeLeft(minutes * 60);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timeLeft > 0 ? (timeLeft / (minutes * 60)) * 100 : 0;

  return (
    <div className="bg-card border-2 border-border rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg cute-shadow">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--light-blue)' }}>
          <Timer className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-foreground text-xl">Countdown</h3>
      </div>

      {!isRunning ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">
              Minutes
            </label>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="120"
className="w-full px-4 py-3 rounded-xl bg-input-background border-2 border-border text-black outline-none focus:border-primary transition-colors text-base"            />
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
        <div className="space-y-4">
          <div className="relative">
            <div className="text-3xl sm:text-4xl font-mono text-center mb-4 text-foreground">
              {formatTime(timeLeft)}
            </div>

            <div className="h-3 bg-muted rounded-full overflow-hidden border-2 border-border">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--light-blue)' }}
                initial={{ width: '100%' }}
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
