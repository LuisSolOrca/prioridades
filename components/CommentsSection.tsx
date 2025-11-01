'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Comment {
  _id: string;
  text: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  isSystemComment: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentsSectionProps {
  priorityId: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
}

export default function CommentsSection({ priorityId }: CommentsSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Mention autocomplete states
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
  }, [priorityId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/comments?priorityId=${priorityId}`);
      if (!res.ok) throw new Error('Error cargando comentarios');
      const data = await res.json();
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users for mention autocomplete
  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionUsers([]);
      return;
    }

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const users = await res.json();
        setMentionUsers(users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  // Handle textarea change with mention detection
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNewComment(value);

    // Detect @ mention
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setMentionCursorPosition(lastAtIndex);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
        searchUsers(textAfterAt);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Handle mention selection
  const selectMention = (user: User) => {
    const beforeMention = newComment.slice(0, mentionCursorPosition);
    const afterMention = newComment.slice(mentionCursorPosition + mentionSearch.length + 1);
    const newText = `${beforeMention}@${user.name} ${afterMention}`;

    setNewComment(newText);
    setShowMentionDropdown(false);
    setMentionUsers([]);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + user.name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle keyboard navigation in mention dropdown
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown || mentionUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < mentionUsers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectMention(mentionUsers[selectedMentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityId,
          text: newComment
        })
      });

      if (!res.ok) throw new Error('Error creando comentario');

      const comment = await res.json();
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error creating comment:', error);
      alert('Error al crear el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error eliminando comentario');

      setComments(comments.filter(c => c._id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Error al eliminar el comentario');
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment._id);
    setEditText(comment.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText })
      });

      if (!res.ok) throw new Error('Error actualizando comentario');

      const updatedComment = await res.json();
      setComments(comments.map(c => c._id === commentId ? updatedComment : c));
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Error al actualizar el comentario');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX');
  };

  const currentUserId = (session?.user as any)?.id;
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-800 flex items-center">
        💬 Comentarios ({comments.length})
      </h3>

      {/* Formulario para nuevo comentario */}
      <form onSubmit={handleSubmit} className="space-y-2 relative">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Escribe un comentario... (usa @ para mencionar usuarios)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={submitting}
          />

          {/* Mention Autocomplete Dropdown */}
          {showMentionDropdown && mentionUsers.length > 0 && (
            <div className="absolute z-10 w-64 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
              {mentionUsers.map((user, index) => (
                <button
                  key={user._id}
                  type="button"
                  onClick={() => selectMention(user)}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition ${
                    index === selectedMentionIndex ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            💡 Usa @ para mencionar usuarios
          </div>
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? 'Enviando...' : 'Comentar'}
          </button>
        </div>
      </form>

      {/* Lista de comentarios */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-4">
            Cargando comentarios...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <div className="text-3xl mb-2">💬</div>
            <div>No hay comentarios aún. ¡Sé el primero en comentar!</div>
          </div>
        ) : (
          comments.map(comment => (
            comment.isSystemComment ? (
              // System comment - read-only with special styling
              <div key={comment._id} className="bg-blue-50 rounded-lg p-3 border border-blue-200 border-l-4">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    🤖
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm text-blue-900">
                        Sistema
                      </div>
                      <div className="text-xs text-blue-600">
                        {formatDate(comment.createdAt)}
                      </div>
                    </div>
                    <p className="text-blue-800 text-sm whitespace-pre-wrap">{comment.text}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Regular user comment - editable
              <div key={comment._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {comment.userId.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800">
                        {comment.userId.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(comment.createdAt)}
                        {comment.createdAt !== comment.updatedAt && ' (editado)'}
                      </div>
                    </div>
                  </div>
                  {(comment.userId._id === currentUserId || isAdmin) && (
                    <div className="flex space-x-2">
                      {comment.userId._id === currentUserId && editingId !== comment._id && (
                        <button
                          onClick={() => startEdit(comment)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          ✏️
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {editingId === comment._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleEdit(comment._id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.text}</p>
                )}
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
