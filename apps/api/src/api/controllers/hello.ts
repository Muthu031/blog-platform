import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

const HelloQuerySchema = z.object({
  name: z.string().optional(),
})

const getHello = (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = HelloQuerySchema.parse(req.query)
    const name = parsed?.name ?? 'developer'
    res.status(200).json({ message: `Hello, ${name}!` })
  } catch (err) {
    next(err)
  }
}

export default { getHello }
