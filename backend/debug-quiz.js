const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function debugQuizGeneration() {
  try {
    console.log('🔍 Debugging quiz generation...');

    // First get video info
    const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails',
        id: 'dQw4w9WgXcQ',
        key: process.env.YOUTUBE_API_KEY
      }
    });

    const video = videoResponse.data.items[0];
    console.log('📹 Video title:', video.snippet.title);
    console.log('📝 Description length:', video.snippet.description.length);

    // Now test Gemini directly
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
    Generate 2 multiple-choice questions ONLY from the transcript below.
    Difficulty Level: EASY

    - Focus on basic concepts and definitions
    - Use straightforward language
    - Ask recall and recognition questions
    - Provide clear, obvious incorrect options

    IMPORTANT: Each question must have EXACTLY 4 options labeled A), B), C), D). No more, no less.

    Transcript:
    ${video.snippet.title}. ${video.snippet.description.substring(0, 500)}

    Format as JSON:
    {
      "questions": [
        {
          "question": "What is the main topic?",
          "options": ["A) Topic 1", "B) Topic 2", "C) Topic 3", "D) Topic 4"],
          "correct_answer": "A",
          "explanation": "Reason"
        }
      ]
    }
    `;

    console.log('🤖 Calling Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('📄 Raw Gemini response:');
    console.log(text.substring(0, 500) + '...');

    // Try to parse JSON
    let cleanText = text.replace(/```json\n?|```\n?/g, '').trim();
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    }

    console.log('🧹 Cleaned text for parsing:');
    console.log(cleanText.substring(0, 300) + '...');

    try {
      const quiz = JSON.parse(cleanText);
      console.log('✅ JSON parsed successfully');
      console.log('Questions count:', quiz.questions?.length || 0);
    } catch (parseError) {
      console.log('❌ JSON parse failed:', parseError.message);
    }

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugQuizGeneration();