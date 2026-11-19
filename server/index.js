import { serve } from '@hono/node-server'
import { openDb } from './db.js'
import { createApp } from './app.js'

const port = Number(process.env.PORT || 4300)
const app = createApp(openDb())
serve({ fetch: app.fetch, port }, () => console.log(`MAPA SP (MVP) em http://localhost:${port}`))
