import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

export function FloatingHearts() {
  const hearts = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    delay: i * 0.8,
    x: Math.random() * 100,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          className="absolute"
          style={{
            left: `${heart.x}%`,
            bottom: '-10%',
          }}
          animate={{
            y: [0, -window.innerHeight * 1.2],
            opacity: [0, 0.6, 0.6, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: 8,
            delay: heart.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Heart
            className="w-6 h-6 fill-pink-300 text-pink-300"
            style={{ filter: 'blur(0.5px)' }}
          />
        </motion.div>
      ))}
    </div>
  );
}
