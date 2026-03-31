"use strict";
// backend/src/routes/adminRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const circuitConfigController_1 = require("../controllers/circuitConfigController");
const router = (0, express_1.Router)();
// Toutes les routes nécessitent une authentification Super Admin
router.use(auth_1.protect);
router.use((0, auth_1.authorize)('SUPER_ADMIN'));
// Gestion des circuits de validation
router.get('/circuits', circuitConfigController_1.getCircuits);
router.get('/circuits/:id', circuitConfigController_1.getCircuitById);
router.post('/circuits', circuitConfigController_1.createCircuit);
router.put('/circuits/:id', circuitConfigController_1.updateCircuit);
router.patch('/circuits/:id/toggle', circuitConfigController_1.toggleCircuit);
router.post('/circuits/reset', circuitConfigController_1.resetCircuits);
router.delete('/circuits/:id', circuitConfigController_1.deleteCircuit);
exports.default = router;
