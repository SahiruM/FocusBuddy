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
  const [isFullscreen, setIsFullscreen] = useState(false);   // ← New

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);
  const previousTaskIdRef = useRef<string | null>(null);

  // Fullscreen Toggle
  const toggleFullscreen = async () => {
    const timerElement = document.getElementById('timer-main');

    if (!timerElement) return;

    try {
      if (!document.fullscreenElement) {
        await timerElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen failed:", err);
    }
  };

  // Listen for fullscreen change (ESC key, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Rest of your existing code (load timer, sessions, etc.) remains the same...
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

  // ... (all your other useEffects and functions remain unchanged)

  const handleSelectTask = async (newTaskId: string) => { /* your existing code */ };
  const handleStart = async () => { /* your existing code */ };
  const handlePause = () => { /* your existing code */ };
  const handleResume = () => { /* your existing code */ };
  const handleStop = async () => { /* your existing code */ };
  const handleAddTask = (taskName: string) => { /* your existing code */ };
  const handleDeleteTask = (taskId: string) => { /* your existing code */ };

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

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-4 sm:gap-6">
          <div className="space-y-4 sm:space-y-6 lg:order-1 order-2">
            {/* TaskList & Countdown */}
            <TaskList
              tasks={tasks}
              activeTaskId={activeTaskId}
              onSelectTask={handleSelectTask}
              onAddTask={handleAddTask}
              onDeleteTask={handleDeleteTask}
            />

            <div className="lg:hidden">
              <button onClick={() => setShowCountdown(!showCountdown)} className="w-full px-4 py-3 rounded-2xl border border-border bg-card hover:bg-accent transition-colors">
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
              onFullscreen={toggleFullscreen}     // ← Added
              isFullscreen={isFullscreen}         // ← Added
            />

            <StatsSection studySessions={studySessions} tasks={tasks} />
          </div>
        </div>
      </div>
    </div>
  );
}