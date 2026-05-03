import { Play, Square, Pause, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { Task } from './MainApp';

interface TimerProps {
  activeTask?: Task;
  isStudying: boolean;
  isPaused: boolean;
  elapsedTime: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onFullScreen: () => void;
}

export function Timer({
  activeTask,
  isStudying,
  isPaused,
  elapsedTime,
  onStart,
  onPause,
  onResume,
  onStop,
  onFullScreen,
}: TimerProps) {

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Detect if we're currently in fullscreen
  // Works on both Electron (document.fullscreenElement) and Android (falls back gracefully)
  const isCurrentlyFullscreen = !!document.fullscreenElement;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      <div
        className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-border shadow-lg cute-shadow relative"
        style={{
          background: isStudying
            ? `linear-gradient(135deg, ${activeTask?.color}15 0%, ${activeTask?.color}05 100%)`
            : 'var(--card)',
        }}
      >
        {/* Fullscreen Toggle Button - Top Left */}
        {/* Uses try/catch in parent so safe on Android + Windows both */}
        <button
          onClick={onFullScreen}
          className="absolute top-6 left-6 z-20 p-3 rounded-xl bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-all hover:scale-110 active:scale-95"
          title={isCurrentlyFullscreen ? 'Exit Fullscreen' : 'Fullscreen Timer'}
        >
          {isCurrentlyFullscreen
            ? <Minimize2 className="w-5 h-5" />
            : <Maximize2 className="w-5 h-5" />
          }
        </button>

        {/* Animated glow when studying */}
        {isStudying && (
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${activeTask?.color}20 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <div className="relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            {activeTask && (
              <div className="inline-flex items-center gap-2 mb-3 sm:mb-4 px-4 py-1.5 rounded-full border-2 border-border bg-background/50">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeTask.color }}
                />
                <span className="text-sm text-muted-foreground hand-drawn">{activeTask.name}</span>
              </div>
            )}

            <div className="mb-3">
              <div className="text-5xl sm:text-6xl md:text-7xl font-mono tracking-tight text-foreground">
                {formatTime(elapsedTime)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  isStudying && !isPaused ? 'animate-pulse' : ''
                }`}
                style={{
                  backgroundColor: isStudying && !isPaused
                    ? 'var(--soft-green)'
                    : isPaused
                    ? 'var(--chart-4)'
                    : 'var(--muted-foreground)',
                }}
              />
              <span className="text-sm text-muted-foreground">
                {isStudying ? (isPaused ? 'Paused' : 'Studying') : 'Ready'}
              </span>
            </div>
          </div>

          {/* Timer Control Buttons */}
          <div className="flex gap-2 sm:gap-3 justify-center flex-wrap">
            {!isStudying ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStart}
                disabled={!activeTask}
                className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center border-2 border-transparent hover:border-white/30"
                style={{
                  background: activeTask ? 'var(--soft-green)' : 'var(--muted)',
                  color: '#ffffff',
                }}
              >
                <Play className="w-5 h-5" />
                <span>Start</span>
              </motion.button>
            ) : (
              <>
                {isPaused ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onResume}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center gap-2 transition-all shadow-md min-w-[100px] justify-center border-2 border-transparent hover:border-white/30"
                    style={{
                      background: 'var(--soft-green)',
                      color: '#ffffff',
                    }}
                  >
                    <Play className="w-5 h-5" />
                    <span>Resume</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onPause}
                    className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center gap-2 transition-all shadow-md min-w-[100px] justify-center border-2 border-transparent hover:border-white/30"
                    style={{
                      background: 'var(--chart-4)',
                      color: '#ffffff',
                    }}
                  >
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </motion.button>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStop}
                  className="px-6 sm:px-8 py-3 sm:py-4 rounded-2xl flex items-center gap-2 transition-all shadow-md min-w-[100px] justify-center border-2 border-transparent hover:border-white/30"
                  style={{
                    background: 'var(--soft-red)',
                    color: '#ffffff',
                  }}
                >
                  <Square className="w-5 h-5" />
                  <span>Stop</span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}