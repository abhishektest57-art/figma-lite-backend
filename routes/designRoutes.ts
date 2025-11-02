// routes/designRoutes.ts
import { Router } from 'express';
import { DesignController } from '../controllers/DesignController';

const router = Router();

router.get('/', DesignController.getAll);
router.post('/', DesignController.create);
router.get('/:id', DesignController.getById);
router.put('/:id', DesignController.update);
router.delete('/:id', DesignController.delete);

export default router;