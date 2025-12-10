const express = require('express');
const router = express.Router();
// Placeholder payments router until DB layer adapted
router.get('/', (req, res) => {
  return res.json({ payments: [], note: 'Stub payments list – implement DB access' });
});

router.get('/summary', (req, res) => {
  return res.json({ total: 0, count: 0, note: 'Stub payments summary – implement DB aggregation' });
});

router.get('/health', (req, res) => res.json({ ok: true }));

module.exports = router;