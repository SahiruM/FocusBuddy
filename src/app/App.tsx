import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { MainApp } from './components/MainApp';

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'app'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        setCurrentView('app');
      } else {
        setCurrentView('login');
      }
    });

    return () => unsubscribe();
  }, []);

  // ==================== SIGN UP ====================
  const handleSignUp = async (name: string, email: string, password: string) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // Update display name
      await updateProfile(user, { displayName: name });

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        createdAt: new Date().toISOString(),
      });

      console.log("✅ Signup successful!");
    } catch (error: any) {
      console.error("Signup error:", error);
      throw error;   // This allows SignUp component to show the error
    }
  };

  // ==================== LOGIN ====================
  const handleLogin = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Login successful!");
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;   // This allows Login component to show the error
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl mx-auto mb-4 animate-pulse"
               style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }} />
          <p className="text-muted-foreground">Loading... 💫</p>
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return <Login onLogin={handleLogin} onSwitchToSignup={() => setCurrentView('signup')} />;
  }

  if (currentView === 'signup') {
    return <SignUp onSignUp={handleSignUp} onSwitchToLogin={() => setCurrentView('login')} />;
  }

  return (
    <MainApp
      userName={user?.displayName || 'Suu'}
      userId={user?.uid || ''}
      onLogout={handleLogout}
      onShowLogin={undefined}
      isLoggedIn={!!user}
    />
  );
}