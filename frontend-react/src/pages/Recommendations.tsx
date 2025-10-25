import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getUserHistory, getRecommendations } from '../services/api';
import { HistoryItem } from '../types';
import { FiYoutube, FiBook, FiExternalLink, FiTrendingUp, FiAlertCircle, FiTarget, FiRefreshCw } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

interface WeakTopic {
  topic: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  videoTitle?: string;
  videoUrl?: string;
  quizId?: string;
  videoId?: string;
}

interface AIRecommendation {
  topic: string;
  explanation: string;
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    searchQuery?: string;
    w3schoolsPath?: string;
  }>;
  practiceExercises: string[];
}

export const Recommendations: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchHistoryAndAnalyze();
  }, []);

  const fetchHistoryAndAnalyze = async () => {
    setLoading(true);
    try {
      const data = await getUserHistory();
      console.log('📊 Fetched history:', data);
      setHistory(data);
      
      if (data.length > 0) {
        const weak = analyzeWeakTopics(data);
        setWeakTopics(weak);
        
        // Automatically fetch AI recommendations if there are weak topics
        if (weak.length > 0) {
          fetchAIRecommendations(weak);
        }
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

  const analyzeWeakTopics = (historyData: HistoryItem[]): WeakTopic[] => {
    const weakTopics: WeakTopic[] = [];
    const processedQuizzes = new Set<string>();

    // Process each quiz attempt separately
    historyData.forEach((item) => {
      const quizId = item._id || item.videoId || `${item.videoTitle}-${item.createdAt}`;
      
      // Skip custom quizzes (don't generate recommendations for them)
      if (item.videoId?.startsWith('custom-quiz') || item.videoUrl === 'custom-quiz') {
        console.log('⏭️ Skipping custom quiz:', item.videoTitle);
        return;
      }
      
      // Skip if we already processed this quiz
      if (processedQuizzes.has(quizId)) {
        return;
      }
      
      const questions = item.quiz?.questions || item.questions || [];
      if (questions.length === 0) {
        console.warn('⚠️ Quiz item missing questions:', item);
        return;
      }

      // Track both correct and incorrect answers by topic for this quiz
      const answersByTopic: { [key: string]: { correct: number; incorrect: number; total: number } } = {};
      
      questions.forEach((question, idx) => {
        const userAnswer = item.userAnswers?.find(ua => ua.questionIndex === idx);
        const isCorrect = userAnswer?.isCorrect || false;
        const topic = question.topic || item.videoTitle || 'General Topics';
        
        // Initialize topic if not exists
        if (!answersByTopic[topic]) {
          answersByTopic[topic] = { correct: 0, incorrect: 0, total: 0 };
        }
        
        // Count answers
        answersByTopic[topic].total++;
        if (isCorrect) {
          answersByTopic[topic].correct++;
        } else {
          answersByTopic[topic].incorrect++;
        }
      });

      // Sort topics by number of incorrect answers and take only top 1
      const topIncorrectTopics = Object.entries(answersByTopic)
        .filter(([_, stats]) => stats.incorrect > 0) // Only topics with incorrect answers
        .sort((a, b) => b[1].incorrect - a[1].incorrect) // Sort by incorrect count descending
        .slice(0, 1); // Take only top 1 topic per quiz
      
      // Add to recommendations with videoId for AI context
      topIncorrectTopics.forEach(([topic, stats]) => {
        weakTopics.push({
          topic,
          score: Math.round((stats.correct / stats.total) * 100),
          totalQuestions: stats.total,
          correctAnswers: stats.correct,
          videoTitle: item.videoTitle,
          videoUrl: item.videoUrl,
          quizId: quizId,
          videoId: item.videoId // Add videoId for AI recommendations
        });
      });
      
      processedQuizzes.add(quizId);
    });

    console.log('🎯 Recommendations (1 per quiz, most incorrect topic only):', weakTopics);
    return weakTopics;
  };

  const fetchAIRecommendations = async (weak: WeakTopic[]) => {
    setLoadingAI(true);
    try {
      const topicNames = weak.map(w => w.topic);
      // Get the first videoId from weak topics for context (if available)
      const videoId = weak.find(w => w.videoId && !w.videoId.startsWith('custom-quiz'))?.videoId;
      console.log('🤖 Fetching AI recommendations for:', topicNames, 'with videoId:', videoId);
      
      const response = await getRecommendations(topicNames, videoId);
      
      if (response.success && response.recommendations?.weakAreas && response.recommendations.weakAreas.length > 0) {
        setAiRecommendations(response.recommendations.weakAreas);
        console.log('✅ AI recommendations loaded:', response.recommendations.weakAreas.length);
        // Only show success toast if we got AI recommendations
        toast.success(`Generated ${response.recommendations.weakAreas.length} AI-powered recommendations!`);
      } else {
        console.warn('⚠️ No AI recommendations available, using basic recommendations');
        // Don't show error toast, just use basic recommendations silently
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch AI recommendations:', error);
      // Show error toast
      toast.error('Could not generate AI recommendations. Showing basic recommendations.', {
        duration: 3000
      });
    } finally {
      setLoadingAI(false);
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
          AI-powered recommendations based on your quiz performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              {aiRecommendations.length > 0 ? aiRecommendations.length : weakTopics.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Recommendations</div>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              {weakTopics.reduce((sum, t) => sum + t.totalQuestions, 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Questions Analyzed</div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      {weakTopics.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FiTarget className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Excellent Performance! 🎉
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You're scoring above 60% on all topics. Keep up the great work!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {loadingAI ? (
            <Card>
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating AI-powered recommendations...</p>
              </div>
            </Card>
          ) : aiRecommendations.length > 0 ? (
            // AI-Generated Recommendations
            aiRecommendations.map((rec, idx) => (
              <Card key={idx} className="border-l-4 border-orange-500">
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <FiAlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {rec.topic}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {rec.explanation}
                      </p>
                    </div>
                  </div>

                  {/* AI Recommendations Grid */}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      📚 Recommended Resources
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rec.recommendations.map((resource, rIdx) => {
                        // Generate appropriate URL based on type
                        let url = '#';
                        if (resource.type === 'video' && resource.searchQuery) {
                          url = `https://www.youtube.com/results?search_query=${encodeURIComponent(resource.searchQuery)}`;
                        } else if (resource.type === 'documentation' && resource.w3schoolsPath) {
                          url = `https://www.w3schools.com/${resource.w3schoolsPath}`;
                        } else if (resource.searchQuery) {
                          url = `https://www.google.com/search?q=${encodeURIComponent(resource.searchQuery)}`;
                        }
                        
                        return (
                          <a
                            key={rIdx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all hover:shadow-md border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg flex-shrink-0 ${
                                resource.type === 'video'
                                  ? 'bg-red-100 dark:bg-red-900/20'
                                  : resource.type === 'documentation'
                                  ? 'bg-green-100 dark:bg-green-900/20'
                                  : resource.type === 'article'
                                  ? 'bg-blue-100 dark:bg-blue-900/20'
                                : 'bg-green-100 dark:bg-green-900/20'
                            }`}>
                              {resource.type === 'video' ? (
                                <FiYoutube className="w-5 h-5 text-red-600 dark:text-red-400" />
                              ) : resource.type === 'documentation' ? (
                                <FiBook className="w-5 h-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <FiBook className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                                {resource.title}
                              </h5>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                {resource.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="capitalize">{resource.type}</span>
                                <FiExternalLink className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        </a>
                        );
                      })}
                    </div>
                  </div>

                  {/* Practice Exercises */}
                  {rec.practiceExercises && rec.practiceExercises.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <FiTarget className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Practice Exercises
                      </h4>
                      <ul className="space-y-2">
                        {rec.practiceExercises.map((exercise, eIdx) => (
                          <li key={eIdx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-blue-600 dark:text-blue-400 font-bold mt-1">•</span>
                            <span>{exercise}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            // Basic Recommendations (Fallback)
            weakTopics.map((rec, idx) => (
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
                          Score: {rec.score}% • {rec.correctAnswers}/{rec.totalQuestions} correct
                        </p>
                        {rec.videoTitle && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            From quiz: {rec.videoTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      rec.score < 40 
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                        : 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300'
                    }`}>
                      {rec.score < 40 ? 'Critical' : 'Needs Work'}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        rec.score < 40 ? 'bg-red-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${rec.score}%` }}
                    ></div>
                  </div>

                  {/* Learning Resources */}
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    📚 Learning Resources
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
                            {rec.topic} - Tutorial
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
                      href={`https://www.google.com/search?q=${encodeURIComponent(rec.topic)}+documentation`}
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
                            {rec.topic} - Documentation
                          </h5>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Articles</span>
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
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <FiTarget className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {rec.topic} - Practice
                          </h5>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Exercises</span>
                            <FiExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </a>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Button variant="primary" onClick={() => window.location.href = '/quiz'}>
          Take Another Quiz
        </Button>
        <Button 
          variant="outline" 
          onClick={fetchHistoryAndAnalyze}
          className="flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh Recommendations
        </Button>
      </div>
    </div>
  );
};
