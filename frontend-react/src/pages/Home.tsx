import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { FiPlay, FiBook, FiClock, FiAward, FiZap, FiTarget } from 'react-icons/fi';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: FiZap,
      title: 'AI-Powered Generation',
      description: 'Generate quizzes instantly from any YouTube video using advanced AI technology',
    },
    {
      icon: FiTarget,
      title: 'Customizable Difficulty',
      description: 'Choose from Easy, Medium, or Hard difficulty levels to match your learning needs',
    },
    {
      icon: FiBook,
      title: 'Learning Notes',
      description: 'Get AI-generated study notes from videos with PDF export functionality',
    },
    {
      icon: FiClock,
      title: 'Track Progress',
      description: 'Monitor your quiz history and track your learning progress over time',
    },
    {
      icon: FiAward,
      title: 'Detailed Results',
      description: 'Review your answers with explanations and export results as PDF',
    },
    {
      icon: FiPlay,
      title: 'Up to 25 Questions',
      description: 'Generate comprehensive quizzes with 5 to 25 questions per video',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-light dark:bg-gradient-dark relative overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30 animate-pulse-slow"></div>
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Brand */}
          <div className="mb-8 flex justify-center">
            <div className="bg-gradient-primary p-4 rounded-2xl shadow-2xl gradient-shadow animate-glow">
              <FiBook className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Welcome Message */}
          {user && (
            <div className="mb-6">
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Welcome back, <span className="font-semibold gradient-text">{user.username}</span>! 👋
              </p>
            </div>
          )}

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-6 leading-tight">
            Smart Tool for MCQs
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4">
            Transform YouTube Videos into Interactive Quizzes
          </p>
          
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Powered by AI, our platform generates personalized quizzes from any educational YouTube video. 
            Test your knowledge, track your progress, and enhance your learning experience.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/quiz')}
              className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              <FiPlay className="mr-2" />
              Generate Quiz Now
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/history')}
              className="text-lg px-8 py-4"
            >
              <FiClock className="mr-2" />
              View History
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-20">
            <div className="text-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <div className="text-4xl font-bold gradient-text mb-2">25</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Max Questions</div>
            </div>
            <div className="text-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <div className="text-4xl font-bold gradient-text mb-2">3</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Difficulty Levels</div>
            </div>
            <div className="text-center bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <div className="text-4xl font-bold gradient-text mb-2">AI</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Powered</div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center gradient-text mb-12">
            Powerful Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-200/50 dark:border-gray-700/50 gradient-shadow-hover"
                >
                  <div className="bg-gradient-primary w-14 h-14 rounded-lg flex items-center justify-center mb-4 shadow-md">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-center gradient-text mb-12">
            How It Works
          </h2>
          
          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-primary text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Paste YouTube URL
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Copy and paste any educational YouTube video URL into our generator
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-secondary text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Customize Your Quiz
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select the number of questions (5-25) and difficulty level (Easy, Medium, Hard)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-success text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Take the Quiz
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Answer AI-generated questions and get instant feedback with detailed explanations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-warm text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
                4
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Review & Export
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Review your results, access learning notes, and export everything as PDF
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-3xl mx-auto mt-20 text-center bg-gradient-primary rounded-2xl p-12 shadow-2xl gradient-shadow animate-glow">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Learning?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Generate your first quiz in seconds and enhance your learning experience
          </p>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/quiz')}
            className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100"
          >
            <FiPlay className="mr-2" />
            Get Started Free
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            Powered by Google Gemini AI | Transform any YouTube video into an interactive learning experience
          </p>
        </div>
      </div>
    </div>
  );
};
