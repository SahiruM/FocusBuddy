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
  createdAt?: string;
}

interface MainAppProps {
  userName: string;
  onLogout?: () => void;
  onShowLogin?: () => void;
  isLoggedIn?: boolean;
  userId: string;
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', name: 'Biology', color: '#b8e6d5' },
  { id: '2', name: 'Chemistry', color: '#a8d5ff' },
  { id: '3', name: 'Physics', color: '#ffb3c6' },
];

export function MainApp({ userName, onLogout, onShowLogin, isLoggedIn, userId }: MainAppProps) {
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [activeTaskId, setActiveTaskId] = useState<string | null>('1');
  const [isStudying, setIsStudying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [showCountdown, setShowCountdown] = useState(false);
  const [timerLoaded, setTimerLoaded] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // ── VISIBILITY CHANGE (screen lock / tab switch fix) ───────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStudying && !isPaused) {
        const now = Date.now();
        const correct = elapsedBeforePauseRef.current +
          Math.floor((now - startTimeRef.current!) / 1000);
        setElapsedTime(correct);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStudying, isPaused]);

  // ── LOAD TASKS FROM FIRESTORE (real-time) ──────────────────────────────────
  // Using onSnapshot so task changes on one device instantly reflect on the other
  useEffect(() => {
    if (!userId) return;
    const taskDocRef = doc(db, "userTasks", userId);
    const unsubscribe = onSnapshot(taskDocRef, async (snap) => {
      if (snap.exists()) {
        const loadedTasks = snap.data().tasks as Task[];
        setTasks(loadedTasks);
        // If active task was deleted on another device, fall back to first task
        setActiveTaskId(prev => {
          if (prev && loadedTasks.find(t => t.id === prev)) return prev;
          return loadedTasks[0]?.id ?? null;
        });
      } else {
        // First time user — save defaults to Firestore
        await setDoc(taskDocRef, { tasks: DEFAULT_TASKS });
        setTasks(DEFAULT_TASKS);
        setActiveTaskId('1');
      }
      setTasksLoaded(true);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── LOAD TIMER FROM FIRESTORE (real-time) ──────────────────────────────────
  // onSnapshot means if you start a timer on your phone, your laptop sees it instantly
  useEffect(() => {
    if (!userId) return;
    const timerDocRef = doc(db, "timers", userId);
    const unsubscribe = onSnapshot(timerDocRef, (snap) => {
      if (!snap.exists()) {
        // Timer was deleted (stopped) on another device
        startTimeRef.current = null;
        elapsedBeforePauseRef.current = 0;
        setIsStudying(false);
        setIsPaused(false);
        setElapsedTime(0);
        setTimerLoaded(true);
        return;
      }
      const data = snap.data();

      // Only sync state from Firestore if we're not the ones who just wrote it.
      // We always update activeTaskId so both devices stay in sync.
      setActiveTaskId(data.taskId);
      setIsStudying(data.isRunning);
      setIsPaused(data.isPaused);

      if (data.isPaused) {
        elapsedBeforePauseRef.current = data.elapsedBeforePause;
        setElapsedTime(data.elapsedBeforePause);
        startTimeRef.current = null;
      } else if (data.isRunning) {
        const now = Date.now();
        const elapsed = data.elapsedBeforePause + Math.floor((now - data.startTime) / 1000);
        elapsedBeforePauseRef.current = data.elapsedBeforePause;
        startTimeRef.current = data.startTime;
        setElapsedTime(elapsed);
      }

      setTimerLoaded(true);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── LOAD SESSIONS FROM FIRESTORE (real-time) ───────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "sessions"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions: StudySession[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          taskId: data.taskId,
          duration: data.duration,
          date: data.date,
          hour: data.hour,
          createdAt: data.createdAt,
        };
      });
      setStudySessions(sessions);
    });
    return () => unsubscribe();
  }, [userId]);

  // ── LOCAL TIMER TICK ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerLoaded) return;
    let interval: number | undefined;
    if (isStudying && !isPaused) {
      interval = window.setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isStudying, isPaused, timerLoaded]);

  // ── SAVE TASKS TO FIRESTORE ─────────────────────────────────────────────────
  const saveTasks = async (updatedTasks: Task[]) => {
    if (!userId) return;
    await setDoc(doc(db, "userTasks", userId), { tasks: updatedTasks });
  };

  // ── SWITCH TASK WHILE TIMER RUNNING ────────────────────────────────────────
  const handleSelectTask = async (taskId: string) => {
    if (taskId === activeTaskId) return; // no-op if same task
    if (isStudying && activeTaskId && elapsedTime > 0) {
      // Save current progress as a partial session before switching
      const now = new Date();
      await addDoc(collection(db, "sessions"), {
        userId,
        taskId: activeTaskId, // use state directly — no stale ref risk
        duration: elapsedTime,
        date: now.toISOString().split('T')[0],
        hour: now.getHours(),
        createdAt: now.toISOString(),
      });
      // Reset elapsed for new task
      const newNow = Date.now();
      startTimeRef.current = newNow;
      elapsedBeforePauseRef.current = 0;
      setElapsedTime(0);
      // Update Firestore timer with new task — other device picks this up via onSnapshot
      await setDoc(doc(db, "timers", userId), {
        taskId,
        isRunning: true,
        isPaused: false,
        startTime: newNow,
        elapsedBeforePause: 0,
      });
    }
    setActiveTaskId(taskId);
  };

  // ── START ───────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    if (!activeTaskId) return;
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

  // ── PAUSE ───────────────────────────────────────────────────────────────────
  const handlePause = async () => {
    elapsedBeforePauseRef.current = elapsedTime;
    setIsPaused(true);
    await setDoc(doc(db, "timers", userId), {
      taskId: activeTaskId,
      isRunning: true,
      isPaused: true,
      startTime: null,
      elapsedBeforePause: elapsedTime,
    });
  };

  // ── RESUME ──────────────────────────────────────────────────────────────────
  const handleResume = async () => {
    const now = Date.now();
    startTimeRef.current = now;
    setIsPaused(false);
    await setDoc(doc(db, "timers", userId), {
      taskId: activeTaskId,
      isRunning: true,
      isPaused: false,
      startTime: now,
      elapsedBeforePause: elapsedTime,
    });
  };

  // ── STOP ────────────────────────────────────────────────────────────────────
  const handleStop = async () => {
    if (isStudying && activeTaskId && elapsedTime > 0) {
      const now = new Date();
      await addDoc(collection(db, "sessions"), {
        userId,
        taskId: activeTaskId, // read from state directly — no stale ref
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

  // ── ADD TASK ────────────────────────────────────────────────────────────────
  const handleAddTask = async (taskName: string) => {
    if (!userId) return;
    const colors = ['#9b87d6', '#a8d5ff', '#ffb3c6', '#b8e6d5', '#ffd4e5', '#c8f0b0', '#ffd7a0'];
    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName,
      color: colors[tasks.length % colors.length],
    };
    const updated = [...tasks, newTask];
    setTasks(updated);
    await saveTasks(updated);
  };

  // ── DELETE TASK ─────────────────────────────────────────────────────────────
  const handleDeleteTask = async (taskId: string) => {
    if (!userId) return;
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    await saveTasks(updated);
    if (activeTaskId === taskId) {
      setActiveTaskId(updated[0]?.id ?? null);
    }
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  // Wait for both tasks and timer to load before rendering
  if (!timerLoaded || !tasksLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-3xl mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }}
          />
          <p className="text-muted-foreground">Loading your session... 💫</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <Header
        onLogout={onLogout}
        onShowLogin={onShowLogin}
        userName={userName}
        isLoggedIn={isLoggedIn}
      />
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 sm:gap-6">

          {/* LEFT COLUMN — Tasks + Countdown */}
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
            <div className="hidden lg:block">
              <CountdownTimer />
            </div>
            {showCountdown && (
              <div className="lg:hidden">
                <CountdownTimer />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN — Timer + Stats */}
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