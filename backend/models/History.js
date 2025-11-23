const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoTitle: { type: String },
  videoUrl: { type: String },
  videoId: { type: String },
  quiz: { type: Array }, // Array of questions (legacy)
  questions: { type: Array }, // Full questions with topics and correct answers
  userAnswers: { type: Array }, // Array of user's selected answers
  score: { type: Number }, // Score as percentage (0-100)
  totalQuestions: { type: Number }, // Total number of questions
  correctAnswers: { type: Number }, // Number of correct answers
  date: { type: Date, default: Date.now }, // Quiz attempt date
  createdAt: { type: Date, default: Date.now } // Record creation date
});

// Indexes for faster queries
historySchema.index({ userId: 1, date: -1 }); // Primary: Get user's history sorted by date
historySchema.index({ userId: 1, score: -1 }); // Get user's best/worst scores
historySchema.index({ userId: 1, videoId: 1 }); // Get user's attempts for specific video
historySchema.index({ createdAt: -1 }); // Recent quizzes across all users
historySchema.index({ videoId: 1 }); // All attempts for a video

module.exports = mongoose.model('History', historySchema);
