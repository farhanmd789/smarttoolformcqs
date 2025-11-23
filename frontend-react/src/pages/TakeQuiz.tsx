import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Quiz, UserAnswer } from '../types';
import { saveHistory } from '../services/api';
import toast, { Toaster } from 'react-hot-toast';

export const TakeQuiz: React.FC = () => {
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState<{ quiz: Quiz; videoId: string; videoUrl: string } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('currentQuiz');
    if (stored) {
      setQuizData(JSON.parse(stored));
    } else {
      toast.error('No quiz found. Please generate a quiz first.');
      navigate('/');
    }
  }, [navigate]);

  if (!quizData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  const { quiz, videoId, videoUrl } = quizData;
  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleNext = () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer');
      return;
    }

    // Find the index of the selected option and convert to letter (0->A, 1->B, etc.)
    const selectedOptionIndex = question.options.findIndex(opt => opt === selectedAnswer);
    const answerLetter = String.fromCharCode(65 + selectedOptionIndex);
    const isCorrect = answerLetter === question.correct_answer;

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
    const correctAnswers = answers.filter(a => a.isCorrect).length;
    const score = (correctAnswers / quiz.questions.length) * 100;

    const result = {
      quiz,
      userAnswers: answers,
      score,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      videoId,
      videoTitle: quiz.title,
      completedAt: new Date(),
    };

    // Save to localStorage for results page
    localStorage.setItem('quizResult', JSON.stringify(result));

    // Save to backend
    try {
      await saveHistory({
        userId: 'demo_user', // Replace with actual user ID from auth
        videoTitle: quiz.title,
        videoUrl: videoUrl,
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
      toast.error('Quiz completed but failed to save history');
    }

    navigate('/results');
  };

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
};
