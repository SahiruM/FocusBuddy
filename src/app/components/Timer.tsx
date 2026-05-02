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
  onFullscreen: () => void;
  isFullscreen: boolean;
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
  onFullscreen,
  isFullscreen 
}: TimerProps) {

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      id="timer-main"
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div
        className={`rounded-3xl border-2 border-border shadow-lg cute-shadow transition-all duration-300 ${
          isFullscreen ? 'min-h-screen rounded-none' : 'p-6 sm:p-8 md:p-12'
        }`}
        style={{
          background: isStudying
            ? `linear-gradient(135deg, ${activeTask?.color}15 0%, ${activeTask?.color}05 100%)`
            : 'var(--card)',
        }}
      >
        {/* Fullscreen Button */}
        <button
          onClick={onFullscreen}
          className={`absolute z-30 p-3 rounded-full transition-all hover:bg-white/10 ${isFullscreen ? 'top-8 right-8' : 'top-4 right-4'}`}
        >
          {isFullscreen ? 
            <Minimize2 className="w-6 h-6" /> : 
            <Maximize2 className="w-5 h-5" />
          }
        </button>

        {/* Breathing Background Effect */}
        {isStudying && (
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${activeTask?.color}20 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <div className={`relative z-10 flex flex-col items-center justify-center ${isFullscreen ? 'min-h-screen py-12' : ''}`}>

          {/* Task Name */}
          {activeTask && (
            <div className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full border-2 border-border bg-background/70">
              <div 
                className="w-3.5 h-3.5 rounded-full" 
                style={{ backgroundColor: activeTask.color }} 
              />
              <span className="text-lg font-medium text-foreground">{activeTask.name}</span>
            </div>
          )}

          {/* Timer Display */}
          <div className={`font-mono tracking-[-4px] text-center mb-10 ${isFullscreen ? 'text-[7.5rem] sm:text-[9rem] md:text-[11rem]' : 'text-6xl sm:text-7xl md:text-[5.5rem]'}`}>
            {formatTime(elapsedTime)}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 mb-12">
            <div 
              className={`w-3 h-3 rounded-full transition-all ${isStudying && !isPaused ? 'animate-pulse' : ''}`}
              style={{ 
                backgroundColor: isStudying && !isPaused ? 'var(--soft-green)' : 
                                 isPaused ? 'var(--chart-4)' : 'var(--muted-foreground)' 
              }} 
            />
            <span className="text-lg text-foreground">
              {isStudying ? (isPaused ? 'Paused' : 'Studying') : 'Ready'}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 flex-wrap justify-center">
            {!isStudying ? (
              <button
                onClick={onStart}
                disabled={!activeTask}
                className="px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium transition-all shadow-md disabled:opacity-50"
                style={{
                  background: activeTask ? 'var(--soft-green)' : 'var(--muted)',
                  color: '#ffffff',
                }}
              >
                <Play className="w-6 h-6" />
                Start
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className="px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium transition-all shadow-md"
                    style={{ background: 'var(--soft-green)', color: '#ffffff' }}
                  >
                    <Play className="w-6 h-6" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium transition-all shadow-md"
                    style={{ background: 'var(--chart-4)', color: '#ffffff' }}
                  >
                    <Pause className="w-6 h-6" />
                    Pause
                  </button>
                )}

                <button
                  onClick={onStop}
                  className="px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium transition-all shadow-md"
                  style={{ background: 'var(--soft-red)', color: '#ffffff' }}
                >
                  <Square className="w-6 h-6" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}