import { createServer } from 'http'
import app from './app'

const PORT = process.env.PORT ? Number(process.env.PORT) : 8090

const server = createServer(app)

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
