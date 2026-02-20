"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  color: string;
  glow: string;
};

const PALETTE = [
  { color: "rgba(255, 255, 255, 0.94)", glow: "rgba(255, 255, 255, 0.36)" },
  { color: "rgba(241, 245, 249, 0.9)", glow: "rgba(148, 163, 184, 0.28)" },
  { color: "rgba(186, 230, 253, 0.86)", glow: "rgba(125, 211, 252, 0.24)" },
  { color: "rgba(219, 234, 254, 0.8)", glow: "rgba(96, 165, 250, 0.2)" },
];

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createParticles(count: number, seed: number, scale = 1): Particle[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, (_, id) => {
    const accentRoll = rng();
    const paletteIndex = accentRoll > 0.992 ? 3 : accentRoll > 0.9 ? 2 : accentRoll > 0.5 ? 1 : 0;
    const palette = PALETTE[paletteIndex];
    return {
      id,
      x: rng() * 100,
      y: rng() * 100,
      size: (1.4 + rng() * 2.8) * scale,
      opacity: 0.4 + rng() * 0.5,
      driftX: (rng() * 20 - 10) * scale,
      driftY: (rng() * 16 - 8) * scale,
      duration: 12 + rng() * 18,
      delay: -rng() * 16,
      color: palette.color,
      glow: palette.glow,
    };
  });
}

const FAR_PARTICLES = createParticles(96, 1337, 0.9);
const MID_PARTICLES = createParticles(72, 7331, 1);
const NEAR_PARTICLES = createParticles(52, 4242, 1.15);

function ParticleLayer({
  particles,
  className,
  speed,
}: {
  particles: Particle[];
  className?: string;
  speed: number;
}) {
  return (
    <div className={`changelog-particle-layer ${className ?? ""}`} data-scroll-speed={speed}>
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="changelog-particle-dot"
          style={
            {
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              "--drift-x": `${particle.driftX}px`,
              "--drift-y": `${particle.driftY}px`,
              "--float-duration": `${particle.duration.toFixed(2)}s`,
              "--float-delay": `${particle.delay.toFixed(2)}s`,
              background: particle.color,
              boxShadow: `0 0 12px ${particle.glow}`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function ChangelogScrollParticleField() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-scroll-speed]"));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let rafId = 0;

    const update = () => {
      rafId = 0;
      const scrollY = prefersReducedMotion ? 0 : window.scrollY || 0;
      for (const layer of layers) {
        const speed = Number(layer.dataset.scrollSpeed || "0");
        const shift = (-scrollY * speed) % 260;
        layer.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0)`;
      }
    };

    const schedule = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden className="changelog-scroll-particles">
      <div className="changelog-nebula-layer changelog-nebula-a" data-scroll-speed={0.07} />
      <div className="changelog-nebula-layer changelog-nebula-b" data-scroll-speed={0.1} />
      <div className="changelog-shooting-star-layer" data-scroll-speed={0.18}>
        <span className="changelog-shooting-star changelog-shooting-star-a" />
        <span className="changelog-shooting-star changelog-shooting-star-b" />
        <span className="changelog-shooting-star changelog-shooting-star-c" />
        <span className="changelog-shooting-star changelog-shooting-star-d" />
        <span className="changelog-shooting-star changelog-shooting-star-e" />
      </div>
      <div className="changelog-scroll-glow changelog-scroll-glow-left" />
      <div className="changelog-scroll-glow changelog-scroll-glow-right" />
      <ParticleLayer particles={FAR_PARTICLES} speed={0.12} className="changelog-particle-layer-far" />
      <ParticleLayer particles={MID_PARTICLES} speed={0.22} className="changelog-particle-layer-mid" />
      <ParticleLayer particles={NEAR_PARTICLES} speed={0.34} className="changelog-particle-layer-near" />
    </div>
  );
}
