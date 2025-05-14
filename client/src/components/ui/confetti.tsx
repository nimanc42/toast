import { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";

export function Confetti() {
  const [windowDimensions, setWindowDimensions] = useState({ 
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [confettiActive, setConfettiActive] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // End the confetti effect after 4 seconds
    const timer = setTimeout(() => {
      setConfettiActive(false);
    }, 4000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  if (!confettiActive) return null;

  return (
    <ReactConfetti
      width={windowDimensions.width}
      height={windowDimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.2}
    />
  );
}