import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getUserNotes, deleteNote } from '../services/api';
import { Note } from '../types';
import { exportNotesAsPDF } from '../utils/pdfExport';
import { FiDownload, FiTrash2, FiBook, FiCalendar, FiRefreshCw } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

export const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await getUserNotes();
      console.log('Fetched notes:', response);
      if (response.success && Array.isArray(response.notes)) {
        setNotes(response.notes);
        if (response.notes.length > 0) {
          toast.success(`Loaded ${response.notes.length} note(s)`);
        }
      } else {
        console.error('Invalid notes data:', response);
        setNotes([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch notes:', error);
      toast.error(error.response?.data?.error || 'Failed to load notes');
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await deleteNote(noteId);
      setNotes(notes.filter(note => note._id !== noteId));
      if (selectedNote?._id === noteId) {
        setSelectedNote(null);
      }
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleExportPDF = (note: Note) => {
    exportNotesAsPDF(note);
    toast.success('Opening PDF export...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Toaster position="top-right" />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Learning Notes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-generated notes from your quiz videos with PDF export
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchNotes}
          disabled={loading}
        >
          <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {notes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No Notes Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate a quiz to automatically create learning notes
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>
              Generate Quiz
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notes List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              All Notes ({notes.length})
            </h2>
            {notes.map((note) => (
              <Card
                key={note._id}
                hover
                className={`cursor-pointer transition-all ${
                  selectedNote?._id === note._id
                    ? 'ring-2 ring-blue-500 border-blue-500'
                    : ''
                }`}
                onClick={() => setSelectedNote(note)}
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                  {note.contentTitle}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                  {note.videoTitle}
                </p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                  <FiCalendar className="mr-1" />
                  {new Date(note.createdAt || Date.now()).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>

          {/* Note Detail */}
          <div className="lg:col-span-2">
            {selectedNote ? (
              <Card>
                <div className="mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        {selectedNote.contentTitle}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedNote.videoTitle}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Channel: {selectedNote.channelTitle}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(selectedNote)}
                      >
                        <FiDownload className="mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(selectedNote._id!)}
                      >
                        <FiTrash2 className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Key Points
                  </h3>
                  <ul className="space-y-3">
                    {selectedNote.bulletPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500"
                      >
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-gray-800 dark:text-gray-200 flex-1">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Created on {new Date(selectedNote.createdAt || Date.now()).toLocaleString()}
                  </p>
                </div>
              </Card>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <FiBook className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Select a note to view details
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
