import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  targetAmount: {
    type: Number,
    required: true
  },
  currentAmount: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  contributions: [{
    amount: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  reminderFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  }
}, { timestamps: true });

// Calculate progress percentage
goalSchema.virtual('progress').get(function() {
  return (this.currentAmount / this.targetAmount) * 100;
});

// Calculate remaining amount
goalSchema.virtual('remainingAmount').get(function() {
  return this.targetAmount - this.currentAmount;
});

// Calculate days remaining
goalSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const timeDiff = this.deadline.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
});

// Index for efficient querying
goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, deadline: 1 });

const Goal = mongoose.model('Goal', goalSchema);

export default Goal; 