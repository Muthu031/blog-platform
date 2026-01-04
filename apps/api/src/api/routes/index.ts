import { Router, type Router as ExpressRouter } from 'express';
import Controller from '../controllers/hello'
import { login, signup } from '../controllers/auth'
import { authenticateToken } from '../middlewares/auth'

const router: ExpressRouter = Router();

router.post('/login', login)
router.post('/signup', signup)
router.get('/hello', Controller.getHello)

export default router
