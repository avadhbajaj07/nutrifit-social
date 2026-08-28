import express from 'express';
import {
  createBlotatoPost,
  getBlotatoAccounts,
  getBlotatoPostStatus,
  getBlotatoSubaccounts,
  getBlotatoUser,
  testBlotatoConnection,
  uploadBlotatoMedia
} from '../services/blotatoService.js';

const router = express.Router();
const sendError = (res, error) => res.status(error.status || 500).json({ error: error.message });

router.get('/connection', async (req, res) => {
  try { res.json(await testBlotatoConnection()); } catch (error) { sendError(res, error); }
});

router.get('/user', async (req, res) => {
  try { res.json(await getBlotatoUser()); } catch (error) { sendError(res, error); }
});

router.get('/accounts', async (req, res) => {
  try { res.json(await getBlotatoAccounts(null, req.query.platform || '')); } catch (error) { sendError(res, error); }
});

router.get('/accounts/:accountId/subaccounts', async (req, res) => {
  try { res.json(await getBlotatoSubaccounts(req.params.accountId)); } catch (error) { sendError(res, error); }
});

router.post('/media', async (req, res) => {
  try { res.status(201).json(await uploadBlotatoMedia(req.body.url)); } catch (error) { sendError(res, error); }
});

router.post('/posts', async (req, res) => {
  try { res.status(201).json(await createBlotatoPost(req.body)); } catch (error) { sendError(res, error); }
});

router.get('/posts/:postSubmissionId', async (req, res) => {
  try { res.json(await getBlotatoPostStatus(req.params.postSubmissionId)); } catch (error) { sendError(res, error); }
});

export default router;
