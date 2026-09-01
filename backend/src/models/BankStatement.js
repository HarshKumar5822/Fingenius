import mongoose from 'mongoose';

const bankStatementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  analysis: {
    totalIncome: Number,
    totalExpenses: Number,
    netSavings: Number,
    healthScore: Number,
    summary: String,
    recurringExpenses: [{
      description: String,
      amount: Number,
      frequency: String
    }],
    topCategories: [{
      category: String,
      amount: Number,
      percentage: Number
    }],
    monthlyTrend: [{
      month: String,
      income: Number,
      expenses: Number
    }],
    suggestions: [String]
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },
  errorMessage: {
    type: String
  }
});

export default mongoose.model('BankStatement', bankStatementSchema); 