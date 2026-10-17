"use client";

import React, { useRef, useEffect } from "react";

export const UnifiedStars = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let resizeObserver: ResizeObserver | null = null;

    let cssWidth = 0;
    let cssHeight = 0;

    let stars: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number }[] = [];

    const initStars = () => {
      stars = [];
      const numStars = (cssWidth * cssHeight) / 4000;
      for (let i = 0; i < numStars; i++) {
        stars.push({
          x: Math.random() * cssWidth,
          y: Math.random() * cssHeight,
          radius: Math.random() * 1.5,
          vx: Math.floor(Math.random() * 50) - 25,
          vy: Math.floor(Math.random() * 50) - 25,
          alpha: Math.random() * 0.5 + 0.1,
        });
      }
    };

    class ShootingStar {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      opacity: number;
      delay: number;
      active: boolean;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.length = 0;
        this.speed = 0;
        this.angle = 0;
        this.opacity = 0;
        this.delay = Math.random() * 2000;
        this.active = false;
        this.reset();
      }

      reset() {
        this.x = Math.random() * cssWidth * 1.5;
        this.y = -Math.random() * cssHeight;
        this.length = Math.random() * 80 + 10;
        this.speed = Math.random() * 10 + 5;
        this.angle = Math.PI / 4;
        this.opacity = Math.random() * 0.5 + 0.5;
        this.active = false;
      }

      update() {
        if (!this.active) {
          this.delay -= 16;
          if (this.delay <= 0) {
            this.active = true;
          }
          return;
        }

        this.x -= this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);

        if (this.x < -this.length || this.y > cssHeight + this.length) {
          this.reset();
          this.delay = Math.random() * 5000 + 1000;
        }
      }

      draw() {
        if (!this.active) return;
        if (!ctx) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
          this.x + this.length * Math.cos(this.angle),
          this.y - this.length * Math.sin(this.angle)
        );

        const gradient = ctx.createLinearGradient(
          this.x,
          this.y,
          this.x + this.length * Math.cos(this.angle),
          this.y - this.length * Math.sin(this.angle)
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.opacity * 0.7})`);
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    const shootingStars = Array.from({ length: 3 }, () => new ShootingStar());

    const resize = (width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      cssWidth = width;
      cssHeight = height;

      canvas.width = Math.min(width * dpr, 1920);
      canvas.height = Math.min(height * dpr, 1080);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(canvas.width / width, canvas.height / height);

      initStars();
      shootingStars.forEach((star) => star.reset());
    };

    if (canvas.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect();
      resize(rect.width, rect.height);

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          resize(width, height);
        }
      });
      resizeObserver.observe(canvas.parentElement);
    }

    const draw = () => {
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * 0.7})`;
        ctx.fill();

        star.x += star.vx / 1000;
        star.y += star.vy / 1000;

        if (star.x < 0 || star.x > cssWidth) star.vx = -star.vx;
        if (star.y < 0 || star.y > cssHeight) star.vy = -star.vy;
      }

      shootingStars.forEach((star) => {
        star.update();
        star.draw();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
};
