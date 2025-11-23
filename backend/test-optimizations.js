// Test script for performance optimizations
const {
  splitTranscriptIntoChunks,
  calculateOptimalChunks,
  distributeQuestionsAcrossChunks,
  mergeChunkQuizzes,
  estimateProcessingTime
} = require('./utils/transcriptUtils');

console.log('🧪 Testing Performance Optimization Functions\n');

// Test 1: Calculate optimal chunks
console.log('Test 1: Calculate Optimal Chunks');
console.log('5,000 chars:', calculateOptimalChunks(5000), 'chunks');
console.log('20,000 chars:', calculateOptimalChunks(20000), 'chunks');
console.log('60,000 chars:', calculateOptimalChunks(60000), 'chunks');
console.log('90,000 chars:', calculateOptimalChunks(90000), 'chunks');
console.log('');

// Test 2: Split transcript
console.log('Test 2: Split Transcript');
const sampleTranscript = 'This is a sample transcript. '.repeat(100);
const chunks = splitTranscriptIntoChunks(sampleTranscript, 3);
console.log('Original length:', sampleTranscript.length);
console.log('Number of chunks:', chunks.length);
console.log('Chunk lengths:', chunks.map(c => c.length));
console.log('');

// Test 3: Distribute questions
console.log('Test 3: Distribute Questions');
console.log('15 questions, 4 chunks:', distributeQuestionsAcrossChunks(15, 4));
console.log('20 questions, 5 chunks:', distributeQuestionsAcrossChunks(20, 5));
console.log('10 questions, 3 chunks:', distributeQuestionsAcrossChunks(10, 3));
console.log('');

// Test 4: Merge chunk quizzes
console.log('Test 4: Merge Chunk Quizzes');
const chunkQuizzes = [
  [
    { question: 'Q1 from chunk 1', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', topic: 'Topic1' },
    { question: 'Q2 from chunk 1', options: ['A', 'B', 'C', 'D'], correct_answer: 'B', topic: 'Topic1' }
  ],
  [
    { question: 'Q1 from chunk 2', options: ['A', 'B', 'C', 'D'], correct_answer: 'C', topic: 'Topic2' },
    { question: 'Q1 from chunk 1', options: ['A', 'B', 'C', 'D'], correct_answer: 'A', topic: 'Topic1' } // Duplicate
  ],
  [
    { question: 'Q1 from chunk 3', options: ['A', 'B', 'C', 'D'], correct_answer: 'D', topic: 'Topic3' }
  ]
];
const merged = mergeChunkQuizzes(chunkQuizzes);
console.log('Total questions before merge:', chunkQuizzes.flat().length);
console.log('Total questions after merge (duplicates removed):', merged.length);
console.log('Question IDs:', merged.map(q => q.questionId));
console.log('');

// Test 5: Estimate processing time
console.log('Test 5: Estimate Processing Time');
console.log('5,000 chars (no chunking):', estimateProcessingTime(5000, false), 'seconds');
console.log('5,000 chars (with chunking):', estimateProcessingTime(5000, true), 'seconds');
console.log('30,000 chars (no chunking):', estimateProcessingTime(30000, false), 'seconds');
console.log('30,000 chars (with chunking):', estimateProcessingTime(30000, true), 'seconds');
console.log('70,000 chars (no chunking):', estimateProcessingTime(70000, false), 'seconds');
console.log('70,000 chars (with chunking):', estimateProcessingTime(70000, true), 'seconds');
console.log('');

console.log('✅ All tests completed successfully!');
