import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth';
import { getAuditLogs, getAuditStats, exportAuditLogs } from '../controllers/auditLogController';

const router = Router();

router.use(protect);
router.use(authorize('SUPER_ADMIN', 'DRH'));

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/export', exportAuditLogs);

export default router;