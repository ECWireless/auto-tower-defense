import React, { useEffect, useState } from 'react';

export const BackgroundAnimation: React.FC = () => {
  const [randomAnimationNumbers, setRandomAnimationNumbers] = useState<
    {
      left: string;
      height: string;
      animationDuration: string;
      animationDelay: string;
    }[]
  >([]);

  useEffect(() => {
    const _randomNumbers = Array.from({ length: 30 }).map(() => ({
      left: `${Math.random() * 100}%`,
      height: `${60 + Math.random() * 40}px`,
      animationDuration: `${15 + Math.random() * 30}s`,
      animationDelay: `${Math.random() * 5}s`,
    }));
    setRandomAnimationNumbers(_randomNumbers);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="bg-tech-pattern fixed inset-0" />
      {Array.from({ length: 30 }).map((_, i) => {
        if (!randomAnimationNumbers[i]) return null;
        return (
          <div
            key={`data-stream-${i}`}
            className={`data-stream data-stream-${['cyan', 'purple', 'pink'][i % 3]}`}
            style={{
              left: randomAnimationNumbers[i].left,
              height: randomAnimationNumbers[i].height,
              animationDuration: randomAnimationNumbers[i].animationDuration,
              animationDelay: randomAnimationNumbers[i].animationDelay,
            }}
          />
        );
      })}
    </div>
  );
};
