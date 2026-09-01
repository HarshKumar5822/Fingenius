import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  circle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Circle',
    default: null
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['mutual_fund', 'stock', 'fixed_deposit', 'gold', 'crypto', 'ppf', 'real_estate', 'other'],
    required: true
  },
  amountInvested: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    required: true
  },
  sipAmount: {
    type: Number,
    default: 0
  },
  frequency: {
    type: String,
    enum: ['monthly', 'one_time'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

investmentSchema.index({ user: 1, type: 1 });

const Investment = mongoose.model('Investment', investmentSchema);

export default Investment;
