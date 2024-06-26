const express = require('express')
const router = express.Router()
const {getUsers,getUser,register,Login,updateUser,deleteUser, createTodo, createDomain, updateDomain, updateTodo, deleteDomain, deleteTodo, getDomain, getDomains, getTasks, getTask} = require('../controller/userController')
const verifyToken = require("../middlewares/authMiddleware")

router.get('/Users',getUsers)
router.get('/:id',getUser)
router.post('/signup',register)
router.post('/signin',Login)
router.use(verifyToken)
router.post('/taskDomain',createDomain)
router.post('/taskDomain/:taskDomainId/task',createTodo)
router.put('/taskDomain/:taskDomainId',updateDomain)
router.put('/taskDomain/:taskDomainId/:taskId',updateTodo)
router.get('/taskDomain/fetchall',getDomains)
router.get('/taskDomain/:taskDomainId',getDomain)
router.get('/taskDomain/:taskDomainId/task',getTasks)
router.get('/taskDomain/:taskDomainId/:taskId',getTask)
router.delete('/taskDomain/:taskDomainId',deleteDomain)
router.delete('/taskDomain/:taskDomainId/:taskId',deleteTodo)
router.put('/:id',updateUser)
router.delete('/:id',deleteUser)

module.exports = router