// Small Hono example; Hono can be used for edge-friendly handlers
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => c.json({ hello: 'from hono' }))

export default app
