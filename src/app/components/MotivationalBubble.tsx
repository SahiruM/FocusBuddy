import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

const messages = [
  "You're doing amazing! 🌟",
  "Keep going! 💪",
  "You've got this! ✨",
  "So proud of you! 🎉",
  "Learning superstar! ⭐",
  "Stay focused! 🎯",
  "Great work! 🌸",
  "You're brilliant! 💖",
];

export function MotivationalBubble({ isStudying }: { isStudying: boolean }) {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isStudying) {
      setShow(false);
      return;
    }

    const showMessage = () => {
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
      setShow(true);
      setTimeout(() => setShow(false), 4000);
    };

    const initialDelay = setTimeout(showMessage, 3000);
    const interval = setInterval(showMessage, 20000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isStudying]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          className="fixed bottom-8 right-8 z-50 px-6 py-3 rounded-full shadow-lg border-2 border-border"
          style={{
            background: 'linear-gradient(135deg, var(--lavender) 0%, var(--light-blue) 100%)',
          }}
        >
          <p className="text-white hand-drawn text-lg">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
