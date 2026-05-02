import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function ConfettiCelebration({ trigger }: { trigger: boolean }) {
  useEffect(() => {
    if (trigger) {
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#9b87d6', '#a8d5ff', '#ffb3c6', '#b8e6d5', '#ffd4e5'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });

        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [trigger]);

  return null;
}
