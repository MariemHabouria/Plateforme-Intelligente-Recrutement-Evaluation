"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
// Toutes les routes sont protégées et réservées au Super Admin
router.use(auth_1.protect);
router.use((0, auth_1.authorize)('SUPER_ADMIN'));
router.get('/', user_controller_1.getUsers);
router.get('/:id', user_controller_1.getUserById);
router.put('/:id', user_controller_1.updateUser);
router.patch('/:id/toggle-status', user_controller_1.toggleUserStatus);
router.delete('/:id', user_controller_1.deleteUser);
router.post('/:id/resend-invite', user_controller_1.resendInvite);
router.post('/:id/reset-password', user_controller_1.resetPassword);
exports.default = router;
