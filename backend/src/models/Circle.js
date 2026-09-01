import mongoose from 'mongoose';

const circleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  monthlyTargetIncome: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Circle = mongoose.model('Circle', circleSchema);

export default Circle;
