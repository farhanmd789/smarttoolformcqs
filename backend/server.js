// backend/server.js

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const ytc = require("youtube-caption-scraper");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { YoutubeTranscript } = require('youtube-transcript');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const History = require('./models/History');
const Notes = require('./models/Notes');
const User = require('./models/User');
const TranscriptCache = require('./models/TranscriptCache');

// Import transcript utilities
const {
  splitTranscriptIntoChunks,
  calculateOptimalChunks,
  distributeQuestionsAcrossChunks,
  mergeChunkQuizzes,
  estimateProcessingTime
} = require('./utils/transcriptUtils');

const app = express();
const port = process.env.PORT || 3001;

// Configuration limits
const MAX_VIDEO_DURATION_MINUTES = 180; // 3 hours max
const REQUEST_TIMEOUT_MS = 300000; // 5 minutes
const MAX_TRANSCRIPT_LENGTH = 100000; // ~100k characters (~2-3 hour videos)

// Middleware
app.use(cors());
app.use(express.json());

// Set request timeout
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT_MS);
  res.setTimeout(REQUEST_TIMEOUT_MS);
  next();
});

// Environment variables and constants
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production-2024';
const MONGO_URI = process.env.MONGO_URI || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

if (!MONGO_URI) {
  console.error("Error: MONGO_URI environment variable not set.");
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable not set.");
  process.exit(1);
}

if (!YOUTUBE_API_KEY) {
  console.error("Error: YOUTUBE_API_KEY environment variable not set.");
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// MongoDB connection with better error handling
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // Timeout after 10s
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  tls: true,
  tlsAllowInvalidCertificates: false,
}).then(() => {
  console.log("✅ MongoDB connected successfully");
}).catch(err => {
  console.error("❌ MongoDB connection error:", err.message);
  console.error("Please check:");
  console.error("1. Your MONGO_URI in .env file");
  console.error("2. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)");
  console.error("3. Database user credentials");
  console.error("Continuing without database - authentication will not work");
  // Don't exit - let server run for debugging
});

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

// Utility: Extract video ID from YouTube URL
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Get video metadata and transcript from YouTube API + transcript libraries (WITH CACHING)
async function getVideoInfo(videoId, useCache = true) {
  try {
    // Check cache first
    if (useCache) {
      const cachedVideo = await TranscriptCache.findOne({ videoId });
      if (cachedVideo) {
        console.log(`✅ Cache HIT for video: ${videoId}`);
        // Update access stats
        await cachedVideo.updateAccess();
        
        return {
          id: cachedVideo.videoId,
          title: cachedVideo.title,
          description: cachedVideo.description,
          channelTitle: cachedVideo.channelTitle,
          publishedAt: cachedVideo.publishedAt,
          duration: cachedVideo.duration,
          durationMinutes: cachedVideo.durationMinutes,
          transcript: cachedVideo.transcript,
          fromCache: true
        };
      }
      console.log(`⚠️ Cache MISS for video: ${videoId}, fetching from YouTube...`);
    }

    // Fetch from YouTube API
    const videoResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY,
      },
    });

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return null;
    }

    const video = videoResponse.data.items[0];
    
    // Parse video duration (ISO 8601 format: PT1H2M10S)
    const duration = video.contentDetails.duration;
    const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(durationMatch[1] || 0);
    const minutes = parseInt(durationMatch[2] || 0);
    const totalMinutes = (hours * 60) + minutes;
    
    // Check video duration limit
    if (totalMinutes > MAX_VIDEO_DURATION_MINUTES) {
      console.warn(`Video too long: ${totalMinutes} minutes (max: ${MAX_VIDEO_DURATION_MINUTES})`);
      throw new Error(`Video duration (${totalMinutes} min) exceeds maximum allowed (${MAX_VIDEO_DURATION_MINUTES} min)`);
    }
    
    console.log(`📹 Video duration: ${hours}h ${minutes}m (${totalMinutes} minutes)`);
    
    let transcriptText = '';

    try {
      // Try YouTube Transcript package first
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map(t => t.text).join(' ');
    } catch (error) {
      // fallback to youtube-caption-scraper
      try {
        const captions = await ytc.getSubtitles({ videoID: videoId, lang: 'en' });
        transcriptText = captions.map(c => c.text).join(' ');
      } catch (innerError) {
        transcriptText = '';
      }
    }
    
    // Limit transcript length to prevent API overload
    if (transcriptText.length > MAX_TRANSCRIPT_LENGTH) {
      console.warn(`Transcript too long (${transcriptText.length} chars), truncating to ${MAX_TRANSCRIPT_LENGTH}`);
      transcriptText = transcriptText.substring(0, MAX_TRANSCRIPT_LENGTH);
    }
    
    console.log(`📝 Transcript length: ${transcriptText.length} characters`);

    const videoInfo = {
      id: videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: duration,
      durationMinutes: totalMinutes,
      transcript: transcriptText,
      fromCache: false
    };

    // Cache the transcript for future use
    if (useCache && transcriptText.length > 0) {
      try {
        await TranscriptCache.findOneAndUpdate(
          { videoId },
          {
            videoId,
            title: video.snippet.title,
            description: video.snippet.description,
            channelTitle: video.snippet.channelTitle,
            publishedAt: video.snippet.publishedAt,
            duration: duration,
            durationMinutes: totalMinutes,
            transcript: transcriptText,
            transcriptLength: transcriptText.length,
            cachedAt: new Date(),
            lastAccessed: new Date()
          },
          { upsert: true, new: true }
        );
        console.log(`💾 Transcript cached for video: ${videoId}`);
      } catch (cacheError) {
        console.warn('⚠️ Failed to cache transcript:', cacheError.message);
        // Don't fail the request if caching fails
      }
    }

    return videoInfo;
  } catch (err) {
    console.error("getVideoInfo error:", err);
    return null;
  }
}

// JWT Authentication Middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access denied, no token provided" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Password hashing
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Compare password
async function comparePassword(inputPassword, storedHash) {
  return bcrypt.compare(inputPassword, storedHash);
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign({ _id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

// Check if content looks educational
function isEducationalContent(videoInfo) {
  const keywords = ['tutorial', 'lecture', 'course', 'lesson', 'explained', 'introduction', 'guide', 'education', 'learn'];
  const titleDesc = (videoInfo.title + " " + videoInfo.description).toLowerCase();
  return keywords.some(word => titleDesc.includes(word));
}

// Generate Quiz from a single chunk
async function generateQuizFromChunk(chunkText, numQuestions, difficulty, videoTitle, chunkIndex) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Adjust difficulty parameters
  let complexity, scope;
  switch (difficulty) {
    case 'easy':
      complexity = "Basic concepts";
      scope = "simple straightforward questions";
      break;
    case 'medium':
      complexity = "Moderate complexity";
      scope = "a mix of conceptual and application questions";
      break;
    case 'hard':
      complexity = "Advanced topics";
      scope = "challenging questions requiring full understanding";
      break;
    default:
      complexity = "Moderate complexity";
      scope = "a mix of conceptual and application questions";
  }

  const prompt = `
You are a quiz creator. Based on the following video content:
Title: ${videoTitle}
Content section ${chunkIndex + 1}:
${chunkText}

Generate EXACTLY ${numQuestions} multiple-choice questions focused on ${complexity}.  
Questions should be ${scope}.

IMPORTANT: 
- Options should be plain text without prefixes like "A)", "B)", etc.
- The correct answer should be a single letter: A, B, C, or D (corresponding to the option index).
- Generate diverse questions covering different aspects of this content section.

Return the quiz in JSON array format:
[
  {
    "questionId": 1,
    "question": "What is the main topic?",
    "options": ["First option", "Second option", "Third option", "Fourth option"],
    "correct_answer": "A",
    "topic": "Category Name"
  },
  ...
]
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    // Safe parse, handle bad JSON from model
    let quizData = [];
    try {
      quizData = JSON.parse(text);
    } catch (err) {
      // fallback: try to find JSON block inside text
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) quizData = JSON.parse(jsonMatch[0]);
    }

    // Normalize quiz data to ensure consistent format
    quizData = quizData.map((q, idx) => {
      // Ensure correct_answer field exists (handle both correctAnswer and correct_answer)
      const correctAnswer = q.correct_answer || q.correctAnswer;
      
      // Clean options - remove any letter prefixes like "A)", "B.", etc.
      const cleanOptions = q.options.map(opt => {
        return opt.replace(/^[A-D][\)\.:\-\s]+/i, '').trim();
      });
      
      return {
        questionId: idx + 1, // Will be renumbered after merging
        question: q.question,
        options: cleanOptions,
        correct_answer: correctAnswer,
        topic: q.topic || 'General'
      };
    });

    console.log(`✅ Generated ${quizData.length} questions from chunk ${chunkIndex + 1}`);
    return quizData;

  } catch (err) {
    console.error(`❌ Error generating quiz from chunk ${chunkIndex + 1}:`, err);
    return [];
  }
}

// Generate Quiz with AI Gemini (WITH CHUNKING AND PARALLEL PROCESSING)
async function generateQuiz(videoInfo, numQuestions = 15, difficulty = 'medium') {
  const transcriptLength = videoInfo.transcript.length;
  
  // Determine if we should use chunking
  const optimalChunks = calculateOptimalChunks(transcriptLength);
  const useChunking = optimalChunks > 1;
  
  console.log(`📊 Transcript: ${transcriptLength} chars, Using ${optimalChunks} chunk(s), Parallel: ${useChunking}`);
  
  if (!useChunking) {
    // For short transcripts, use single request (original method)
    return await generateQuizFromChunk(
      videoInfo.transcript, 
      numQuestions, 
      difficulty, 
      videoInfo.title, 
      0
    );
  }
  
  // Split transcript into chunks
  const chunks = splitTranscriptIntoChunks(videoInfo.transcript, optimalChunks);
  console.log(`📦 Split into ${chunks.length} chunks`);
  
  // Distribute questions across chunks
  const questionsPerChunk = distributeQuestionsAcrossChunks(numQuestions, chunks.length);
  console.log(`📝 Questions per chunk: ${questionsPerChunk.join(', ')}`);
  
  // Generate quiz from each chunk in parallel
  const startTime = Date.now();
  const chunkPromises = chunks.map((chunk, index) => 
    generateQuizFromChunk(chunk, questionsPerChunk[index], difficulty, videoInfo.title, index)
  );
  
  const chunkQuizzes = await Promise.all(chunkPromises);
  const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`⚡ Parallel processing completed in ${processingTime}s`);
  
  // Merge and deduplicate questions
  const mergedQuiz = mergeChunkQuizzes(chunkQuizzes);
  console.log(`✅ Final quiz: ${mergedQuiz.length} questions (target: ${numQuestions})`);
  
  // If we got too many questions, trim to target
  if (mergedQuiz.length > numQuestions) {
    return mergedQuiz.slice(0, numQuestions);
  }
  
  return mergedQuiz;
}

// Generate Notes
async function generateNotes(videoInfo) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
Analyze the following video and create comprehensive learning notes:
Title: ${videoInfo.title}
Transcript: ${videoInfo.transcript.substring(0, 5000)}

Generate structured learning notes in JSON format:
{
  "contentTitle": "Main topic or title",
  "bulletPoints": [
    "Key point 1 with details",
    "Key point 2 with details",
    "Key point 3 with details",
    "Key point 4 with details",
    "Key point 5 with details"
  ]
}

Provide at least 5-10 comprehensive bullet points covering the main concepts.
Return ONLY valid JSON, no markdown formatting.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    
    // Clean and parse JSON
    const cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
    
    try {
      const notes = JSON.parse(cleanText);
      return notes;
    } catch (parseErr) {
      console.error("Failed to parse notes JSON:", cleanText.substring(0, 200));
      // Return fallback structure
      return {
        contentTitle: videoInfo.title,
        bulletPoints: [
          `Video: ${videoInfo.title}`,
          `Channel: ${videoInfo.channelTitle}`,
          "AI-generated notes are available for this content."
        ]
      };
    }

  } catch (err) {
    console.error("generateNotes error:", err);
    return {
      contentTitle: videoInfo.title,
      bulletPoints: [
        `Video: ${videoInfo.title}`,
        "Notes generation failed. Please try again."
      ]
    };
  }
}

// Generate personalized learning recommendations from weak topics using Gemini AI
async function generateRecommendations(weakTopics, videoInfo) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build context string based on whether videoInfo is available
    const contextInfo = videoInfo 
      ? `Video context: ${videoInfo.title}\nTranscript excerpt: ${videoInfo.transcript?.substring(0, 1000) || 'No transcript available'}`
      : 'General learning context';

    const prompt = `
You are an educational AI assistant. Based on the following topics where the user struggled: ${weakTopics.join(", ")}.

${contextInfo}

Generate personalized learning recommendations in VALID JSON format. Return ONLY the JSON, no markdown formatting:

{
  "weakAreas": [
    {
      "topic": "Topic name",
      "explanation": "Brief explanation of why this topic is important",
      "recommendations": [
        {
          "type": "video",
          "title": "Recommended video title",
          "description": "Brief description",
          "searchQuery": "search query for YouTube"
        },
        {
          "type": "documentation",
          "title": "W3Schools Documentation",
          "description": "Learn from W3Schools tutorials and examples",
          "w3schoolsPath": "path after w3schools.com/ (e.g., 'python/', 'js/', 'html/', 'css/', 'sql/', 'react/')"
        }
      ],
      "practiceExercises": ["Exercise 1", "Exercise 2", "Exercise 3"]
    }
  ]
}

IMPORTANT: For documentation recommendations:
- Use type: "documentation"
- Provide the correct W3Schools path based on the topic
- Common paths: python/, js/, html/, css/, sql/, react/, nodejs/, php/, java/, cpp/, etc.
- If topic is not on W3Schools, use the closest related path

Generate one weakArea object for each topic in the list. Make sure the JSON is valid and parseable.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    
    // Clean the response - remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```\n?/g, '');
    }
    cleanText = cleanText.trim();
    
    console.log('🤖 AI Response (cleaned):', cleanText.substring(0, 200) + '...');
    
    const parsed = JSON.parse(cleanText);
    
    // Validate the structure
    if (!parsed.weakAreas || !Array.isArray(parsed.weakAreas)) {
      throw new Error('Invalid response structure: missing weakAreas array');
    }
    
    return parsed;

  } catch (err) {
    console.error("❌ generateRecommendations error:", err.message);
    console.error("Full error:", err);
    
    // Return a fallback structure instead of empty object
    return {
      weakAreas: weakTopics.map(topic => {
        // Map topic to W3Schools path
        const topicLower = topic.toLowerCase();
        let w3path = 'default.asp';
        
        if (topicLower.includes('python')) w3path = 'python/';
        else if (topicLower.includes('javascript') || topicLower.includes('js')) w3path = 'js/';
        else if (topicLower.includes('html')) w3path = 'html/';
        else if (topicLower.includes('css')) w3path = 'css/';
        else if (topicLower.includes('sql')) w3path = 'sql/';
        else if (topicLower.includes('react')) w3path = 'react/';
        else if (topicLower.includes('node')) w3path = 'nodejs/';
        else if (topicLower.includes('php')) w3path = 'php/';
        else if (topicLower.includes('java')) w3path = 'java/';
        else if (topicLower.includes('c++') || topicLower.includes('cpp')) w3path = 'cpp/';
        else if (topicLower.includes('bootstrap')) w3path = 'bootstrap/';
        else if (topicLower.includes('jquery')) w3path = 'jquery/';
        else if (topicLower.includes('xml')) w3path = 'xml/';
        else if (topicLower.includes('json')) w3path = 'js/js_json_intro.asp';
        
        return {
          topic: topic,
          explanation: `You need to improve your understanding of ${topic}`,
          recommendations: [
            {
              type: "video",
              title: `${topic} - Complete Tutorial`,
              description: `Learn ${topic} from basics to advanced`,
              searchQuery: `${topic} tutorial`
            },
            {
              type: "documentation",
              title: `${topic} - W3Schools Tutorial`,
              description: `Learn ${topic} with W3Schools interactive tutorials and examples`,
              w3schoolsPath: w3path
            }
          ],
          practiceExercises: [
            `Practice basic ${topic} concepts`,
            `Work on ${topic} exercises`,
            `Build a small project using ${topic}`
          ]
        };
      })
    };
  }
}

// Routes

// User registration
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, username, fullName } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username and password are required.' });
    }

    // Check if email or username already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: "Email already registered" });
      }
      if (existingUser.username === username) {
        return res.status(400).json({ error: "Username already taken" });
      }
    }

    const newUser = new User({ email, username, password, fullName });
    await newUser.save();

    const token = generateToken(newUser);
    res.json({ 
      success: true, 
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName
      }
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// User login
app.post('/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;

    console.log('🔐 Login attempt:', { username, email, loginIdentifier, hasPassword: !!password });

    if (!loginIdentifier || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({ error: "Username/Email and password required" });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    });
    
    console.log('👤 User found:', user ? `Yes (${user.username})` : 'No');
    
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    console.log('🔑 Comparing password...');
    const isMatch = await user.comparePassword(password);
    console.log('🔑 Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ error: "Invalid login credentials" });
    }

    const token = generateToken(user);
    console.log('✅ Login successful for:', user.username);
    
    res.json({ 
      success: true, 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Verify token (support both GET and POST)
app.get('/auth/verify', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ 
      success: true, 
      verified: true, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

app.post('/auth/verify', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    res.json({ 
      success: true, 
      verified: true, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ success: false, error: "Verification failed" });
  }
});

// Get user profile
app.get('/auth/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Generate quiz for a video (supports both /generate-quiz and /generateQuiz)
app.post('/generate-quiz', authMiddleware, async (req, res) => {
  try {
    const { videoUrl, videoId: providedVideoId, numQuestions = 15, num_questions, difficulty = 'medium' } = req.body;
    const questionCount = num_questions || numQuestions;
    
    let videoId = providedVideoId;
    
    // If videoUrl is provided, extract videoId from it
    if (videoUrl) {
      videoId = extractVideoId(videoUrl);
    }
    
    if (!videoId) return res.status(400).json({ error: "Video ID or URL is required" });

    console.log('🎬 Generating quiz for video:', videoId);

    const videoInfo = await getVideoInfo(videoId);
    if (!videoInfo) return res.status(404).json({ error: "Video not found or no transcript" });

    // Log cache status
    if (videoInfo.fromCache) {
      console.log('⚡ Using cached transcript - faster processing!');
    }

    if (!isEducationalContent(videoInfo)) {
      return res.status(400).json({ 
        status: 'error',
        error: "Video does not appear to be educational",
        message: "This content is not suitable for quiz generation"
      });
    }

    // PARALLEL PROCESSING: Generate quiz and notes simultaneously
    console.log('⚡ Starting parallel processing: Quiz + Notes');
    const startTime = Date.now();
    
    const [quiz, notes] = await Promise.all([
      generateQuiz(videoInfo, questionCount, difficulty),
      generateNotes(videoInfo).catch(err => {
        console.error('⚠️ Notes generation failed:', err.message);
        return null; // Don't fail if notes fail
      })
    ]);
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⚡ Parallel processing completed in ${totalTime}s`);

    if (!quiz || quiz.length === 0) {
      return res.status(500).json({ error: "Failed to generate quiz questions" });
    }

    console.log('✅ Quiz generated:', quiz.length, 'questions');
    
    // Save learning notes if generated successfully (update if exists, create if new)
    if (notes && notes.bulletPoints) {
      try {
        // Check if notes already exist for this user and video
        const existingNote = await Notes.findOne({ 
          userId: req.user._id, 
          videoId: videoId 
        });

        if (existingNote) {
          // Update existing notes
          existingNote.videoTitle = videoInfo.title;
          existingNote.videoUrl = videoUrl || `https://www.youtube.com/watch?v=${videoId}`;
          existingNote.channelTitle = videoInfo.channelTitle;
          existingNote.contentTitle = notes.contentTitle;
          existingNote.bulletPoints = notes.bulletPoints;
          existingNote.createdAt = new Date();
          await existingNote.save();
          console.log('✅ Learning notes updated successfully');
        } else {
          // Create new notes
          const noteDoc = new Notes({
            userId: req.user._id,
            videoId: videoId,
            videoTitle: videoInfo.title,
            videoUrl: videoUrl || `https://www.youtube.com/watch?v=${videoId}`,
            channelTitle: videoInfo.channelTitle,
            contentTitle: notes.contentTitle,
            bulletPoints: notes.bulletPoints,
            createdAt: new Date()
          });
          
          await noteDoc.save();
          console.log('✅ Learning notes created successfully');
        }
      } catch (saveError) {
        console.error('⚠️ Failed to save notes:', saveError.message);
        // Don't throw error - notes failure shouldn't break quiz generation
      }
    }

    res.json({ 
      status: 'success',
      success: true, 
      quiz: {
        title: videoInfo.title,
        difficulty: difficulty,
        questions: quiz
      },
      videoInfo 
    });

  } catch (err) {
    console.error("❌ Generate quiz error:", err);
    console.error("Error stack:", err.stack);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate quiz";
    let errorDetails = err.message;
    
    if (err.message.includes('transcript')) {
      errorMessage = "Failed to fetch video transcript";
      errorDetails = "This video may not have captions/subtitles available";
    } else if (err.message.includes('API key')) {
      errorMessage = "API configuration error";
      errorDetails = "Please check your API keys in .env file";
    } else if (err.message.includes('quota')) {
      errorMessage = "API quota exceeded";
      errorDetails = "Please try again later";
    } else if (err.message.includes('duration')) {
      errorMessage = "Video too long";
      errorDetails = err.message;
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: errorDetails,
      success: false,
      status: 'error'
    });
  }
});

// Alternative endpoint for compatibility
app.post('/generateQuiz', authMiddleware, async (req, res) => {
  // Forward to /generate-quiz
  req.url = '/generate-quiz';
  return app._router.handle(req, res);
});

// Save quiz history (when user completes a quiz)
app.post('/history', authMiddleware, async (req, res) => {
  try {
    const { videoTitle, videoUrl, videoId, quiz, questions, userAnswers, score, totalQuestions, correctAnswers } = req.body;

    console.log('💾 Saving quiz history for user:', req.user._id);
    console.log('📊 Received data:', {
      videoTitle,
      score,
      totalQuestions,
      correctAnswers,
      userAnswersCount: userAnswers?.length,
      questionsCount: (questions || quiz)?.length
    });

    // Ensure quiz object has proper structure
    const quizData = quiz || { questions: questions || [] };
    
    const history = new History({
      userId: req.user._id,
      videoTitle,
      videoUrl,
      videoId,
      quiz: quizData,
      questions: questions || quiz?.questions || [],
      userAnswers,
      score,
      totalQuestions,
      correctAnswers,
      date: new Date()
    });

    await history.save();
    console.log('✅ Quiz history saved successfully:', { 
      id: history._id,
      videoTitle, 
      score, 
      totalQuestions,
      correctAnswers 
    });
    res.status(201).json({ message: 'History saved', history });
  } catch (err) {
    console.error('❌ Save history error:', err);
    res.status(500).json({ error: 'Failed to save history' });
  }
});

// Save quiz results and generate recommendations
app.post('/quiz-results', authMiddleware, async (req, res) => {
  try {
    const { videoId, answers, score, weakTopics } = req.body;
    if (!videoId || !answers) return res.status(400).json({ error: "Video ID and answers are required" });

    // Save history update
    const historyRecord = await History.findOne({ userId: req.user._id, videoId }).sort({ date: -1 });
    if (historyRecord) {
      historyRecord.score = score;
      historyRecord.answers = answers;
      historyRecord.weakTopics = weakTopics;
      historyRecord.date = new Date();
      await historyRecord.save();
    }

    res.json({ success: true, message: "Results saved" });

  } catch (err) {
    console.error("Quiz results error:", err);
    res.status(500).json({ error: "Failed to save results" });
  }
});

// Fetch user quiz history
app.get('/history', authMiddleware, async (req, res) => {
  try {
    const historyData = await History.find({ userId: req.user._id }).sort({ date: -1 });
    res.json({ success: true, history: historyData });
  } catch (err) {
    console.error("History fetch error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Alternative endpoint for user history
app.get('/my-history', authMiddleware, async (req, res) => {
  try {
    const historyData = await History.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(historyData);
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get all notes for the authenticated user
app.get('/my-notes', authMiddleware, async (req, res) => {
  try {
    const notes = await Notes.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, notes });
  } catch (err) {
    console.error("Fetch notes error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Get notes for a specific video (authenticated user only)
app.get('/notes/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const note = await Notes.findOne({ 
      userId: req.user._id, 
      videoId: videoId 
    }).sort({ createdAt: -1 });
    res.json(note);
  } catch (err) {
    console.error("Fetch video notes error:", err);
    res.status(500).json({ error: "Failed to fetch video notes" });
  }
});

// Fetch notes for a user/video (legacy endpoint with auth check)
app.get('/notes/:userId/:videoId', authMiddleware, async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized access to notes" });
    }
    const notes = await Notes.find({ userId, videoId });
    res.json({ success: true, notes });
  } catch (err) {
    console.error("Notes fetch error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Add new note
app.post('/notes', authMiddleware, async (req, res) => {
  try {
    const { videoId, content } = req.body;
    if (!videoId || !content) {
      return res.status(400).json({ error: "Video ID and note content are required" });
    }
    const newNote = new Notes({
      userId: req.user._id,
      videoId,
      content,
      date: new Date()
    });
    await newNote.save();
    res.json({ success: true, note: newNote });
  } catch (err) {
    console.error("Add note error:", err);
    res.status(500).json({ error: "Failed to save note" });
  }
});

// Delete note
app.delete('/notes/:noteId', authMiddleware, async (req, res) => {
  try {
    const { noteId } = req.params;
    const note = await Notes.findById(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    await Notes.deleteOne({_id: noteId});
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// Generate learning notes for a video
app.post('/generate-notes', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) return res.status(400).json({ error: "Video ID is required" });

    const videoInfo = await getVideoInfo(videoId);
    if (!videoInfo) return res.status(404).json({ error: "Video not found or no transcript available" });

    const notes = await generateNotes(videoInfo);
    res.json({ success: true, notes });
  } catch (err) {
    console.error("Generate notes error:", err);
    res.status(500).json({ error: "Failed to generate notes" });
  }
});

// Recommendations POST endpoint
app.post("/recommendations", authMiddleware, async (req, res) => {
  try {
    const { weakTopics, videoId } = req.body;
    
    console.log('📊 Recommendations request:', { 
      userId: req.user._id, 
      weakTopics, 
      videoId,
      topicsCount: weakTopics?.length 
    });
    
    if (!weakTopics || !Array.isArray(weakTopics) || weakTopics.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Weak topics array is required" 
      });
    }
    
    // VideoId is optional - if not provided, use general context
    let videoInfo = null;
    if (videoId) {
      try {
        videoInfo = await getVideoInfo(videoId);
        console.log('📹 Video info fetched for recommendations');
      } catch (err) {
        console.warn('⚠️ Could not fetch video info, using general context:', err.message);
      }
    }

    console.log('🤖 Generating AI recommendations for topics:', weakTopics);
    const recommendations = await generateRecommendations(weakTopics, videoInfo);
    
    // generateRecommendations now always returns a valid structure (with fallback)
    if (!recommendations || !recommendations.weakAreas || recommendations.weakAreas.length === 0) {
      console.error('❌ No recommendations generated, this should not happen');
      // Create emergency fallback
      return res.json({ 
        success: true, 
        recommendations: {
          weakAreas: weakTopics.map(topic => ({
            topic: topic,
            explanation: `Focus on improving ${topic}`,
            recommendations: [
              {
                type: "video",
                title: `${topic} Tutorial`,
                description: `Learn ${topic} concepts`,
                searchQuery: `${topic} tutorial`
              }
            ],
            practiceExercises: [`Practice ${topic}`]
          }))
        }
      });
    }
    
    console.log('✅ Recommendations generated:', recommendations.weakAreas.length, 'topics');
    res.json({ success: true, recommendations });
  } catch (error) {
    console.error("❌ Generate recommendations error:", error);
    console.error("Error stack:", error.stack);
    
    // Return a user-friendly error response
    res.status(500).json({ 
      success: false,
      error: "Failed to generate recommendations", 
      details: error.message,
      // Provide fallback recommendations even on error
      recommendations: {
        weakAreas: []
      }
    });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
