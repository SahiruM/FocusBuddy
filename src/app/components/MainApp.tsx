import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, deleteDoc, addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { StatsSection } from './StatsSection';
import { Header } from './Header';
import { CountdownTimer } from './CountdownTimer';
import { motion } from 'motion/react';
import { Play, Square, Pause } from 'lucide-react';

export interface Task {
  id: string;
  name: string;
  color: string;
}

export interface StudySession {
  taskId: string;
  duration: number;
  date: string;
  hour?: number;
  createdAt?: string;
}

interface MainAppProps {
  userName: string;
  onLogout?: () => void;
  onShowLogin?: () => void;
  isLoggedIn?: boolean;
  userId: string;
}

export function MainApp({ userName, onLogout, onShowLogin, isLoggedIn, userId }: MainAppProps) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', name: 'Math', color: '#9b87d6' },
    { id: '2', name: 'Physics', color: '#a8d5ff' },
    { id: '3', name: 'Papers', color: '#ffb3c6' },
  ]);

  const [activeTaskId, setActiveTaskId] = useState<string | null>('1');
  const [isStudying, setIsStudying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // ─── LOAD TIMER STATE ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const loadTimer = async () => {
      const snap = await getDoc(doc(db, "timers", userId));
      if (!snap.exists()) {
        setTimerLoaded(true);
        return;
      }

      const data = snap.data();
      setActiveTaskId(data.taskId || '1');
      setIsStudying(data.isRunning || false);
      setIsPaused(data.isPaused || false);

      if (data.isPaused) {
        elapsedBeforePauseRef.current = data.elapsedBeforePause || 0;
        setElapsedTime(data.elapsedBeforePause || 0);
      } else if (data.isRunning && data.startTime) {
        const now = Date.now();
        const elapsed = (data.elapsedBeforePause || 0) + Math.floor((now - data.startTime) / 1000);
        elapsedBeforePauseRef.current = data.elapsedBeforePause || 0;
        startTimeRef.current = data.startTime;
        setElapsedTime(elapsed);
      }

      setTimerLoaded(true);
    };

    loadTimer();
  }, [userId]);

  // ─── LOAD SESSIONS ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "sessions"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: StudySession[] = snapshot.docs.map(d => ({
        taskId: d.data().taskId,
        duration: d.data().duration,
        date: d.data().date,
        hour: d.data().hour,
        createdAt: d.data().createdAt,
      }));
      setStudySessions(sessions);
    });

    return () => unsubscribe();
  }, [userId]);

  // ─── LOCAL TIMER ─────────────────────────────────────────────────
  useEffect(() => {
    if (!timerLoaded) return;
    let interval: NodeJS.Timeout | undefined;

    if (isStudying && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStudying, isPaused, timerLoaded]);

  // ─── AUTO SYNC TO FIREBASE ───────────────────────────────────────
  useEffect(() => {
    if (!userId || !timerLoaded) return;

    const saveTimerState = async () => {
      if (!activeTaskId) return;

      const timerData: any = {
        taskId: activeTaskId,
        isRunning: isStudying,
        isPaused: isPaused,
        elapsedBeforePause: isPaused ? elapsedTime : elapsedBeforePauseRef.current,
      };

      if (isStudying && !isPaused && startTimeRef.current) {
        timerData.startTime = startTimeRef.current;
      } else {
        timerData.startTime = null;
      }

      try {
        await setDoc(doc(db, "timers", userId), timerData);
      } catch (error) {
        console.error("Failed to save timer state:", error);
      }
    };

    const timeout = setTimeout(saveTimerState, 400);
    return () => clearTimeout(timeout);
  }, [userId, timerLoaded, activeTaskId, isStudying, isPaused, elapsedTime]);

  // ─── FULLSCREEN LISTENER ───────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ─── SAVE SESSION ───────────────────────────────────────────────
  const saveCurrentSession = async (taskId: string, duration: number) => {
    if (duration <= 0) return;

    const now = new Date();
    await addDoc(collection(db, "sessions"), {
      userId,
      taskId,
      duration,
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      createdAt: now.toISOString(),
    });
  };

  // ─── HANDLE TASK CHANGE ──────────────────────────────────────────
  const handleSelectTask = async (newTaskId: string) => {
    if (newTaskId === activeTaskId) return;

    if (isStudying && elapsedTime > 0) {
      await saveCurrentSession(activeTaskId!, elapsedTime);
    }

    const wasStudying = isStudying;
    setElapsedTime(0);
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = wasStudying ? Date.now() : null;
    setActiveTaskId(newTaskId);

    if (wasStudying) setIsPaused(false);
  };

  // ─── TIMER CONTROLS ──────────────────────────────────────────────
  const handleStart = () => {
    const now = Date.now();
    startTimeRef.current = now;
    elapsedBeforePauseRef.current = 0;
    setIsStudying(true);
    setIsPaused(false);
    setElapsedTime(0);
  };

  const handlePause = () => {
    elapsedBeforePauseRef.current = elapsedTime;
    setIsPaused(true);
  };

  const handleResume = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const handleStop = async () => {
    if (isStudying && activeTaskId && elapsedTime > 0) {
      await saveCurrentSession(activeTaskId, elapsedTime);
    }
    await deleteDoc(doc(db, "timers", userId));
    startTimeRef.current = null;
    elapsedBeforePauseRef.current = 0;
    setIsStudying(false);
    setIsPaused(false);
    setElapsedTime(0);
  };

  // ─── FULL SCREEN TOGGLE ──────────────────────────────────────────
  const toggleFullScreenTimer = async () => {
    if (!document.fullscreenElement) {
      try {
        setIsFullScreen(true);
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.error("Fullscreen failed", err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // ─── TASK MANAGEMENT ─────────────────────────────────────────────
  const handleAddTask = (taskName: string) => {
    const colors = ['#9b87d6', '#a8d5ff', '#ffb3c6', '#b8e6d5', '#ffd4e5'];
    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName,
      color: colors[tasks.length % colors.length],
    };
    setTasks([...tasks, newTask]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    if (activeTaskId === taskId) {
      setActiveTaskId(tasks[0]?.id || null);
    }
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  if (!timerLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your session... 💫</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Header onLogout={onLogout} onShowLogin={onShowLogin} userName={userName} isLoggedIn={isLoggedIn} />

{/* ==================== FULL SCREEN TIMER ==================== */}
{isFullScreen && (
  <div className="fixed inset-0 bg-zinc-950 z-[100] flex items-center justify-center p-4 sm:p-6">
    <div 
      className="w-full max-w-4xl rounded-3xl p-6 sm:p-10 md:p-14 border border-border shadow-2xl relative overflow-hidden"
      style={{
        background: isStudying
          ? `linear-gradient(135deg, ${activeTask?.color}12 0%, ${activeTask?.color}03 100%)`
          : 'var(--card)',
      }}
    >
      {/* Soft Glow (less aggressive) */}
      {isStudying && (
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${activeTask?.color}18 0%, transparent 70%)`
          }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div className="relative z-10 text-center flex flex-col items-center">
        
        {/* Active Task */}
        {activeTask && (
          <div className="mb-6 px-4 py-2 rounded-full border border-border bg-background/60 backdrop-blur flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: activeTask.color }} 
            />
            <span className="text-base sm:text-lg font-medium">
              {activeTask.name}
            </span>
          </div>
        )}

        {/* TIMER */}
        <div className="mb-8 sm:mb-10 w-full">
          <div className="font-mono font-bold tracking-tight tabular-nums leading-none
            text-[64px] sm:text-[110px] md:text-[150px] lg:text-[180px]">
            
            {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:
            {Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')}:
            {(elapsedTime % 60).toString().padStart(2, '0')}
          </div>
        </div>

        {/* STATUS */}
        <div className="flex items-center gap-3 mb-8 sm:mb-10">
          <div
            className={`w-3 h-3 rounded-full ${
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
          <span className="text-lg sm:text-xl text-muted-foreground">
            {isStudying ? (isPaused ? 'Paused' : 'Studying') : 'Ready'}
          </span>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center w-full">
          {!isStudying ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStart}
              className="px-6 sm:px-10 py-4 sm:py-5 rounded-2xl flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-medium shadow-md"
              style={{ background: 'var(--soft-green)', color: '#fff' }}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6" />
              Start
            </motion.button>
          ) : (
            <>
              {isPaused ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleResume}
                  className="px-6 sm:px-10 py-4 sm:py-5 rounded-2xl flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-medium shadow-md"
                  style={{ background: 'var(--soft-green)', color: '#fff' }}
                >
                  <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                  Resume
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePause}
                  className="px-6 sm:px-10 py-4 sm:py-5 rounded-2xl flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-medium shadow-md"
                  style={{ background: 'var(--chart-4)', color: '#fff' }}
                >
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                  Pause
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="px-6 sm:px-10 py-4 sm:py-5 rounded-2xl flex items-center gap-2 sm:gap-3 text-lg sm:text-xl font-medium shadow-md"
                style={{ background: 'var(--soft-red)', color: '#fff' }}
              >
                <Square className="w-5 h-5 sm:w-6 sm:h-6" />
                Stop & Save
              </motion.button>
            </>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFullScreenTimer}
            className="px-6 sm:px-8 py-4 sm:py-5 rounded-2xl flex items-center gap-2 text-lg sm:text-xl font-medium border border-border hover:bg-accent"
          >
            Exit
          </motion.button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* ==================== NORMAL APP ==================== */}
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6 lg:order-1 order-2">
            <TaskList
              tasks={tasks}
              activeTaskId={activeTaskId}
              onSelectTask={handleSelectTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />

            <div className="lg:hidden">
              <button
                onClick={() => setShowCountdown(!showCountdown)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-card hover:bg-accent transition-colors active:scale-95"
              >
                {showCountdown ? 'Hide' : 'Show'} Countdown Timer
              </button>
            </div>

            {(showCountdown || window.innerWidth >= 1024) && <CountdownTimer />}
          </div>

          <div className="space-y-4 sm:space-y-6 lg:order-2 order-1">
            <Timer
              activeTask={activeTask}
              isStudying={isStudying}
              isPaused={isPaused}
              elapsedTime={elapsedTime}
              onStart={handleStart}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              onFullScreen={toggleFullScreenTimer}
            />

            <StatsSection studySessions={studySessions} tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}