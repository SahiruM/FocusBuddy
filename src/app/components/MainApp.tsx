import { useState, useEffect, useRef } from 'react';
import {
  doc, getDoc, deleteDoc, addDoc,
  collection,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Timer } from './Timer';
import { TaskList } from './TaskList';
import { StatsSection } from './StatsSection';
import { Header } from './Header';
import { CountdownTimer } from './CountdownTimer';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Network } from '@capacitor/network';

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
  createdAt: string;
  synced: boolean;
}

interface MainAppProps {
  userName: string;
  onLogout?: () => void;
  onShowLogin?: () => void;
  isLoggedIn?: boolean;
  userId: string;
}

// Detect platform once at module level
// Electron injects "Electron" into the user agent string
const isElectron = navigator.userAgent.toLowerCase().includes('electron');

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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);
  const timerLoaded = useRef(false);

  // ==================== NETWORK DETECTION ====================
  // Electron (Windows) → standard browser events
  // Capacitor (Android) → native Network plugin
  useEffect(() => {
    if (isElectron) {
      // ── Windows ─────────────────────────────────────────
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        syncPendingSessions();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // ── Android ──────────────────────────────────────────
      Network.getStatus().then(status => {
        setIsOnline(status.connected);
        if (status.connected) syncPendingSessions();
      });

      const listenerPromise = Network.addListener('networkStatusChange', status => {
        setIsOnline(status.connected);
        if (status.connected) syncPendingSessions();
      });

      return () => {
        listenerPromise.then(l => l.remove());
      };
    }
  }, []);

  // ==================== LOAD DATA ====================
  useEffect(() => {
    if (!userId) return;
    loadTimerState();
    loadSessions();
  }, [userId]);

  const loadTimerState = async () => {
    const online = isElectron
      ? navigator.onLine
      : (await Network.getStatus()).connected;

    if (online) {
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
          timerLoaded.current = true;
          return;
        }
      } catch (e) {
        console.warn("Firebase timer load failed, falling back to localStorage");
      }
    }

    // Fallback — always works offline on both platforms
    const local = localStorage.getItem(`timer_${userId}`);
    if (local) {
      const data = JSON.parse(local);
      setActiveTaskId(data.taskId || '1');
      setIsStudying(data.isRunning || false);
      setIsPaused(data.isPaused || false);
      setElapsedTime(data.elapsedTime || 0);
      elapsedBeforePauseRef.current = data.elapsedBeforePause || 0;
      startTimeRef.current = data.startTime || null;
    }
    timerLoaded.current = true;
  };

  const loadSessions = () => {
    const saved = localStorage.getItem(`sessions_${userId}`);
    if (saved) setStudySessions(JSON.parse(saved));
  };

  // ==================== TIMER TICK ====================
  useEffect(() => {
    if (!timerLoaded.current) return;
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isStudying && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isStudying, isPaused]);

  // ==================== AUTO SAVE TO LOCALSTORAGE ====================
  // Runs on every state change — always works offline
  useEffect(() => {
    if (!userId || !timerLoaded.current) return;

    const timerData = {
      taskId: activeTaskId,
      isRunning: isStudying,
      isPaused,
      elapsedTime,
      elapsedBeforePause: isPaused ? elapsedTime : elapsedBeforePauseRef.current,
      startTime: startTimeRef.current,
    };

    localStorage.setItem(`timer_${userId}`, JSON.stringify(timerData));
  }, [userId, activeTaskId, isStudying, isPaused, elapsedTime]);

  // ==================== SYNC PENDING SESSIONS ====================
  // Fires automatically when internet returns on either platform
  const syncPendingSessions = async () => {
    const saved = localStorage.getItem(`sessions_${userId}`);
    if (!saved) return;

    const sessions: StudySession[] = JSON.parse(saved);
    const pending = sessions.filter(s => !s.synced);
    if (pending.length === 0) return;

    setIsSyncing(true);
    const updated = [...sessions];

    for (const session of pending) {
      try {
        await addDoc(collection(db, "sessions"), { userId, ...session });
        const idx = updated.findIndex(s => s.createdAt === session.createdAt);
        if (idx !== -1) updated[idx] = { ...updated[idx], synced: true };
      } catch (e) {
        console.error("Sync failed for session:", session.createdAt, e);
      }
    }

    setStudySessions(updated);
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(updated));
    setIsSyncing(false);
  };

  // ==================== SAVE SESSION ====================
  const saveCurrentSession = async (taskId: string, duration: number) => {
    if (duration <= 0) return;

    const online = isElectron
      ? navigator.onLine
      : (await Network.getStatus()).connected;

    const now = new Date();
    const newSession: StudySession = {
      taskId,
      duration,
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      createdAt: now.toISOString(),
      synced: online,
    };

    // Always save locally first — instant, works offline
    const updated = [...studySessions, newSession];
    setStudySessions(updated);
    localStorage.setItem(`sessions_${userId}`, JSON.stringify(updated));

    // Try Firebase if online
    if (online) {
      try {
        await addDoc(collection(db, "sessions"), { userId, ...newSession });
      } catch (e) {
        // Mark unsynced — will retry automatically when back online
        const retry = updated.map(s =>
          s.createdAt === newSession.createdAt ? { ...s, synced: false } : s
        );
        setStudySessions(retry);
        localStorage.setItem(`sessions_${userId}`, JSON.stringify(retry));
        console.error("Firebase save failed, queued for retry");
      }
    }
  };

  // ==================== TIMER CONTROLS ====================
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
    startTimeRef.current = Date.now();
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

    const online = isElectron
      ? navigator.onLine
      : (await Network.getStatus()).connected;

    if (online) {
      try {
        await deleteDoc(doc(db, "timers", userId));
      } catch (e) {}
    }

    startTimeRef.current = null;
    elapsedBeforePauseRef.current = 0;
    setIsStudying(false);
    setIsPaused(false);
    setElapsedTime(0);
  };

  // ==================== FULLSCREEN ====================
  // try/catch because Android WebView may not support the fullscreen API
  const toggleFullScreenTimer = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullScreen(false);
      }
    } catch (e) {
      setIsFullScreen(prev => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullScreen(false);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ==================== TASK MANAGEMENT ====================
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

  return (
    <div className="min-h-screen bg-background relative">
      <Header
        onLogout={onLogout}
        onShowLogin={onShowLogin}
        userName={userName}
        isLoggedIn={isLoggedIn}
      />

      {/* Connection Status Badge — shows Online/Offline + spinning sync icon */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-zinc-900/95 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl text-sm shadow-lg">
        {isOnline ? (
          <div className="flex items-center gap-2 text-emerald-400">
            <Cloud className="w-4 h-4" />
            Online
            {isSyncing && <RefreshCw className="w-4 h-4 animate-spin" />}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-amber-400">
            <CloudOff className="w-4 h-4" />
            Offline • Saved locally
          </div>
        )}
      </div>

      {/* Fullscreen Timer Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[100] bg-zinc-950 flex items-center justify-center">
          <button
            onClick={toggleFullScreenTimer}
            className="fixed top-4 right-4 z-[120] px-6 py-3 rounded-xl bg-black/70 backdrop-blur border border-white/20 text-white"
          >
            Exit Fullscreen
          </button>
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
        </div>
      )}

      {/* Main Layout */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-6">

          {/* Left Column — Tasks + Countdown */}
          <div className="space-y-6 lg:order-1 order-2">
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
                className="w-full px-4 py-3 rounded-2xl border border-border bg-card hover:bg-accent transition-colors"
              >
                {showCountdown ? 'Hide' : 'Show'} Countdown Timer
              </button>
            </div>

            {(showCountdown || window.innerWidth >= 1024) && <CountdownTimer />}
          </div>

          {/* Right Column — Timer + Stats */}
          <div className="space-y-6 lg:order-2 order-1">
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