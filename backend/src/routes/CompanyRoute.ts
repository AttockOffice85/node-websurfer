// backend/src/routes/CompanyRoute.ts
import express from 'express';
import { addCompany } from '../controllers/CompanyController';

const router = express.Router();

// POST routes
router.post('/add-company', addCompany);

export default router;