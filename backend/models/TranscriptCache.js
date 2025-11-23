// backend/models/TranscriptCache.js
const mongoose = require('mongoose');

const transcriptCacheSchema = new mongoose.Schema({
  videoId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  channelTitle: String,
  duration: String,
  durationMinutes: Number,
  transcript: {
    type: String,
    required: true
  },
  transcriptLength: Number,
  publishedAt: Date,
  cachedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 1
  }
});

// Index for automatic cleanup of old cache entries (optional)
transcriptCacheSchema.index({ cachedAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Update last accessed time on each retrieval
transcriptCacheSchema.methods.updateAccess = function() {
  this.lastAccessed = new Date();
  this.accessCount += 1;
  return this.save();
};

module.exports = mongoose.model('TranscriptCache', transcriptCacheSchema);
