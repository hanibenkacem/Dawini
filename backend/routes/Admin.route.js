// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const verifytoken = require('../middlewares/AuthMiddleware')
   // your existing JWT middleware
const isAdmin = require('../middlewares/isAdmin');           // new admin guard
const adminController = require('../controllers/Admin.controller');

// All routes below require a valid JWT AND admin role
router.use(verifytoken, isAdmin);

router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
