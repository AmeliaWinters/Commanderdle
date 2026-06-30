/**
 * Ambient background: a handful of rounded, MTG-card-shaped rectangles that drift
 * and rotate slowly behind the app. Replaces the old conic-gradient "darkening"
 * sweep. Purely decorative and inert to pointer events.
 */
const CARDS = [
  { left: '8%', top: '12%', size: 150, delay: 0, dur: 26, rot: -12 },
  { left: '78%', top: '18%', size: 190, delay: -6, dur: 32, rot: 9 },
  { left: '62%', top: '64%', size: 170, delay: -12, dur: 28, rot: -7 },
  { left: '16%', top: '68%', size: 130, delay: -3, dur: 30, rot: 14 },
  { left: '40%', top: '34%', size: 210, delay: -18, dur: 36, rot: 4 },
]

export default function CardBackdrop() {
  return (
    <div className="card-backdrop" aria-hidden="true">
      {CARDS.map((c, i) => (
        <span
          key={i}
          className="bg-card"
          style={{
            left: c.left,
            top: c.top,
            width: c.size,
            height: c.size * 1.4, // MTG card aspect ratio (~63:88)
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
            ['--rot' as string]: `${c.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
