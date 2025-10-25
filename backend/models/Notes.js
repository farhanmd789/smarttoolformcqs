const mongoose = require('mongoose');

const notesSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  videoId: { type: String, required: true },
  videoTitle: { type: String },
  videoUrl: { type: String },
  channelTitle: { type: String },
  contentTitle: { type: String }, // Main topic/title of the content
  bulletPoints: [{ type: String }], // Array of key points
  createdAt: { type: Date, default: Date.now }
});

// Indexes for faster queries
notesSchema.index({ userId: 1, createdAt: -1 }); // Primary: Get user's notes sorted by date
notesSchema.index({ userId: 1, videoId: 1 }); // Get notes for specific user+video (most common query)
notesSchema.index({ videoId: 1 }); // Get all notes for a video
notesSchema.index({ createdAt: -1 }); // Recent notes across all users

module.exports = mongoose.model('Notes', notesSchema);