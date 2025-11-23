import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { generateQuiz, extractVideoId, saveHistory } from '../services/api';
import { Quiz, UserAnswer, QuizResult } from '../types';
import { exportQuizResultAsPDF } from '../utils/pdfExport';
import { FiDownload, FiHome, FiCheckCircle, FiXCircle, FiBook } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

type ViewState = 'generate' | 'taking' | 'results';

export const QuizPage: React.FC = () => {
  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [numQuestions, setNumQuestions] = useState(15);
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quiz state
  const [viewState, setViewState] = useState<ViewState>('generate');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [videoId, setVideoId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const extractedVideoId = extractVideoId(youtubeUrl);
    if (!extractedVideoId) {
      setError('Please enter a valid YouTube URL');
      toast.error('Invalid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const response = await generateQuiz(extractedVideoId, numQuestions, difficulty);
      
      if (response.status === 'success') {
        toast.success('Quiz generated successfully!');
        toast.success('Learning notes saved! Check Notes page.', { duration: 4000 });
        setQuiz(response.quiz);
        setVideoId(extractedVideoId);
        setViewState('taking');
        setCurrentQuestion(0);
        setUserAnswers([]);
        setSelectedAnswer('');
      } else {
        throw new Error(response.message || 'Failed to generate quiz');
      }
    } catch (err: any) {
      const errorData = err.response?.data;
      let errorMessage = err.response?.data?.message || err.message || 'Failed to generate quiz';
      
      // Check if it's a content validation error
      if (errorData?.category && !errorData?.isEducational) {
        errorMessage = `❌ ${errorMessage}\n\n${errorData.suggestion || 'Please use educational videos only.'}`;
        toast.error(errorMessage, { duration: 6000 });
      } else {
        toast.error(errorMessage);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (!selectedAnswer || !quiz) {
      toast.error('Please select an answer');
      return;
    }

    const question = quiz.questions[currentQuestion];
    // Find the index of the selected option and convert to letter (0->A, 1->B, etc.)
    const selectedOptionIndex = question.options.findIndex(opt => opt === selectedAnswer);
    const answerLetter = String.fromCharCode(65 + selectedOptionIndex); // A, B, C, D
    const isCorrect = answerLetter === question.correct_answer;

    console.log('🔍 Answer Check:', {
      questionIndex: currentQuestion,
      selectedOption: selectedAnswer,
      selectedOptionIndex,
      answerLetter,
      correctAnswer: question.correct_answer,
      isCorrect
    });

    const newAnswer: UserAnswer = {
      questionIndex: currentQuestion,
      selectedAnswer: answerLetter,
      isCorrect,
    };

    const updatedAnswers = [...userAnswers, newAnswer];
    setUserAnswers(updatedAnswers);
    setSelectedAnswer('');

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitQuiz(updatedAnswers);
    }
  };

  const handleSubmitQuiz = async (answers: UserAnswer[]) => {
    if (!quiz) return;

    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const score = (correctAnswers / quiz.questions.length) * 100;

    console.log('📊 Quiz Submission:', {
      totalQuestions: quiz.questions.length,
      correctAnswers,
      score,
      answers
    });

    const result: QuizResult = {
      quiz,
      userAnswers: answers,
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      videoId,
      videoTitle: quiz.title,
      completedAt: new Date(),
    };

    setQuizResult(result);
    setViewState('results');

    // Save to backend (userId now comes from JWT token)
    try {
      await saveHistory({
        videoTitle: quiz.title,
        videoUrl: youtubeUrl,
        videoId: videoId,
        quiz: quiz,
        questions: quiz.questions,
        userAnswers: answers,
        score: score,
        totalQuestions: quiz.questions.length,
        correctAnswers: correctAnswers,
      });
      toast.success('Quiz completed and saved!');
    } catch (error) {
      console.error('Failed to save quiz history:', error);
    }
  };

  const handleStartNew = () => {
    setViewState('generate');
    setQuiz(null);
    setQuizResult(null);
    setCurrentQuestion(0);
    setUserAnswers([]);
    setSelectedAnswer('');
    setYoutubeUrl('');
    setError('');
  };

  const handleExportPDF = () => {
    if (quizResult) {
      exportQuizResultAsPDF(quizResult);
      toast.success('Opening PDF export...');
    }
  };

  // GENERATE VIEW
  if (viewState === 'generate') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Toaster position="top-right" />
        
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent dark:text-gray-100 dark:bg-none mb-3">
            Generate Quiz from YouTube Video
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Enter a YouTube URL to generate an AI-powered quiz with customizable difficulty and question count
          </p>
        </div>

        <div className="relative">
          {/* Gradient glow effect for light mode */}
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-2xl blur opacity-20 dark:opacity-0"></div>
          
          <Card className="relative">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Questions (5-25)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={numQuestions}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for editing
                    if (value === '') {
                      setNumQuestions('' as any);
                      return;
                    }
                    // Only allow numeric input
                    if (/^\d+$/.test(value)) {
                      const numValue = parseInt(value, 10);
                      setNumQuestions(numValue);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    // If empty, set to minimum
                    if (value === '' || value === '0') {
                      setNumQuestions(5);
                      toast.error('Minimum 5 questions required');
                      return;
                    }
                    const numValue = parseInt(value, 10);
                    // Validate and clamp value when user leaves the field
                    if (numValue < 5) {
                      setNumQuestions(5);
                      toast.error('Minimum 5 questions required');
                    } else if (numValue > 25) {
                      setNumQuestions(25);
                      toast.error('Maximum 25 questions allowed');
                    }
                  }}
                  placeholder="5-25"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Type any number between 5 and 25
                </p>
              </div>

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
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 - Max Questions */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300 dark:opacity-0"></div>
            <Card hover className="relative">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 dark:bg-gradient-to-br dark:from-blue-600 dark:to-cyan-600 rounded-2xl mb-3 shadow-lg">
                  <span className="text-3xl font-bold text-white">25</span>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  Max Questions
                </div>
              </div>
            </Card>
          </div>
          
          {/* Card 2 - Difficulty Levels */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300 dark:opacity-0"></div>
            <Card hover className="relative">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 dark:bg-gradient-to-br dark:from-green-600 dark:to-emerald-600 rounded-2xl mb-3 shadow-lg">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  Difficulty Levels
                </div>
              </div>
            </Card>
          </div>
          
          {/* Card 3 - AI Powered */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300 dark:opacity-0"></div>
            <Card hover className="relative">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 dark:bg-gradient-to-br dark:from-purple-600 dark:to-pink-600 rounded-2xl mb-3 shadow-lg">
                  <span className="text-2xl font-bold text-white">AI</span>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-400">
                  Powered by Gemini
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // TAKING QUIZ VIEW
  if (viewState === 'taking' && quiz) {
    const question = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto p-6">
        <Toaster position="top-right" />

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Question {currentQuestion + 1} of {quiz.questions.length}
            </span>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Quiz Info */}
        <Card className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {quiz.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Difficulty: <span className="font-medium capitalize">{quiz.difficulty}</span>
              </p>
            </div>
          </div>
        </Card>

        {/* Question Card */}
        <Card>
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {question.question}
            </h3>
            {question.topic && (
              <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                {question.topic}
              </span>
            )}
          </div>

          <div className="space-y-3 mb-6">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswerSelect(option)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedAnswer === option
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {option}
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => currentQuestion > 0 && setCurrentQuestion(currentQuestion - 1)}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>
            
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!selectedAnswer}
            >
              {currentQuestion === quiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // RESULTS VIEW
  if (viewState === 'results' && quizResult) {
    const percentage = quizResult.score.toFixed(1);
    const passed = parseFloat(percentage) >= 60;

    return (
      <div className="max-w-6xl mx-auto p-6">
        <Toaster position="top-right" />

        {/* Score Card */}
        <Card className="mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Quiz Completed!
            </h1>
            
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 ${
              passed ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
            }`}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {percentage}%
                </div>
              </div>
            </div>

            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              You scored {quizResult.correctAnswers} out of {quizResult.totalQuestions}
            </p>
            
            <div className={`inline-block px-4 py-2 rounded-full font-semibold ${
              passed
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
            }`}>
              {passed ? '✓ PASSED' : 'NEEDS IMPROVEMENT'}
            </div>

            <div className="flex flex-wrap gap-4 justify-center mt-6">
              <Button variant="primary" onClick={handleStartNew}>
                <FiHome className="mr-2" />
                Generate New Quiz
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FiDownload className="mr-2" />
                Export as PDF
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => window.location.href = '/notes'}
              >
                <FiBook className="mr-2" />
                View Learning Notes
              </Button>
            </div>
          </div>
        </Card>

        {/* Detailed Results */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Detailed Results
        </h2>

        <div className="space-y-4">
          {quizResult.quiz.questions.map((question, idx) => {
            const userAnswer = quizResult.userAnswers.find(ua => ua.questionIndex === idx);
            const isCorrect = userAnswer?.isCorrect || false;
            
            console.log(`Question ${idx + 1}:`, {
              userAnswer: userAnswer?.selectedAnswer,
              correctAnswer: question.correct_answer,
              isCorrect
            });

            return (
              <Card key={idx} className={`border-l-4 ${
                isCorrect ? 'border-green-500' : 'border-red-500'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    isCorrect ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
                  }`}>
                    {isCorrect ? (
                      <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <FiXCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        Question {idx + 1}
                      </h3>
                      {question.topic && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                          {question.topic}
                        </span>
                      )}
                    </div>

                    <p className="text-gray-800 dark:text-gray-200 mb-3">
                      {question.question}
                    </p>

                    <div className="space-y-2">
                      {question.options.map((option, optIdx) => {
                        // Map index to letter (0->A, 1->B, 2->C, 3->D)
                        const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D
                        const isUserAnswer = userAnswer ? userAnswer.selectedAnswer === optionLetter : false;
                        const isCorrectAnswer = question.correct_answer === optionLetter;

                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-lg border ${
                              isCorrectAnswer
                                ? 'bg-green-50 dark:bg-green-900/10 border-green-500'
                                : isUserAnswer
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`${
                                isCorrectAnswer || isUserAnswer ? 'font-medium' : ''
                              }`}>
                                {option}
                              </span>
                              <div className="flex items-center gap-2">
                                {isCorrectAnswer && (
                                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isUserAnswer && isCorrect && (
                                  <span className="text-green-600 dark:text-green-400 text-sm font-medium">
                                    ✓ Your Answer
                                  </span>
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                                    ✗ Your Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
