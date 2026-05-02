import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, deleteDoc, addDoc, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
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

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);
  const activeTaskIdRef = useRef<string | null>('1');

  // keep ref in sync so handleStop always has latest taskId
  useEffect(() => {
    activeTaskIdRef.current = activeTaskId;
  }, [activeTaskId]);

  // ── VISIBILITY CHANGE (screen lock fix) ────────────────────────────────────
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

  // ── LOAD TASKS FROM FIRESTORE ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const loadTasks = async () => {
      const snap = await getDoc(doc(db, "userTasks", userId));
      if (snap.exists()) {
        setTasks(snap.data().tasks as Task[]);
      }
    };
    loadTasks();
  }, [userId]);

  // ── LOAD TIMER FROM FIRESTORE ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const loadTimer = async () => {
      const snap = await getDoc(doc(db, "timers", userId));
      if (!snap.exists()) { setTimerLoaded(true); return; }
      const data = snap.data();
      setActiveTaskId(data.taskId);
      setIsStudying(data.isRunning);
      setIsPaused(data.isPaused);
      if (data.isPaused) {
        elapsedBeforePauseRef.current = data.elapsedBeforePause;
        setElapsedTime(data.elapsedBeforePause);
      } else if (data.isRunning) {
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

  // ── LOAD SESSIONS FROM FIRESTORE ───────────────────────────────────────────
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
    await setDoc(doc(db, "userTasks", userId), { tasks: updatedTasks });
  };

  // ── SWITCH TASK WHILE TIMER RUNNING ────────────────────────────────────────
  const handleSelectTask = async (taskId: string) => {
    if (isStudying && activeTaskIdRef.current && elapsedTime > 0) {
      // Save current progress as a partial session before switching
      const now = new Date();
      await addDoc(collection(db, "sessions"), {
        userId,
        taskId: activeTaskIdRef.current,
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

      // Update timer doc with new task
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
    if (isStudying && activeTaskIdRef.current && elapsedTime > 0) {
      const now = new Date();
      await addDoc(collection(db, "sessions"), {
        userId,
        taskId: activeTaskIdRef.current,
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
    const colors = ['#9b87d6', '#a8d5ff', '#ffb3c6', '#b8e6d5', '#ffd4e5'];
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
    const updated = tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    await saveTasks(updated);
    if (activeTaskId === taskId) setActiveTaskId(updated[0]?.id || null);
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  if (!timerLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }} />
          <p className="text-muted-foreground">Loading your session... 💫</p>
        </div>
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
            />
            <StatsSection studySessions={studySessions} tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}