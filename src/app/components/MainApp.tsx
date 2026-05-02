import { useState, useEffect, useRef } from 'react';
import {
  doc, setDoc, getDoc, deleteDoc,
  addDoc, collection, onSnapshot, query, where
} from "firebase/firestore";
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
  userId: string;
}

export function MainApp({ userName, userId }: MainAppProps) {

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
  const [timerLoaded, setTimerLoaded] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // ================= LOAD TIMER =================
  useEffect(() => {
    if (!userId) return;

    const loadTimer = async () => {
      const snap = await getDoc(doc(db, "timers", userId));

      if (!snap.exists()) {
        // 🔥 fallback to local backup
        const backup = localStorage.getItem("timer_backup");

        if (backup) {
          const data = JSON.parse(backup);

          setActiveTaskId(data.taskId || '1');
          setIsStudying(data.isRunning || false);
          setIsPaused(data.isPaused || false);

          startTimeRef.current = data.startTime;
          elapsedBeforePauseRef.current = data.elapsedBeforePause || 0;
        }

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
        const elapsed =
          (data.elapsedBeforePause || 0) +
          Math.floor((now - data.startTime) / 1000);

        elapsedBeforePauseRef.current = data.elapsedBeforePause || 0;
        startTimeRef.current = data.startTime;
        setElapsedTime(elapsed);
      }

      setTimerLoaded(true);
    };

    loadTimer();
  }, [userId]);

  // ================= TIMER =================
  const calculateElapsed = () => {
    if (!isStudying) return elapsedBeforePauseRef.current;
    if (isPaused) return elapsedBeforePauseRef.current;
    if (!startTimeRef.current) return elapsedTime;

    return (
      elapsedBeforePauseRef.current +
      Math.floor((Date.now() - startTimeRef.current) / 1000)
    );
  };

  useEffect(() => {
    if (!timerLoaded) return;

    const interval = setInterval(() => {
      setElapsedTime(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [isStudying, isPaused, timerLoaded]);

  // ================= FIREBASE SESSIONS =================
  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "sessions"), where("userId", "==", userId));

    return onSnapshot(q, (snapshot) => {
      const sessions: StudySession[] = snapshot.docs.map(d => d.data() as StudySession);
      setStudySessions(sessions);
    });
  }, [userId]);

  // ================= OFFLINE SYNC =================
  useEffect(() => {
    const syncOfflineSessions = async () => {
      if (!navigator.onLine) return;

      const stored = JSON.parse(localStorage.getItem("offlineSessions") || "[]");

      for (const session of stored) {
        if (!session.synced) {
          try {
            await addDoc(collection(db, "sessions"), session);
            session.synced = true;
          } catch {
            console.log("still offline");
          }
        }
      }

      localStorage.setItem("offlineSessions", JSON.stringify(stored));
    };

    window.addEventListener("online", syncOfflineSessions);
    syncOfflineSessions();

    return () => window.removeEventListener("online", syncOfflineSessions);
  }, []);

  // ================= SAVE TIMER =================
  useEffect(() => {
    if (!userId || !timerLoaded) return;

    const save = async () => {
      const data = {
        taskId: activeTaskId,
        isRunning: isStudying,
        isPaused,
        elapsedBeforePause: elapsedBeforePauseRef.current,
        startTime: startTimeRef.current || null,
      };

      await setDoc(doc(db, "timers", userId), data);

      // 🔥 local backup
      localStorage.setItem("timer_backup", JSON.stringify(data));
    };

    const t = setTimeout(save, 400);
    return () => clearTimeout(t);
  }, [activeTaskId, isStudying, isPaused, elapsedTime]);

  // ================= SAVE SESSION =================
  const saveCurrentSession = async (taskId: string, duration: number) => {
    if (duration <= 0) return;

    const now = new Date();

    const session = {
      id: Date.now().toString(),
      userId,
      taskId,
      duration,
      date: now.toISOString().split('T')[0],
      hour: now.getHours(),
      createdAt: now.toISOString(),
      synced: false,
    };

    // save locally
    const existing = JSON.parse(localStorage.getItem("offlineSessions") || "[]");
    localStorage.setItem("offlineSessions", JSON.stringify([...existing, session]));

    // try online
    if (navigator.onLine) {
      try {
        await addDoc(collection(db, "sessions"), session);
      } catch {
        console.log("offline fallback");
      }
    }
  };

  // ================= CONTROLS =================
  const handleStart = () => {
    startTimeRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;
    setIsStudying(true);
    setIsPaused(false);
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
    if (activeTaskId && elapsedTime > 0) {
      await saveCurrentSession(activeTaskId, elapsedTime);
    }

    await deleteDoc(doc(db, "timers", userId));

    setIsStudying(false);
    setIsPaused(false);
    setElapsedTime(0);

    startTimeRef.current = null;
    elapsedBeforePauseRef.current = 0;
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);

  if (!timerLoaded) return <p>Loading...</p>;

  return (
    <div>
      <Header userName={userName} />

      <TaskList
        tasks={tasks}
        activeTaskId={activeTaskId}
        onSelectTask={setActiveTaskId}
        onAddTask={(name) =>
          setTasks([...tasks, {
            id: Date.now().toString(),
            name,
            color: '#a8d5ff'
          }])
        }
        onDeleteTask={(id) =>
          setTasks(tasks.filter(t => t.id !== id))
        }
      />
<Timer
  activeTask={activeTask}
  isStudying={isStudying}
  isPaused={isPaused}
  elapsedTime={elapsedTime}
  onStart={handleStart}
  onPause={handlePause}
  onResume={handleResume}
  onStop={handleStop}
  onFullScreen={() => {}} // 👈 temporary fix
/>

      <StatsSection studySessions={studySessions} tasks={tasks} />
      <CountdownTimer />
    </div>
  );
}