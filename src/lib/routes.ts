/** 轻量路由：官网 `/`，产品 Demo `/demo`（也支持 `#/demo` 与 `?demo=1`） */
export type AppRoute = 'landing' | 'demo'

export function isDemoPath(pathname: string): boolean {
  return pathname === '/demo' || pathname.startsWith('/demo/')
}

export function getAppRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash === '/demo' || hash.startsWith('/demo/')) return 'demo'

  const demoQuery = new URLSearchParams(window.location.search).get('demo')
  if (demoQuery === '1' || demoQuery === 'true') return 'demo'

  if (isDemoPath(window.location.pathname)) return 'demo'
  return 'landing'
}

export function subscribeRoute(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('hashchange', onChange)
  }
}

export function navigateTo(route: AppRoute): void {
  const target = route === 'demo' ? '/demo' : '/'
  if (window.location.pathname !== target) {
    window.history.pushState(null, '', target)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** @deprecated 使用 getAppRoute */
export function getPathname(): string {
  return window.location.pathname
}

/** @deprecated 使用 subscribeRoute */
export function subscribePathname(onChange: () => void): () => void {
  return subscribeRoute(onChange)
}
