import { useState } from 'react';
import { motion } from 'motion/react';
import { Heart, Mail, Lock, User, Sparkles, Eye, EyeOff } from 'lucide-react';

interface SignUpProps {
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
  onSwitchToLogin: () => void;
}

export function SignUp({ onSignUp, onSwitchToLogin }: SignUpProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Please enter your name');
    if (!email.trim()) return setError('Please enter your email');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setError('Passwords do not match!');

    setLoading(true);

    try {
      await onSignUp(name.trim(), email.trim(), password);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger one.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <svg className="absolute top-20 right-20 w-32 h-32 text-soft-pink animate-float" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="30" />
        </svg>
        <svg className="absolute bottom-20 left-20 w-40 h-40 text-lavender animate-bounce-soft" viewBox="0 0 100 100" fill="currentColor">
          <path d="M50,30 L55,40 L65,40 L57,47 L60,57 L50,50 L40,57 L43,47 L35,40 L45,40 Z" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }}
          >
            <Heart className="w-10 h-10 text-white fill-white" />
          </motion.div>
          <h1 className="text-4xl font-semibold mb-2 text-foreground">Join FocusFlow</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: 'var(--soft-pink)' }} />
            Let's start your study journey! 💖
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border-2 border-border rounded-3xl p-8 shadow-lg cute-shadow"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm mb-2 text-foreground flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: 'var(--soft-pink)' }} />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Chen"
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-input-background border-2 border-border text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: 'var(--soft-pink)' }} />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl bg-input-background border-2 border-border text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" style={{ color: 'var(--soft-pink)' }} />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-input-background border-2 border-border text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4" style={{ color: 'var(--soft-pink)' }} />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-xl bg-input-background border-2 border-border text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl text-white font-medium shadow-md border-2 border-transparent hover:border-white/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #ffb3c6 0%, #9b87d6 100%)' }}
            >
              {loading ? 'Creating account...' : 'Create Account 🎉'}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                disabled={loading}
                className="text-primary hover:underline font-medium transition-all"
              >
                Login here
              </button>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}