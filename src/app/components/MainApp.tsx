import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, deleteDoc, addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { StatsSection } from './StatsSection';
import { Header } from './Header';
import { CountdownTimer } from './CountdownTimer';

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
  tag: string;        // ← add this (subject name)
  createdAt?: string;
}
interface MainAppProps {
  userName: string;
  onLogout?: () => void;
  onShowLogin?: () => void;
  isLoggedIn?: boolean;
  userId: string; // pass firebase auth uid from App.tsx
}

export function MainApp({ userName, onLogout, onShowLogin, isLoggedIn, userId }: MainAppProps) {
const [tasks, setTasks] = useState<Task[]>([
  { id: '1', name: 'Biology', color: '#86efac' },
  { id: '2', name: 'Physics', color: '#a8d5ff' },
  { id: '3', name: 'Chemistry', color: '#fde68a' },
]);

  const [activeTaskId, setActiveTaskId] = useState<string | null>('1');
  const [isStudying, setIsStudying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);

  // We use a ref to track startTime so the interval always has the latest value
  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // ─── LOAD TIMER STATE FROM FIREBASE ON MOUNT ───────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const loadTimer = async () => {
      const snap = await getDoc(doc(db, "timers", userId));
      if (!snap.exists()) {
        setTimerLoaded(true);
        return;
      }

      const data = snap.data();
      setActiveTaskId(data.taskId);
      setIsStudying(data.isRunning);
      setIsPaused(data.isPaused);

      if (data.isPaused) {
        // Timer was paused — restore exact elapsed time
        elapsedBeforePauseRef.current = data.elapsedBeforePause;
        setElapsedTime(data.elapsedBeforePause);
      } else if (data.isRunning) {
        // Timer was running — calculate how much time passed since last save
        const now = Date.now();
        const elapsed = data.elapsedBeforePause + Math.floor((now - data.startTime) / 1000);
        elapsedBeforePauseRef.current = data.elapsedBeforePause;
        startTimeRef.current = data.startTime;
        setElapsedTime(elapsed);
      }

      setTimerLoaded(true);
    };

    loadTimer();
  }, [userId]);

  // ─── LOAD SESSIONS FROM FIREBASE ───────────────────────────────────────────
useEffect(() => {
  if (!userId) return;

  const q = query(
    collection(db, "sessions"),
    where("userId", "==", userId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const sessions: StudySession[] = snapshot.docs.map(d => {
      const data = d.data();
      return {
        taskId: data.taskId,
        duration: data.duration,
            tag: data.tag ?? data.taskId,   // ← add this
        date: data.date, // must be "YYYY-MM-DD" string
      };
    });
    setStudySessions(sessions);
  });

  return () => unsubscribe();
}, [userId]);

  // ─── LOCAL TIMER TICK ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerLoaded) return;
    let interval: number | undefined;

    if (isStudying && !isPaused) {
      interval = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStudying, isPaused, timerLoaded]);

  // ─── START ──────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    const now = Date.now();
    startTimeRef.current = now;
    elapsedBeforePauseRef.current = 0;

    setIsStudying(true);
    setIsPaused(false);
    setElapsedTime(0);

    await setDoc(doc(db, "timers", userId), {
      taskId: activeTaskId,
      isRunning: true,
      isPaused: false,
      startTime: now,
      elapsedBeforePause: 0,
    });
  };

  // ─── PAUSE ──────────────────────────────────────────────────────────────────
  const handlePause = async () => {
    elapsedBeforePauseRef.current = elapsedTime;
    setIsPaused(true);

    await setDoc(doc(db, "timers", userId), {
      taskId: activeTaskId,
      isRunning: true,
      isPaused: true,
      startTime: null,
      elapsedBeforePause: elapsedTime, // save exact seconds at pause
    });
  };

  // ─── RESUME ─────────────────────────────────────────────────────────────────
  const handleResume = async () => {
    const now = Date.now();
    startTimeRef.current = now;
    setIsPaused(false);

    await setDoc(doc(db, "timers", userId), {
      taskId: activeTaskId,
      isRunning: true,
      isPaused: false,
      startTime: now,
      elapsedBeforePause: elapsedTime, // current elapsed becomes the new base
    });
  };

  // ─── STOP ───────────────────────────────────────────────────────────────────
const handleStop = async () => {
  if (isStudying && activeTaskId && elapsedTime > 0) {
    const now = new Date();
    const activeTask = tasks.find(t => t.id === activeTaskId);
    await addDoc(collection(db, "sessions"), {
      userId,
      taskId: activeTaskId,
      tag: activeTask?.name ?? 'Unknown',   // ← add this
      duration: elapsedTime,
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      createdAt: now.toISOString(),
    });
  }
  await deleteDoc(doc(db, "timers", userId));
  startTimeRef.current = null;
  elapsedBeforePauseRef.current = 0;
  setIsStudying(false);
  setIsPaused(false);
  setElapsedTime(0);
};
  // ─── TASKS ──────────────────────────────────────────────────────────────────
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

  // Don't render until timer is loaded from Firebase to avoid flicker
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

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6 lg:order-1 order-2">
            <TaskList
              tasks={tasks}
              activeTaskId={activeTaskId}
              onSelectTask={setActiveTaskId}
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

            {(showCountdown || window.innerWidth >= 1024) && (
              <CountdownTimer />
            )}
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
            />

            <StatsSection studySessions={studySessions} tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}