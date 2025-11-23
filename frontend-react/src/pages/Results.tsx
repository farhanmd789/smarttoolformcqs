import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getUserHistory } from '../services/api';
import { HistoryItem } from '../types';
import { FiYoutube, FiBook, FiExternalLink, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

interface WeakTopic {
  topic: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

export const Recommendations: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryAndAnalyze();
  }, []);

  const fetchHistoryAndAnalyze = async () => {
    setLoading(true);
    try {
      const data = await getUserHistory(); // Now uses authenticated endpoint
      console.log('📊 Fetched history:', data);
      setHistory(data);
      
      if (data.length > 0) {
        analyzeWeakTopics(data);
      } else {
        console.log('No quiz history found');
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const analyzeWeakTopics = (historyData: HistoryItem[]) => {
    const topicPerformance: { [key: string]: { correct: number; total: number } } = {};

    historyData.forEach((item) => {
      // If no quiz or questions, skip
      if (!item.quiz || !item.quiz.questions) {
        console.warn('Quiz item missing questions:', item);
        return;
      }

      item.quiz.questions.forEach((question, idx) => {
        // Use video title as topic if no specific topic is provided
        const topic = question.topic || item.videoTitle || 'General Topics';
        const userAnswer = item.userAnswers.find(ua => ua.questionIndex === idx);
        const isCorrect = userAnswer?.isCorrect || false;

        if (!topicPerformance[topic]) {
          topicPerformance[topic] = { correct: 0, total: 0 };
        }

        topicPerformance[topic].total += 1;
        if (isCorrect) {
          topicPerformance[topic].correct += 1;
        }
      });
    });

    console.log('Topic Performance Analysis:', topicPerformance);

    const weak: WeakTopic[] = [];
    Object.entries(topicPerformance).forEach(([topic, performance]) => {
      const score = (performance.correct / performance.total) * 100;
      if (score < 60) {
        weak.push({
          topic,
          score: Math.round(score),
          totalQuestions: performance.total,
          correctAnswers: performance.correct,
        });
      }
    });

    console.log('Weak Topics Found:', weak);
    setWeakTopics(weak.sort((a, b) => a.score - b.score));
    
    if (weak.length > 0) {
      toast.success(`Found ${weak.length} topic(s) that need improvement`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing your performance...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Toaster position="top-right" />
        <Card>
          <div className="text-center py-12">
            <FiTrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Quiz History Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete some quizzes to get personalized learning recommendations
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/quiz'}>
              Take a Quiz
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Personalized Learning Recommendations
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Based on your quiz performance, here are topics you should focus on
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {history.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Quizzes Completed</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
              {weakTopics.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Topics to Improve</div>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {weakTopics.length * 4}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Learning Resources</div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      {weakTopics.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FiTrendingUp className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Great Job! 🎉
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You're performing well across all topics. Keep up the good work!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {weakTopics.map((rec, idx) => (
            <Card key={idx} className="border-l-4 border-orange-500">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <FiAlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {rec.topic}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Current Score: {rec.score}% ({rec.totalQuestions} questions attempted)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      rec.score < 40 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                        : 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300'
                    }`}>
                      {rec.score < 40 ? 'Needs Focus' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className={`h-2 rounded-full ${
                      rec.score < 40 ? 'bg-red-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${rec.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Learning Resources Grid */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Recommended Learning Resources
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.topic)}+tutorial`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <FiYoutube className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {rec.topic} - Complete Tutorial
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>YouTube</span>
                          <FiExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </a>

                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(rec.topic)}+crash+course`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <FiYoutube className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {rec.topic} - Crash Course
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>YouTube</span>
                          <FiExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </a>

                  <a
                    href={(() => {
                      const topicLower = rec.topic.toLowerCase();
                      let path = 'default.asp';
                      if (topicLower.includes('python')) path = 'python/';
                      else if (topicLower.includes('javascript') || topicLower.includes('js')) path = 'js/';
                      else if (topicLower.includes('html')) path = 'html/';
                      else if (topicLower.includes('css')) path = 'css/';
                      else if (topicLower.includes('sql')) path = 'sql/';
                      else if (topicLower.includes('react')) path = 'react/';
                      else if (topicLower.includes('node')) path = 'nodejs/';
                      else if (topicLower.includes('php')) path = 'php/';
                      else if (topicLower.includes('java')) path = 'java/';
                      return `https://www.w3schools.com/${path}`;
                    })()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <FiBook className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {rec.topic} - W3Schools Tutorial
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Interactive Learning</span>
                          <FiExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </a>

                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(rec.topic)}+practice+exercises`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <FiBook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {rec.topic} - Practice Exercises
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Google Search</span>
                          <FiExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 justify-center">
        <Button variant="primary" onClick={() => window.location.href = '/quiz'}>
          Take Another Quiz
        </Button>
        <Button variant="outline" onClick={fetchHistoryAndAnalyze}>
          Refresh Recommendations
        </Button>
      </div>
    </div>
  );
};
