import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['budget', 'goal', 'bill', 'system'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Transaction', 'Goal', 'User']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  expiresAt: {
    type: Date
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String
  }
}, { timestamps: true });

// Index for efficient querying
alertSchema.index({ user: 1, status: 1 });
alertSchema.index({ user: 1, createdAt: -1 });

// Auto-archive old alerts
alertSchema.pre('save', function(next) {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'archived';
  }
  next();
});

const Alert = mongoose.model('Alert', alertSchema);

export default Alert; 