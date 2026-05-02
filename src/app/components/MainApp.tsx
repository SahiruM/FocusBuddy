import { useState, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc, deleteDoc, addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { StatsSection } from './StatsSection';
import { Header } from './Header';
import { CountdownTimer } from './CountdownTimer';
import { motion } from 'motion/react';
import { Play, Square, Pause, Wifi, WifiOff } from 'lucide-react';

export interface Task {
  id: string;
  name: string;
  color: string;
}

export interface StudySession {
  id?: string;
  taskId: string;
  duration: number;
  date: string;
  hour?: number;
  createdAt?: string;
  synced?: boolean;
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);
  const pendingSessionsRef = useRef<StudySession[]>([]);

  // ─── ONLINE / OFFLINE DETECTION ─────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── LOAD TIMER STATE (Local + Firebase) ────────────────────────
  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      // Try Firebase first
      if (navigator.onLine) {
        try {
          const snap = await getDoc(doc(db, "timers", userId));
          if (snap.exists()) {
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
            return;
          }
        } catch (e) {
          console.warn("Firebase load failed, falling back to local");
        }
      }

      // Fallback to localStorage
      const localTimer = localStorage.getItem(`timer_${userId}`);
      if (localTimer) {
        const data = JSON.parse(localTimer);
        setActiveTaskId(data.taskId || '1');
        setIsStudying(data.isRunning || false);
        setIsPaused(data.isPaused || false);
        setElapsedTime(data.elapsedTime || 0);
        elapsedBeforePauseRef.current = data.elapsedBeforePause || 0;
        startTimeRef.current = data.startTime || null;
      }
      setTimerLoaded(true);
    };

    loadData();
  }, [userId]);

  // ─── LOAD SESSIONS ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    // Load from localStorage
    const localSessions = localStorage.getItem(`sessions_${userId}`);
    if (localSessions) {
      setStudySessions(JSON.parse(localSessions));
    }

    // Firebase real-time (only when online)
    if (navigator.onLine) {
      const q = query(collection(db, "sessions"), where("userId", "==", userId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fbSessions: StudySession[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data() as any,
          synced: true,
        }));
        setStudySessions(prev => {
          const merged = [...prev.filter(s => !s.synced), ...fbSessions];
          localStorage.setItem(`sessions_${userId}`, JSON.stringify(merged));
          return merged;
        });
      });

      return () => unsubscribe();
    }
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

  // ─── AUTO SAVE TO LOCALSTORAGE (Always) ─────────────────────────
  useEffect(() => {
    if (!userId || !timerLoaded) return;

    const timerData = {
      taskId: activeTaskId,
      isRunning: isStudying,
      isPaused: isPaused,
      elapsedTime,
      elapsedBeforePause: isPaused ? elapsedTime : elapsedBeforePauseRef.current,
      startTime: isStudying && !isPaused ? startTimeRef.current : null,
    };

    localStorage.setItem(`timer_${userId}`, JSON.stringify(timerData));
  }, [userId, timerLoaded, activeTaskId, isStudying, isPaused, elapsedTime]);

  // ─── SAVE TO FIREBASE WHEN ONLINE ───────────────────────────────
  useEffect(() => {
    if (!userId || !timerLoaded || !isOnline) return;

    const saveToFirebase = async () => {
      if (!activeTaskId) return;

      const timerData: any = {
        taskId: activeTaskId,
        isRunning: isStudying,
        isPaused: isPaused,
        elapsedBeforePause: isPaused ? elapsedTime : elapsedBeforePauseRef.current,
      };

      if (isStudying && !isPaused && startTimeRef.current) {
        timerData.startTime = startTimeRef.current;
      }

      try {
        await setDoc(doc(db, "timers", userId), timerData);
      } catch (error) {
        console.error("Failed to save timer to Firebase:", error);
      }
    };

    const timeout = setTimeout(saveToFirebase, 600);
    return () => clearTimeout(timeout);
  }, [userId, timerLoaded, activeTaskId, isStudying, isPaused, elapsedTime, isOnline]);

  // ─── SYNC PENDING SESSIONS ───────────────────────────────────────
  const syncPendingData = async () => {
    const unsynced = studySessions.filter(s => !s.synced && s.duration > 0);
    if (unsynced.length === 0) return;

    for (const session of unsynced) {
      try {
        await addDoc(collection(db, "sessions"), {
          userId,
          taskId: session.taskId,
          duration: session.duration,
          date: session.date,
          hour: session.hour,
          createdAt: session.createdAt,
        });
        // Mark as synced locally
        setStudySessions(prev =>
          prev.map(s => s.createdAt === session.createdAt ? { ...s, synced: true } : s)
        );
      } catch (e) {
        console.error("Failed to sync session", e);
      }
    }
  };

  // ─── SAVE SESSION ───────────────────────────────────────────────
  const saveCurrentSession = async (taskId: string, duration: number) => {
    if (duration <= 0) return;

    const now = new Date();
    const newSession: StudySession = {
      taskId,
      duration,
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      createdAt: now.toISOString(),
      synced: isOnline,
    };

    const updatedSessions = [...studySessions, newSession];
    setStudySessions(updatedSessions);
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(updatedSessions));

    if (isOnline) {
      await addDoc(collection(db, "sessions"), {
        userId,
        ...newSession,
      });
    }
  };

  // Rest of your functions remain mostly the same...

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

    if (isOnline) {
      await deleteDoc(doc(db, "timers", userId));
    }

    startTimeRef.current = null;
    elapsedBeforePauseRef.current = 0;
    setIsStudying(false);
    setIsPaused(false);
    setElapsedTime(0);
  };

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

      {/* Connection Status Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-sm">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-green-400">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-amber-500" />
            <span className="text-amber-400">Offline • Saving locally</span>
          </>
        )}
      </div>

      {/* Full Screen Timer (unchanged) */}
      {isFullScreen && (
        /* ... your existing full screen timer code ... */
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center">
          {/* ... rest of your full screen UI ... */}
          <button
            onClick={toggleFullScreenTimer}
            className="fixed top-4 right-4 z-[120] px-4 py-2 rounded-xl bg-black/50 backdrop-blur border border-white/10 text-white text-sm active:scale-95"
          >
            Exit
          </button>
          {/* ... timer display ... */}
        </div>
      )}

      {/* Normal App */}
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