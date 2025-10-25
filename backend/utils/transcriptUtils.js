// backend/utils/transcriptUtils.js

/**
 * Split transcript into chunks for parallel processing
 * @param {string} transcript - Full transcript text
 * @param {number} numChunks - Number of chunks to split into
 * @returns {Array<string>} Array of transcript chunks
 */
function splitTranscriptIntoChunks(transcript, numChunks = 4) {
  if (!transcript || transcript.length === 0) {
    return [];
  }

  // For short transcripts, don't split
  if (transcript.length < 5000) {
    return [transcript];
  }

  const words = transcript.split(/\s+/);
  const wordsPerChunk = Math.ceil(words.length / numChunks);
  const chunks = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * wordsPerChunk;
    const end = Math.min(start + wordsPerChunk, words.length);
    const chunk = words.slice(start, end).join(' ');
    
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}

/**
 * Calculate optimal number of chunks based on transcript length
 * @param {number} transcriptLength - Length of transcript in characters
 * @returns {number} Optimal number of chunks
 */
function calculateOptimalChunks(transcriptLength) {
  if (transcriptLength < 5000) return 1;
  if (transcriptLength < 20000) return 2;
  if (transcriptLength < 40000) return 3;
  if (transcriptLength < 60000) return 4;
  if (transcriptLength < 80000) return 5;
  return 6; // Max 6 chunks for very long videos
}

/**
 * Calculate questions per chunk to reach target total
 * @param {number} totalQuestions - Target total questions
 * @param {number} numChunks - Number of chunks
 * @returns {Array<number>} Questions per chunk
 */
function distributeQuestionsAcrossChunks(totalQuestions, numChunks) {
  const baseQuestions = Math.floor(totalQuestions / numChunks);
  const remainder = totalQuestions % numChunks;
  
  const distribution = [];
  for (let i = 0; i < numChunks; i++) {
    // Distribute remainder questions to first chunks
    distribution.push(baseQuestions + (i < remainder ? 1 : 0));
  }
  
  return distribution;
}

/**
 * Merge quiz questions from multiple chunks and remove duplicates
 * @param {Array<Array<Object>>} chunkQuizzes - Array of quiz arrays from each chunk
 * @returns {Array<Object>} Merged and deduplicated quiz questions
 */
function mergeChunkQuizzes(chunkQuizzes) {
  const allQuestions = [];
  const seenQuestions = new Set();
  
  let questionId = 1;
  
  for (const chunkQuiz of chunkQuizzes) {
    if (!Array.isArray(chunkQuiz)) continue;
    
    for (const question of chunkQuiz) {
      // Create a normalized version for duplicate detection
      const normalizedQuestion = question.question.toLowerCase().trim();
      
      // Skip if we've seen a very similar question
      if (seenQuestions.has(normalizedQuestion)) {
        continue;
      }
      
      seenQuestions.add(normalizedQuestion);
      
      // Add with sequential ID
      allQuestions.push({
        ...question,
        questionId: questionId++
      });
    }
  }
  
  return allQuestions;
}

/**
 * Estimate processing time based on transcript length
 * @param {number} transcriptLength - Length of transcript
 * @param {boolean} useChunking - Whether chunking is enabled
 * @returns {number} Estimated time in seconds
 */
function estimateProcessingTime(transcriptLength, useChunking = true) {
  if (transcriptLength < 5000) return 15; // Short: 15 seconds
  if (transcriptLength < 20000) return useChunking ? 30 : 60; // Medium
  if (transcriptLength < 60000) return useChunking ? 60 : 120; // Long
  return useChunking ? 90 : 180; // Very long
}

module.exports = {
  splitTranscriptIntoChunks,
  calculateOptimalChunks,
  distributeQuestionsAcrossChunks,
  mergeChunkQuizzes,
  estimateProcessingTime
};
