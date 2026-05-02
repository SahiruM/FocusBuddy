import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Login } from './components/Login';
import { SignUp } from './components/SignUp';
import { MainApp } from './components/MainApp';

export default function App() {
  const [currentView, setCurrentView] = useState<'login' | 'signup' | 'app'>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase automatically remembers the user — no localStorage needed
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

    return () => unsubscribe(); // cleanup on unmount
  }, []);

  const handleLogin = async (email: string, password: string) => {
    // actual Firebase login is handled inside Login.tsx's try/catch
    // Firebase's onAuthStateChanged above will automatically update user state
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    // actual Firebase signup is handled inside SignUp.tsx's try/catch
    // Firebase's onAuthStateChanged above will automatically update user state
  };

  const handleLogout = async () => {
    await signOut(auth);
    // onAuthStateChanged will automatically set user to null and switch to login
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-3xl mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }}
          />
          <p className="text-muted-foreground">Loading... 💫</p>
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return (
      <Login
        onLogin={handleLogin}
        onSwitchToSignup={() => setCurrentView('signup')}
      />
    );
  }

  if (currentView === 'signup') {
    return (
      <SignUp
        onSignUp={handleSignUp}
        onSwitchToLogin={() => setCurrentView('login')}
      />
    );
  }

return (
  <MainApp
    userName={user?.displayName || 'Suu'}
    userId={user?.uid || ''}   // ← this MUST be user.uid, not the name
    onLogout={user ? handleLogout : undefined}
    onShowLogin={!user ? () => setCurrentView('login') : undefined}
    isLoggedIn={!!user}
  />
);
}