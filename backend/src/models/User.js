import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  settings: {
    currency: {
      type: String,
      default: 'USD'
    },
    theme: {
      type: String,
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  circle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Circle',
    default: null
  },
  customRatios: {
    needsRatio: { type: Number, default: 50 },
    wantsRatio: { type: Number, default: 30 },
    savingsRatio: { type: Number, default: 20 }
  },
  categoryMappings: [{
    category: { type: String, required: true },
    bucket: { type: String, enum: ['need', 'want', 'savings'], required: true }
  }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User; 