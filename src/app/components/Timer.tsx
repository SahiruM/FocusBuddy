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
          isFullscreen 
            ? 'min-h-screen bg-black/95 backdrop-blur-xl rounded-none border-none' 
            : 'p-6 sm:p-8 md:p-12'
        }`}
        style={{
          background: isFullscreen 
            ? 'black' 
            : isStudying 
              ? `linear-gradient(135deg, ${activeTask?.color}15 0%, ${activeTask?.color}05 100%)` 
              : 'var(--card)',
        }}
      >
        {/* Fullscreen Toggle Button */}
        <button
          onClick={onFullscreen}
          className={`absolute z-30 p-3 rounded-full transition-all hover:bg-white/10 ${isFullscreen ? 'top-8 right-8' : 'top-4 right-4'}`}
        >
          {isFullscreen ? 
            <Minimize2 className="w-6 h-6 text-white" /> : 
            <Maximize2 className="w-5 h-5" />
          }
        </button>

        {isStudying && !isFullscreen && (
          <motion.div
            className="absolute inset-0 rounded-3xl"
            style={{ background: `radial-gradient(circle at 50% 50%, ${activeTask?.color}20 0%, transparent 70%)` }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <div className={`relative z-10 flex flex-col items-center justify-center ${isFullscreen ? 'min-h-screen' : ''}`}>
          
          {/* Task Name */}
          {activeTask && (
            <div className={`inline-flex items-center gap-2 mb-6 px-5 py-2 rounded-full border ${isFullscreen ? 'border-white/20 bg-white/5' : 'border-border bg-background/50'}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeTask.color }} />
              <span className={`text-lg ${isFullscreen ? 'text-white' : 'text-muted-foreground'}`}>
                {activeTask.name}
              </span>
            </div>
          )}

          {/* Big Timer */}
          <div className={`font-mono tracking-tighter text-center mb-8 ${isFullscreen ? 'text-[9rem] md:text-[12rem]' : 'text-6xl sm:text-7xl md:text-8xl'}`}>
            {formatTime(elapsedTime)}
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 mb-12">
            <div className={`w-3 h-3 rounded-full ${isStudying && !isPaused ? 'animate-pulse bg-green-400' : isPaused ? 'bg-yellow-400' : 'bg-gray-400'}`} />
            <span className={`text-lg ${isFullscreen ? 'text-white/80' : 'text-muted-foreground'}`}>
              {isStudying ? (isPaused ? 'Paused' : 'Studying') : 'Ready to Start'}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4">
            {!isStudying ? (
              <button
                onClick={onStart}
                disabled={!activeTask}
                className={`px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium transition-all ${isFullscreen ? 'text-black bg-white hover:bg-white/90' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                <Play className="w-6 h-6" fill="currentColor" />
                Start
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={onResume}
                    className={`px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium transition-all ${isFullscreen ? 'text-black bg-white hover:bg-white/90' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                  >
                    <Play className="w-6 h-6" fill="currentColor" />
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={onPause}
                    className="px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium bg-yellow-600 hover:bg-yellow-700 text-white transition-all"
                  >
                    <Pause className="w-6 h-6" fill="currentColor" />
                    Pause
                  </button>
                )}

                <button
                  onClick={onStop}
                  className="px-10 py-4 rounded-2xl flex items-center gap-3 text-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-all"
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