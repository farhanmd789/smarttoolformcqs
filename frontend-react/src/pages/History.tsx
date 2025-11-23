import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getUserHistory } from '../services/api';
import { HistoryItem, QuizResult } from '../types';
import { FiClock, FiTrendingUp, FiAward, FiCalendar, FiDownload, FiBook, FiYoutube, FiExternalLink } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import { exportQuizResultAsPDF } from '../utils/pdfExport';

interface WeakTopic {
  topic: string;
  score: number;
}

export const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getUserHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (history.length === 0) return { avgScore: 0, totalQuizzes: 0, totalQuestions: 0 };

    const totalScore = history.reduce((sum, item) => sum + item.score, 0);
    const totalQuestions = history.reduce((sum, item) => sum + item.totalQuestions, 0);

    return {
      avgScore: (totalScore / history.length).toFixed(1),
      totalQuizzes: history.length,
      totalQuestions,
    };
  };

  const stats = calculateStats();

  const handleExportPDF = (item: HistoryItem) => {
    try {
      // Convert HistoryItem to QuizResult format for PDF export
      const quizResult: QuizResult = {
        quiz: item.quiz || { title: item.videoTitle, difficulty: 'medium', questions: item.questions || [] },
        questions: item.questions, // Fallback for legacy data
        userAnswers: item.userAnswers,
        score: item.score,
        totalQuestions: item.totalQuestions,
        correctAnswers: item.correctAnswers,
        videoId: item.videoId,
        videoTitle: item.videoTitle,
        completedAt: item.createdAt || new Date()
      };

      exportQuizResultAsPDF(quizResult);
      toast.success('Opening PDF export...');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    }
  };

  const analyzeWeakTopics = (item: HistoryItem) => {
    const topicPerformance: { [key: string]: { correct: number; total: number } } = {};
    const questions = item.quiz?.questions || item.questions || [];

    questions.forEach((question, idx) => {
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

    const weak: WeakTopic[] = [];
    Object.entries(topicPerformance).forEach(([topic, performance]) => {
      const score = (performance.correct / performance.total) * 100;
      if (score < 60) {
        weak.push({ topic, score: Math.round(score) });
      }
    });

    setWeakTopics(weak);
    setShowRecommendations(true);
  };

  const getW3SchoolsPath = (topic: string): string => {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('python')) return 'python/';
    if (topicLower.includes('javascript') || topicLower.includes('js')) return 'js/';
    if (topicLower.includes('html')) return 'html/';
    if (topicLower.includes('css')) return 'css/';
    if (topicLower.includes('sql')) return 'sql/';
    if (topicLower.includes('react')) return 'react/';
    if (topicLower.includes('node')) return 'nodejs/';
    if (topicLower.includes('php')) return 'php/';
    if (topicLower.includes('java')) return 'java/';
    if (topicLower.includes('c++') || topicLower.includes('cpp')) return 'cpp/';
    if (topicLower.includes('bootstrap')) return 'bootstrap/';
    if (topicLower.includes('jquery')) return 'jquery/';
    return 'default.asp';
  };

  useEffect(() => {
    if (selectedItem) {
      analyzeWeakTopics(selectedItem);
    } else {
      setShowRecommendations(false);
      setWeakTopics([]);
    }
  }, [selectedItem]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Toaster position="top-right" />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Quiz History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your progress and review past quiz attempts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card hover>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FiAward className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.avgScore}%
              </p>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <FiTrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalQuizzes}
              </p>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <FiClock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalQuestions}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {history.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FiClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Quiz History
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete a quiz to see your history here
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/quiz'}>
              Take a Quiz
            </Button>
          </div>
        </Card>
      ) : (
        /* History View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* History List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Recent Attempts ({history.length})
            </h2>
            {history.map((item) => {
              const percentage = item.score.toFixed(1);
              const passed = parseFloat(percentage) >= 60;

              return (
                <Card
                  key={item._id}
                  hover
                  className={`cursor-pointer transition-all ${
                    selectedItem?._id === item._id
                      ? 'ring-2 ring-blue-500 border-blue-500'
                      : ''
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                    {item.videoTitle}
                  </h3>

                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      passed
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                    }`}>
                      {percentage}%
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.correctAnswers}/{item.totalQuestions}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                    <FiCalendar className="mr-1" />
                    {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* History Detail */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <Card>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedItem.videoTitle}
                  </h2>

                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    {selectedItem.quiz?.difficulty && (
                      <>
                        <span className="capitalize">
                          Difficulty: {selectedItem.quiz.difficulty}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>
                      {new Date(selectedItem.createdAt || Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Score Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedItem.score.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Score</p>
                  </div>

                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {selectedItem.correctAnswers}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Correct</p>
                  </div>

                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {selectedItem.totalQuestions - selectedItem.correctAnswers}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Incorrect</p>
                  </div>
                </div>

                {/* Export PDF Button */}
                <div className="mb-6">
                  <Button
                    variant="primary"
                    onClick={() => handleExportPDF(selectedItem)}
                    className="w-full sm:w-auto"
                  >
                    <FiDownload className="mr-2" />
                    Export as PDF
                  </Button>
                </div>

                {/* Questions Review */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Questions Review
                  </h3>

                  <div className="space-y-4">
                    {(selectedItem.quiz?.questions || selectedItem.questions || []).map((question, idx) => {
                      const userAnswer = selectedItem.userAnswers.find(ua => ua.questionIndex === idx);
                      const isCorrect = userAnswer?.isCorrect || false;

                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border-l-4 ${
                            isCorrect
                              ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                              : 'bg-red-50 dark:bg-red-900/10 border-red-500'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}>
                              {idx + 1}
                            </span>

                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                                {question.question}
                              </p>

                              <div className="text-sm">
                                <p className="text-gray-700 dark:text-gray-300">
                                  <strong>Your answer:</strong> {userAnswer?.selectedAnswer}
                                  {!isCorrect && (
                                    <span className="ml-2 text-red-600 dark:text-red-400">
                                      (Incorrect)
                                    </span>
                                  )}
                                </p>
                                {!isCorrect && question.correct_answer && (
                                  <p className="text-green-600 dark:text-green-400 mt-1">
                                    <strong>Correct answer:</strong> {question.correct_answer}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommendations Section */}
                {showRecommendations && weakTopics.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      📚 Recommended Resources to Improve
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Based on your performance, here are some topics you should review:
                    </p>

                    <div className="space-y-6">
                      {weakTopics.map((weakTopic, idx) => (
                        <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                              {weakTopic.topic}
                            </h4>
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                              Score: {weakTopic.score}%
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* YouTube Tutorial */}
                            <a
                              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(weakTopic.topic + ' tutorial')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                  <FiYoutube className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    {weakTopic.topic} - Video Tutorial
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>YouTube</span>
                                    <FiExternalLink className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            </a>

                            {/* W3Schools Documentation */}
                            <a
                              href={`https://www.w3schools.com/${getW3SchoolsPath(weakTopic.topic)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                  <FiBook className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    {weakTopic.topic} - W3Schools Tutorial
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Interactive Learning</span>
                                    <FiExternalLink className="w-3 h-3" />
                                  </div>
                                </div>
                              </div>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showRecommendations && weakTopics.length === 0 && (
                  <div className="mt-8 bg-green-50 dark:bg-green-900/10 rounded-lg p-6 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <FiAward className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          Great Job! 🎉
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          You scored well on all topics! Keep up the excellent work.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <FiClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a quiz attempt to view details
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
