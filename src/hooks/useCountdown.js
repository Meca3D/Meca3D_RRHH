import { useState, useEffect } from 'react';

export const useCountdown = (targetDate) => {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(targetDate));

  function calculateTimeRemaining(target) {
    if (!target) return null;
    
    // Restar 15 minutos a la hora de reserva
    const deadlineTime = new Date(target).getTime() - (20 * 60 * 1000);
    const currentTime = new Date().getTime();
    const difference = deadlineTime - currentTime;

    if (difference <= 0) {
      return { expired: true, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      expired: false,
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeRemaining;
};
