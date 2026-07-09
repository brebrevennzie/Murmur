import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './src/firebase';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies (student cabinets can be large due to test arrays)
  app.use(express.json({ limit: '10mb' }));

  // API Route to GET student cabinet details
  app.get('/api/cabinet/:cabinetId', async (req, res) => {
    try {
      const { cabinetId } = req.params;
      if (!cabinetId) {
        return res.status(400).json({ success: false, error: 'Missing cabinetId' });
      }

      const docRef = doc(db, 'cabinets', cabinetId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        res.json({ success: true, data: snapshot.data() });
      } else {
        res.status(404).json({ success: false, error: 'Cabinet not found' });
      }
    } catch (error: any) {
      console.error('Error in GET /api/cabinet:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  });

  // API Route to UPDATE / SUBMIT student cabinet answers
  app.post('/api/submit-test', async (req, res) => {
    try {
      const { cabinetId, cabinetData } = req.body;
      if (!cabinetId || !cabinetData) {
        return res.status(400).json({ success: false, error: 'Missing cabinetId or cabinetData' });
      }

      const docRef = doc(db, 'cabinets', cabinetId);
      await setDoc(docRef, cabinetData, { merge: true });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in POST /api/submit-test:', error);
      res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    }
  });

  // Vite development middleware vs. static production assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
