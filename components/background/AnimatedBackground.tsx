'use client';

import { useEffect, useRef } from 'react';

/**
 * Animated liquid gradient background
 * Creates a smooth, flowing animation using Canvas API
 * Provides a premium glassmorphism backdrop
 */
export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to window size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(15, 12, 41, 1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create animated gradient
      timeRef.current += 0.001;

      // Primary gradient circle (purple-ish)
      const x1 = canvas.width / 2 + Math.sin(timeRef.current) * 100;
      const y1 = canvas.height / 2 + Math.cos(timeRef.current * 0.7) * 100;

      const gradient1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, canvas.width);
      gradient1.addColorStop(0, 'rgba(120, 119, 198, 0.4)');
      gradient1.addColorStop(0.5, 'rgba(102, 126, 234, 0.2)');
      gradient1.addColorStop(1, 'rgba(102, 126, 234, 0)');

      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary gradient circle (pink-ish)
      const x2 = canvas.width / 3 + Math.cos(timeRef.current * 0.9) * 80;
      const y2 = canvas.height / 3 + Math.sin(timeRef.current * 0.6) * 80;

      const gradient2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, canvas.width);
      gradient2.addColorStop(0, 'rgba(255, 105, 180, 0.3)');
      gradient2.addColorStop(0.5, 'rgba(236, 72, 153, 0.1)');
      gradient2.addColorStop(1, 'rgba(236, 72, 153, 0)');

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tertiary gradient (blue)
      const x3 = canvas.width * 0.8 + Math.sin(timeRef.current * 0.5) * 120;
      const y3 = canvas.height * 0.8 + Math.cos(timeRef.current * 0.8) * 120;

      const gradient3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, canvas.width);
      gradient3.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
      gradient3.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)');
      gradient3.addColorStop(1, 'rgba(59, 130, 246, 0)');

      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener('resize', handleResize);

    // Start animation
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 blur-3xl"
      aria-hidden="true"
    />
  );
}
