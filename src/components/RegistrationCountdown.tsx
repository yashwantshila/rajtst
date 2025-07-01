import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Progress } from './ui/progress';

interface RegistrationCountdownProps {
  registrationStart: Date;
  registrationEnd: Date;
  className?: string;
}

function getTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, total: diff };
}

export const RegistrationCountdown: React.FC<RegistrationCountdownProps> = ({ registrationStart, registrationEnd, className }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  let content: React.ReactNode = null;
  let progress = 0;
  const hasStarted = now >= registrationStart;
  const hasEnded = now > registrationEnd;

  if (!hasStarted) {
    const { hours, minutes, seconds } = getTimeLeft(registrationStart);
    content = (
      <span className="font-semibold text-blue-600 dark:text-blue-300 animate-pulse">
        Registration opens in {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
    progress = 0;
  } else if (!hasEnded) {
    const { hours, minutes, seconds, total } = getTimeLeft(registrationEnd);
    const totalDuration = registrationEnd.getTime() - registrationStart.getTime();
    progress = Math.max(0, Math.min(100, 100 - (total / totalDuration) * 100));
    content = (
      <span className="font-semibold text-green-600 dark:text-green-300">
        Registration ends in {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    );
  } else {
    content = (
      <span className="font-semibold text-gray-500 dark:text-gray-400">Registration closed</span>
    );
    progress = 100;
  }

  return (
    <div className={`flex flex-col gap-1 items-start ${className || ''}`}>
      <div className="flex items-center gap-2 text-base">
        <Clock className="h-5 w-5 text-green-500 animate-spin-slow" />
        {content}
      </div>
      <Progress value={progress} className="h-2 w-48 bg-gray-200 dark:bg-gray-700" />
    </div>
  );
};

export default RegistrationCountdown; 