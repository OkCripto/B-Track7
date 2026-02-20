"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type Particle = {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  blur: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
};

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
    const size = (1.6 + rng() * 3.2) * scale;
    return {
      id,
      x: rng() * 100,
      y: rng() * 100,
      size,
      opacity: 0.42 + rng() * 0.46,
      blur: rng() > 0.76 ? 0.95 : 0,
      driftX: (rng() * 24 - 12) * scale,
      driftY: (rng() * 18 - 9) * scale,
      duration: 10 + rng() * 18,
      delay: -rng() * 16,
    };
  });
}

const FAR_PARTICLES = createParticles(120, 1337, 0.8);
const MID_PARTICLES = createParticles(95, 7331, 1);
const NEAR_PARTICLES = createParticles(70, 4242, 1.2);

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
              filter: particle.blur ? `blur(${particle.blur}px)` : undefined,
              "--drift-x": `${particle.driftX}px`,
              "--drift-y": `${particle.driftY}px`,
              "--float-duration": `${particle.duration.toFixed(2)}s`,
              "--float-delay": `${particle.delay.toFixed(2)}s`,
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
    let rafId = 0;

    const update = () => {
      rafId = 0;
      const scrollY = window.scrollY || 0;
      for (const layer of layers) {
        const speed = Number(layer.dataset.scrollSpeed || "0");
        // Loop the shift so particles keep flowing instead of drifting completely out.
        const shift = (-scrollY * speed) % 280;
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
      <div className="changelog-scroll-glow changelog-scroll-glow-left" />
      <div className="changelog-scroll-glow changelog-scroll-glow-right" />
      <ParticleLayer particles={FAR_PARTICLES} speed={0.16} className="changelog-particle-layer-far" />
      <ParticleLayer particles={MID_PARTICLES} speed={0.28} className="changelog-particle-layer-mid" />
      <ParticleLayer particles={NEAR_PARTICLES} speed={0.42} className="changelog-particle-layer-near" />
    </div>
  );
}
