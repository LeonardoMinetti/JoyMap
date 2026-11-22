import { Hono } from 'hono'
import { makeCtx } from './lib.js'
import authRoutes from './routes/auth.js'
import creatorRoutes from './routes/creator.js'
import adminRoutes from './routes/admin.js'
import publicRoutes from './routes/public.js'
import vooRoutes from './routes/voo.js'

export { ICONS, DEFAULT_THEME, sanitizeTheme, sanitizeSvg } from './theme.js'

export function createApp(db, opts = {}) {
  const app = new Hono()
  const x = makeCtx(db, opts)
  authRoutes(app, x)
  adminRoutes(app, x)
  creatorRoutes(app, x)
  vooRoutes(app, x)
  publicRoutes(app, x) // por último: inclui o fallback do site
  return app
}
