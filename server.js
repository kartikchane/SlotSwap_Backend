import express from 'express';
import cors from 'cors';

let db;
try {
  const dbModule = await import('./db.js');
  db = dbModule.default;
  console.log('Database module loaded successfully');
} catch (error) {
  console.error('Failed to load database:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SlotSwapper API is running' });
});

// Import routes
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import swapRoutes from './routes/swap.js';

app.use('/api/auth', authRoutes);
app.use('/api', eventsRoutes);
app.use('/api', swapRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Available routes:');
  console.log('  POST /api/auth/signup');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/auth/me');
  console.log('  GET  /api/events');
  console.log('  POST /api/events');
});
