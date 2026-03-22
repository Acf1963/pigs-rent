import { Router } from 'express';
import { getLotes, createLote } from '../controllers/loteController';

const router = Router();

router.get('/', getLotes);
router.post('/', createLote);

export default router;