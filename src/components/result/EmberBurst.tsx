import { useState, useEffect, useMemo } from "react";

export default function EmberBurst() {
  const embers = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 90 + Math.random() * 190;
        return {
          id: i,
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist * 0.6 - 70 - Math.random() * 90}px`,
          size: `${3 + Math.random() * 6}px`,
          dur: `${1.1 + Math.random() * 1.1}s`,
          delay: `${Math.random() * 0.45}s`,
          color: ["var(--flame-1)", "var(--flame-2)", "var(--flame-3)"][i % 3],
        };
      }),
    [],
  );
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 3200);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="ember-burst" aria-hidden="true">
      {embers.map((e) => (
        <span
          key={e.id}
          className="ember"
          style={
            {
              "--dx": e.dx,
              "--dy": e.dy,
              "--dur": e.dur,
              "--delay": e.delay,
              width: e.size,
              height: e.size,
              background: e.color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
