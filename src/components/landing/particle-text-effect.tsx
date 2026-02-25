"use client";

import { useEffect, useRef } from "react";

interface Vector2D {
  x: number;
  y: number;
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 };
  vel: Vector2D = { x: 0, y: 0 };
  acc: Vector2D = { x: 0, y: 0 };
  target: Vector2D = { x: 0, y: 0 };

  closeEnoughTarget = 120;
  maxSpeed = 6.5;
  maxForce = 0.35;
  particleSize = 2;
  isKilled = false;

  startColor = { r: 0, g: 0, b: 0 };
  targetColor = { r: 0, g: 0, b: 0 };
  colorWeight = 0;
  colorBlendRate = 0.02;

  move() {
    let proximityMult = 1;
    const distance = Math.hypot(this.pos.x - this.target.x, this.pos.y - this.target.y);

    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget;
    }

    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    };

    const magnitude = Math.hypot(towardsTarget.x, towardsTarget.y);
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult;
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult;
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    };

    const steerMagnitude = Math.hypot(steer.x, steer.y);
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce;
      steer.y = (steer.y / steerMagnitude) * this.maxForce;
    }

    this.acc.x += steer.x;
    this.acc.y += steer.y;

    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.acc.x = 0;
    this.acc.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D, drawAsPoints: boolean) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0);
    }

    const currentColor = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    };

    ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;

    if (drawAsPoints) {
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
      return;
    }

    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  kill(width: number, height: number) {
    if (this.isKilled) return;

    const angle = Math.random() * Math.PI * 2;
    const mag = (width + height) / 2;
    const centerX = width / 2;
    const centerY = height / 2;
    const exitX = centerX + Math.cos(angle) * mag;
    const exitY = centerY + Math.sin(angle) * mag;

    this.target.x = exitX;
    this.target.y = exitY;

    this.startColor = {
      r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
      g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
      b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
    };
    this.targetColor = { r: 0, g: 0, b: 0 };
    this.colorWeight = 0;

    this.isKilled = true;
  }
}

interface ParticleTextEffectProps {
  words?: string[];
  className?: string;
  cycleFrames?: number;
  fadeOpacity?: number;
  fontFamily?: string;
  textYRatio?: number;
}

const DEFAULT_WORDS = ["B-7", "B-Track7", "Budget", "Tracking"];

export function ParticleTextEffect({
  words = DEFAULT_WORDS,
  className,
  cycleFrames = 440,
  fadeOpacity = 0.14,
  fontFamily = '"Sora", "Space Grotesk", sans-serif',
  textYRatio = 0.5,
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef(0);
  const wordIndexRef = useRef(0);
  const reduceMotionRef = useRef(false);

  const pixelSteps = 6;
  const drawAsPoints = true;

  const generateRandomPos = (
    x: number,
    y: number,
    mag: number,
  ): Vector2D => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: x + Math.cos(angle) * mag,
      y: y + Math.sin(angle) * mag,
    };
  };

  const resolveFontSize = (ctx: CanvasRenderingContext2D, word: string, width: number, height: number) => {
    let fontSize = Math.min(180, width * 0.22, height * 0.45);
    const maxWidth = width * 0.78;

    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    while (ctx.measureText(word).width > maxWidth && fontSize > 36) {
      fontSize -= 6;
      ctx.font = `700 ${fontSize}px ${fontFamily}`;
    }

    return fontSize;
  };

  const nextWord = (word: string, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d")!;

    const fontSize = resolveFontSize(offscreenCtx, word, canvas.width, canvas.height);

    offscreenCtx.clearRect(0, 0, canvas.width, canvas.height);
    offscreenCtx.fillStyle = "white";
    offscreenCtx.font = `700 ${fontSize}px ${fontFamily}`;
    offscreenCtx.textAlign = "center";
    offscreenCtx.textBaseline = "middle";
    offscreenCtx.fillText(word, canvas.width / 2, canvas.height * textYRatio);

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const newColor = { r: 255, g: 255, b: 255 };

    const particles = particlesRef.current;
    let particleIndex = 0;

    const coordsIndexes: number[] = [];
    for (let i = 0; i < pixels.length; i += pixelSteps * 4) {
      coordsIndexes.push(i);
    }

    for (let i = coordsIndexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [coordsIndexes[i], coordsIndexes[j]] = [coordsIndexes[j], coordsIndexes[i]];
    }

    for (const coordIndex of coordsIndexes) {
      const alpha = pixels[coordIndex + 3];
      if (alpha <= 0) continue;

      const x = (coordIndex / 4) % canvas.width;
      const y = Math.floor(coordIndex / 4 / canvas.width);

      let particle: Particle;

      if (particleIndex < particles.length) {
        particle = particles[particleIndex];
        particle.isKilled = false;
        particleIndex += 1;
      } else {
        particle = new Particle();
        const randomPos = generateRandomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2);
        particle.pos.x = randomPos.x;
        particle.pos.y = randomPos.y;
        particle.maxSpeed = Math.random() * 5 + 4;
        particle.maxForce = particle.maxSpeed * 0.06;
        particle.particleSize = Math.random() * 3 + 2;
        particle.colorBlendRate = Math.random() * 0.02 + 0.01;
        particles.push(particle);
      }

      particle.startColor = {
        r: particle.startColor.r + (particle.targetColor.r - particle.startColor.r) * particle.colorWeight,
        g: particle.startColor.g + (particle.targetColor.g - particle.startColor.g) * particle.colorWeight,
        b: particle.startColor.b + (particle.targetColor.b - particle.startColor.b) * particle.colorWeight,
      };
      particle.targetColor = newColor;
      particle.colorWeight = 0;

      particle.target.x = x;
      particle.target.y = y;
    }

    for (let i = particleIndex; i < particles.length; i++) {
      particles[i].kill(canvas.width, canvas.height);
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.move();
      particle.draw(ctx, drawAsPoints);

      if (
        particle.isKilled &&
        (particle.pos.x < 0 ||
          particle.pos.x > canvas.width ||
          particle.pos.y < 0 ||
          particle.pos.y > canvas.height)
      ) {
        particles.splice(i, 1);
      }
    }

    frameCountRef.current += 1;
    if (frameCountRef.current % cycleFrames === 0) {
      wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
      nextWord(words[wordIndexRef.current], canvas);
    }

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resolveDevicePixelRatio = () => {
      const isMobile = window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches;
      if (!isMobile) return 1;
      return Math.min(window.devicePixelRatio || 1, 2);
    };

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const ratio = resolveDevicePixelRatio();
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    const boot = async () => {
      await document.fonts?.ready;
      resizeCanvas();
      nextWord(words[0], canvas);

      if (!reduceMotionRef.current) {
        animate();
      }
    };

    void boot();

    const handleResize = () => {
      resizeCanvas();
      nextWord(words[wordIndexRef.current], canvas);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [cycleFrames, fadeOpacity, fontFamily, textYRatio, words]);

  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`}>
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
    </div>
  );
}
