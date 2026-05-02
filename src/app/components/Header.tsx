import { Moon, Sun, Heart, LogOut, LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onLogout?: () => void;
  onShowLogin?: () => void;
  userName?: string;
  isLoggedIn?: boolean;
}

export function Header({ onLogout, onShowLogin, userName, isLoggedIn }: HeaderProps = {}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #9b87d6 0%, #a8d5ff 100%)' }}>
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-foreground text-lg sm:text-2xl">SuuStudy</h1>
              <p className="text-xs text-muted-foreground">for Suu</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary hover:bg-accent active:scale-95 transition-all flex items-center justify-center group touch-manipulation"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-foreground group-hover:rotate-12 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-foreground group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            {isLoggedIn ? (
              <button
                onClick={onLogout}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all flex items-center justify-center group touch-manipulation"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
              </button>
            ) : (
              <button
                onClick={onShowLogin}
                className="px-3 sm:px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all flex items-center gap-1.5 touch-manipulation border-2 border-primary/30"
                aria-label="Login"
              >
                <LogIn className="w-4 h-4" style={{ color: 'var(--lavender)' }} />
                <span className="text-sm hidden sm:inline" style={{ color: 'var(--lavender)' }}>Login</span>
              </button>
            )}

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-primary/50 shadow-md hover:scale-110 transition-transform cursor-pointer">
              <div className="w-full h-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }}>
                <span className="text-base sm:text-lg">{userName ? userName[0].toUpperCase() : 'S'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
