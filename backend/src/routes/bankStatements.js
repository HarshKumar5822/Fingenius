import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import BankStatement from '../models/BankStatement.js';
import User from '../models/User.js';
import { extractStatementText } from '../utils/statementParser.js';
import { analyzeStatementText } from '../utils/statementAI.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const isPDF = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    const isCSV = file.mimetype === 'text/csv' || /\.csv$/i.test(file.originalname);
    if (!isPDF && !isCSV) {
      return cb(new Error('Only PDF or CSV files are supported'));
    }
    cb(null, true);
  }
});

// Apply protection middleware to all routes
router.use(protect);

// Upload and AI-analyze a bank statement
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  let bankStatement;
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    bankStatement = await BankStatement.create({
      user: req.user._id,
      fileName: req.file.originalname,
      status: 'processing'
    });

    const user = await User.findById(req.user._id);
    const currency = user?.settings?.currency || 'INR';

    // 1) Extract raw text from the uploaded PDF/CSV
    const statementText = await extractStatementText(req.file.buffer, req.file.mimetype, req.file.originalname);

    // 2) Ask the AI to turn that text into a structured financial analysis
    const analysis = await analyzeStatementText(statementText, currency);

    bankStatement.analysis = analysis;
    bankStatement.status = 'completed';
    await bankStatement.save();

    res.status(201).json({
      status: 'success',
      data: { bankStatement }
    });
  } catch (error) {
    console.error('Error processing bank statement:', error.message);

    if (bankStatement) {
      bankStatement.status = 'failed';
      bankStatement.errorMessage = error.message;
      await bankStatement.save().catch(() => {});
    }

    const status = error.code === 'GROQ_NOT_CONFIGURED' ? 503 : 400;
    res.status(status).json({
      status: 'error',
      code: error.code,
      message: error.message || 'Failed to analyze this statement.'
    });
  }
});

// Get all bank statements for a user
router.get('/', async (req, res) => {
  try {
    const bankStatements = await BankStatement.find({ user: req.user._id })
      .sort({ uploadDate: -1 });

    res.json({
      status: 'success',
      data: {
        bankStatements
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get a specific bank statement
router.get('/:id', async (req, res) => {
  try {
    const bankStatement = await BankStatement.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!bankStatement) {
      return res.status(404).json({
        status: 'error',
        message: 'Bank statement not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        bankStatement
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// Delete a bank statement
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await BankStatement.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Bank statement not found' });
    }

    res.json({ status: 'success', message: 'Bank statement deleted' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export default router;
