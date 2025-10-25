import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FiUser, FiMail, FiLock, FiBook } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="max-w-4xl mx-auto p-6">
      <Toaster position="top-right" />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Generate Quiz from YouTube Video
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter a YouTube URL to generate an AI-powered quiz with customizable difficulty and question count
        </p>
      </div>

      <Card>
        <form onSubmit={handleGenerate} className="space-y-6">
          <Input
            label="YouTube URL"
            type="text"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            error={error}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Number of Questions"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              options={[
                { value: 5, label: '5 Questions' },
                { value: 10, label: '10 Questions' },
                { value: 15, label: '15 Questions' },
                { value: 20, label: '20 Questions' },
                { value: 25, label: '25 Questions' },
              ]}
            />

            <Select
              label="Difficulty Level"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={[
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full"
          >
            {loading ? 'Generating Quiz...' : 'Generate Quiz'}
          </Button>
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
