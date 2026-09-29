// SM-2 spaced repetition. Each question carries { easiness, interval, reps, due }.
// quality: 0-5. "Got it" = 4, "Needs work" = 2.

export function initSm2() {
  return { easiness: 2.5, interval: 0, reps: 0, due: Date.now() }
}

export function reviewSm2(sm2, quality) {
  let { easiness, interval, reps } = sm2
  easiness = Math.max(
    1.3,
    easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  )
  if (quality < 3) {
    reps = 0
    interval = 1
  } else {
    reps += 1
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * easiness)
  }
  return { easiness, interval, reps, due: Date.now() + interval * 86400000 }
}

export function isDue(q) {
  return (q.sm2?.due ?? 0) <= Date.now()
}
