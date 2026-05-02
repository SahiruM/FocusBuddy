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
    { id: '1', name: 'Bio', color: '#9b87d6' },
    { id: '2', name: 'Physics', color: '#a8d5ff' },
    { id: '3', name: 'Chem', color: '#ffb3c6' },
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

  const update = () => {
    setElapsedTime(calculateElapsed());
  };

  update(); // immediate sync

  const interval = setInterval(update, 1000);

  return () => clearInterval(interval);
}, [isStudying, isPaused, timerLoaded]);
const calculateElapsed = () => {
  if (!isStudying) return elapsedBeforePauseRef.current;

  if (isPaused) return elapsedBeforePauseRef.current;

  if (!startTimeRef.current) return elapsedTime;

  const now = Date.now();
  return elapsedBeforePauseRef.current + Math.floor((now - startTimeRef.current) / 1000);
};
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      setElapsedTime(calculateElapsed());
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () =>
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [isStudying, isPaused]);

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
  <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center">

    {/* BACKDROP GLOW (THEME BASED) */}
    <div
      className="absolute inset-0 opacity-40 blur-3xl"
      style={{
        background: activeTask?.color
          ? `radial-gradient(circle at 50% 40%, ${activeTask.color}55 0%, transparent 65%)`
          : 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.08), transparent 65%)',
      }}
    />

    {/* 🛑 MOBILE SAFE EXIT (always visible + thumb reachable) */}
    <button
      onClick={toggleFullScreenTimer}
      className="fixed top-4 right-4 z-[120] px-4 py-2 rounded-xl bg-black/50 backdrop-blur border border-white/10 text-white text-sm active:scale-95"
    >
      Exit
    </button>
{/* AESTHETIC BACKGROUND LAYERS */}
<div className="absolute inset-0 overflow-hidden">

  {/* Floating gradient blobs */}
  <div className="absolute -top-32 -left-32 w-[400px] h-[400px] rounded-full blur-3xl opacity-30 animate-float-slow"
    style={{ background: activeTask?.color || '#a8d5ff' }}
  />

  <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20 animate-float-medium"
    style={{ background: '#ffb3c6' }}
  />

  <div className="absolute bottom-[-200px] left-1/3 w-[450px] h-[450px] rounded-full blur-3xl opacity-20 animate-float-slow"
    style={{ background: '#b8e6d5' }}
  />

  {/* Soft noise overlay */}
  <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay bg-[url('/noise.png')]" />
</div>
    {/* MAIN TIMER CARD */}
    <div className="relative w-full max-w-3xl mx-4 text-center">

      {/* TASK LABEL */}
      {activeTask && (
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: activeTask.color }}
          />
          <span className="text-white/80 text-sm sm:text-base">
            {activeTask.name}
          </span>
        </div>
      )}

      {/* TIMER DISPLAY */}
      <div className="font-mono font-bold text-white tabular-nums leading-none
        text-[64px] sm:text-[120px] md:text-[150px]">

        {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:
        {Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')}:
        {(elapsedTime % 60).toString().padStart(2, '0')}
      </div>

      {/* STATUS */}
      <div className="mt-6 flex items-center justify-center gap-2 text-white/60">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isStudying && !isPaused ? 'animate-pulse' : ''
          }`}
          style={{
            backgroundColor:
              isStudying && !isPaused
                ? activeTask?.color || '#fff'
                : '#777',
          }}
        />
        <span className="text-sm sm:text-base">
          {isStudying ? (isPaused ? 'Paused' : 'Focused') : 'Ready'}
        </span>
      </div>

      {/* CONTROLS */}
      <div className="mt-10 flex flex-wrap justify-center gap-3">

        {!isStudying ? (
          <button
            onClick={handleStart}
            className="px-7 py-3 rounded-2xl text-white font-medium active:scale-95 shadow-lg"
            style={{ background: activeTask?.color || '#22c55e' }}
          >
            Start
          </button>
        ) : (
          <>
            {isPaused ? (
              <button
                onClick={handleResume}
                className="px-7 py-3 rounded-2xl text-white font-medium active:scale-95"
                style={{ background: activeTask?.color || '#22c55e' }}
              >
                Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-7 py-3 rounded-2xl text-white font-medium active:scale-95 bg-yellow-500"
              >
                Pause
              </button>
            )}

            <button
              onClick={handleStop}
              className="px-7 py-3 rounded-2xl text-white font-medium active:scale-95 bg-red-500"
            >
              Stop & Save
            </button>
          </>
        )}
      </div>

      {/* 🧠 MOBILE SAFETY HINT (VERY IMPORTANT UX FIX) */}
      <div className="mt-8 text-white/30 text-xs sm:text-sm">
        Tip: tap “Exit” anytime to leave focus mode
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