import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'

const reducedMotionQuery =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

export function prefersReducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

interface CountUpOptions {
  duration?: number
  delay?: number
  startValue?: number
}

export function useCountUp(target: number, options: CountUpOptions = {}): Ref<number> {
  const { duration = 1100, delay = 0, startValue = 0 } = options
  const current = ref(prefersReducedMotion() ? target : startValue)
  let raf: number | null = null
  let stopped = false

  function run() {
    if (stopped) return
    if (prefersReducedMotion()) {
      current.value = target
      return
    }
    const start = performance.now()
    const from = current.value
    const to = target

    const tick = (now: number) => {
      if (stopped) return
      const t = Math.min(1, (now - start) / duration)
      const eased = easeOutExpo(t)
      current.value = from + (to - from) * eased
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }

  onMounted(() => {
    if (delay > 0) setTimeout(run, delay)
    else run()
  })
  onBeforeUnmount(() => {
    stopped = true
    if (raf) cancelAnimationFrame(raf)
  })

  return current
}

export function useScrolled(threshold = 4): Ref<boolean> {
  const scrolled = ref(false)
  let ticking = false

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      scrolled.value = window.scrollY > threshold
      ticking = false
    })
  }

  onMounted(() => {
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
  })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
  })

  return scrolled
}

export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  function update() {
    if (mql) matches.value = mql.matches
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', update)
  })
  onBeforeUnmount(() => {
    mql?.removeEventListener('change', update)
  })

  return matches
}

export function useMounted(delay = 30): Ref<boolean> {
  const mounted = ref(false)
  onMounted(() => {
    if (prefersReducedMotion()) {
      mounted.value = true
      return
    }
    requestAnimationFrame(() => {
      setTimeout(() => (mounted.value = true), delay)
    })
  })
  return mounted
}
