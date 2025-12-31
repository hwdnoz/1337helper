import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import codeRoutes from './routes/codeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import jobsRoutes from './routes/jobsRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Register routes
app.use('/api', codeRoutes);
app.use('/api', adminRoutes);
app.use('/api', jobsRoutes);
app.use('/api', cacheRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
