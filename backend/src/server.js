import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import transactionRoutes from './routes/transactions.js';
import goalRoutes from './routes/goals.js';
import alertRoutes from './routes/alerts.js';
import bankStatementRoutes from './routes/bankStatements.js';
import circleRoutes from './routes/circles.js';
import investmentRoutes from './routes/investments.js';
import rule503020Routes from './routes/rule503020.js';
import subscriptionRoutes from './routes/subscriptions.js';
import aiRoutes from './routes/ai.js';
import { protect } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '5001', 10);

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', protect, transactionRoutes);
app.use('/api/goals', protect, goalRoutes);
app.use('/api/alerts', protect, alertRoutes);
app.use('/api/bank-statements', protect, bankStatementRoutes);
app.use('/api/circles', protect, circleRoutes);
app.use('/api/investments', protect, investmentRoutes);
app.use('/api/rule503020', protect, rule503020Routes);
app.use('/api/subscriptions', protect, subscriptionRoutes);
app.use('/api/ai', protect, aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// MongoDB Connection with retry logic
const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
    if (retries > 0) {
      console.log(`Retrying connection... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    }
  }
};

// Start server only after DB connection
connectDB().then(() => {
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log('API URL:', process.env.CORS_ORIGIN);
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${port} is busy, trying ${port + 1}...`);
      server.listen(port + 1);
    } else {
      console.error('Server error:', error);
    }
  });
}); 