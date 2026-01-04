import { Router, type Router as ExpressRouter } from 'express';
import Controller from '../controllers/hello'
import { login, signup, refresh, logout } from '../controllers/auth'
import { getUserDetails } from '../controllers/users'
import { authenticateToken } from '../middlewares/auth'

const router: ExpressRouter = Router();

router.post('/auth/login', login)
router.post('/auth/signup', signup)
router.post('/auth/refresh', refresh)
router.post('/auth/logout', logout)
router.get('/hello', Controller.getHello)
// authenticator apis 
router.get('/users/:id', authenticateToken, getUserDetails)

export default router
