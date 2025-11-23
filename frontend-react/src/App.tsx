import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { QuizPage } from './pages/QuizPage';
import { Notes } from './pages/Notes';
import { History } from './pages/History';
import { Recommendations } from './pages/Recommendations';

function App() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gradient-light dark:bg-gradient-dark relative">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 pointer-events-none"></div>
      
      {/* Show header only when not on home page or auth pages */}
      {!isHomePage && !isAuthPage && <Header />}
      
      <main className="w-full relative z-10">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/quiz" element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          } />
          <Route path="/notes" element={
            <ProtectedRoute>
              <Notes />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          <Route path="/recommendations" element={
            <ProtectedRoute>
              <Recommendations />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
