import { useEffect, useState } from 'react';

export const ProgressBar = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleLoading = (e: any) => {
      const isLoading = e.detail;
      setLoading(isLoading);
      if (isLoading) {
        setProgress(10);
        const timer = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(timer);
              return 90;
            }
            return prev + 10;
          });
        }, 300);
      } else {
        setProgress(100);
        setTimeout(() => setProgress(0), 500);
      }
    };

    document.addEventListener('api-loading', handleLoading);
    return () => document.removeEventListener('api-loading', handleLoading);
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-secondary overflow-hidden">
      <div 
        className="h-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
