"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Routes publiques
router.post('/login', authController_1.login);
// Routes protégées
router.patch('/change-password', auth_1.protect, authController_1.changePassword);
router.get('/me', auth_1.protect, authController_1.getMe);
// Route Super Admin uniquement
router.post('/register', auth_1.protect, (0, auth_1.authorize)('SUPER_ADMIN'), authController_1.register);
exports.default = router;
