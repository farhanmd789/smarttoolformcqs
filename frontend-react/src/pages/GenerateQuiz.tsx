import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { FiYoutube, FiLoader } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import { generateQuiz } from '../services/quizService';

// Helper function to extract YouTube video ID from URL
const extractVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const GenerateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<string>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      toast.error('Invalid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const response = await generateQuiz(videoId, numQuestions, difficulty);
      
      if (response.status === 'success') {
        toast.success('Quiz generated successfully!');
        // Store quiz data and navigate to quiz page
        localStorage.setItem('currentQuiz', JSON.stringify({
          quiz: response.quiz,
          videoId,
          videoUrl: youtubeUrl,
        }));
        navigate('/take-quiz');
      } else {
        throw new Error(response.message || 'Failed to generate quiz');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate quiz';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <Toaster position="top-right" />
      
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
          Generate Quiz from YouTube Video
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Enter a YouTube URL to generate an AI-powered quiz with customizable difficulty and question count
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <form onSubmit={handleGenerate} className="space-y-6 p-6">
          <div>
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              YouTube URL
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiYoutube className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="youtube-url"
                className="focus:ring-2 focus:ring-purple-500 focus:border-purple-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2.5"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                required
              />
            </div>
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="num-questions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Number of Questions
              </label>
              <select
                id="num-questions"
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={25}>25 Questions</option>
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty Level
              </label>
              <select
                id="difficulty"
                className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Generating...
                </>
              ) : (
                'Generate Quiz'
              )}
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This may take a moment as we analyze the video content and generate your quiz.
            </p>
          </div>
        </form>
      </Card>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card hover>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              25
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Max Questions
            </div>
          </div>
        </Card>
        
        <Card hover>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              3
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Difficulty Levels
            </div>
          </div>
        </Card>
        
        <Card hover>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              AI
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Powered by Gemini
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
