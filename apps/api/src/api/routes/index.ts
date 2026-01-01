import { Router, type Router as ExpressRouter } from 'express';
import helloController from '../controllers/hello'
import { login } from '../controllers/auth'
import { authenticateToken } from '../middlewares/auth'

const router: ExpressRouter = Router();

router.post('/login', login)
router.get('/hello', authenticateToken, helloController.getHello)

export default router
