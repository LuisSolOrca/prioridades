'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import CommentFileUpload from './CommentFileUpload';
import AttachmentCard from './AttachmentCard';

interface Attachment {
  _id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
}

interface Comment {
  _id: string;
  text: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  isSystemComment: boolean;
  attachments?: Attachment[];
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

interface UserGroup {
  _id: string;
  name: string;
  tag: string;
  color?: string;
  members?: any[];
  isGroup: true;
}

type MentionItem = (User & { isGroup?: false }) | UserGroup;

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
  const [mentionItems, setMentionItems] = useState<MentionItem[]>([]);
  const [mentionCursorPosition, setMentionCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Attachments state
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);

  // LocalStorage keys
  const NEW_COMMENT_KEY = `comment_new_${priorityId}`;
  const getEditCommentKey = (commentId: string) => `comment_edit_${commentId}`;

  useEffect(() => {
    loadComments();
  }, [priorityId]);

  // Restaurar borrador de nuevo comentario al montar
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(NEW_COMMENT_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const timeDiff = Date.now() - draft.timestamp;

        // Restaurar si tiene menos de 1 hora
        if (timeDiff < 3600000 && draft.text) {
          setNewComment(draft.text);
        } else {
          localStorage.removeItem(NEW_COMMENT_KEY);
        }
      }
    } catch (error) {
      console.error('Error restaurando borrador de comentario:', error);
      localStorage.removeItem(NEW_COMMENT_KEY);
    }
  }, [priorityId]);

  // Auto-guardar borrador de nuevo comentario
  useEffect(() => {
    if (newComment.trim()) {
      const draft = {
        text: newComment,
        timestamp: Date.now()
      };
      localStorage.setItem(NEW_COMMENT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(NEW_COMMENT_KEY);
    }
  }, [newComment, priorityId]);

  // Auto-guardar borrador de edición de comentario
  useEffect(() => {
    if (editingId && editText.trim()) {
      const draft = {
        text: editText,
        timestamp: Date.now()
      };
      localStorage.setItem(getEditCommentKey(editingId), JSON.stringify(draft));
    } else if (editingId) {
      localStorage.removeItem(getEditCommentKey(editingId));
    }
  }, [editText, editingId]);

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

  // Search users and groups for mention autocomplete
  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionItems([]);
      return;
    }

    try {
      // Buscar usuarios y grupos en paralelo
      const [usersRes, groupsRes] = await Promise.all([
        fetch(`/api/users/search?q=${encodeURIComponent(query)}`),
        fetch('/api/user-groups')
      ]);

      const users: User[] = usersRes.ok ? await usersRes.json() : [];
      const allGroups: UserGroup[] = groupsRes.ok ? await groupsRes.json() : [];

      // Filtrar grupos que coincidan con la búsqueda
      const filteredGroups = allGroups.filter((g: any) =>
        g.name.toLowerCase().includes(query.toLowerCase()) ||
        g.tag.toLowerCase().includes(query.toLowerCase())
      ).map((g: any) => ({ ...g, isGroup: true as const }));

      // Combinar y ordenar: grupos primero, luego usuarios
      const combined: MentionItem[] = [...filteredGroups, ...users.map(u => ({ ...u, isGroup: false as const }))];
      setMentionItems(combined);
    } catch (error) {
      console.error('Error searching users/groups:', error);
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
  const selectMention = (item: MentionItem) => {
    const beforeMention = newComment.slice(0, mentionCursorPosition);
    const afterMention = newComment.slice(mentionCursorPosition + mentionSearch.length + 1);
    const mentionText = item.isGroup ? (item as UserGroup).tag : (item as User).name;
    const newText = `${beforeMention}@${mentionText} ${afterMention}`;

    setNewComment(newText);
    setShowMentionDropdown(false);
    setMentionItems([]);

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = beforeMention.length + mentionText.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle keyboard navigation in mention dropdown
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown || mentionItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMentionIndex((prev) =>
        prev < mentionItems.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectMention(mentionItems[selectedMentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
      setMentionItems([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Permitir enviar si hay texto O archivos adjuntos
    if (!newComment.trim() && pendingAttachments.length === 0) return;

    try {
      setSubmitting(true);

      // Si no hay texto pero hay archivos, crear mensaje automático
      const commentText = newComment.trim()
        ? newComment
        : `📎 Subió ${pendingAttachments.length} archivo${pendingAttachments.length > 1 ? 's' : ''}`;

      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityId,
          text: commentText,
          attachments: pendingAttachments
        })
      });

      if (!res.ok) throw new Error('Error creando comentario');

      const comment = await res.json();
      setComments([...comments, comment]);
      setNewComment('');
      setPendingAttachments([]);
      // Limpiar borrador del localStorage
      localStorage.removeItem(NEW_COMMENT_KEY);
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

    // Intentar restaurar borrador si existe
    try {
      const savedDraft = localStorage.getItem(getEditCommentKey(comment._id));
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const timeDiff = Date.now() - draft.timestamp;

        // Restaurar si tiene menos de 1 hora
        if (timeDiff < 3600000 && draft.text) {
          setEditText(draft.text);
          return;
        } else {
          localStorage.removeItem(getEditCommentKey(comment._id));
        }
      }
    } catch (error) {
      console.error('Error restaurando borrador de edición:', error);
      localStorage.removeItem(getEditCommentKey(comment._id));
    }

    // Si no hay borrador, usar texto original
    setEditText(comment.text);
  };

  const cancelEdit = () => {
    if (editingId) {
      // Limpiar borrador del localStorage
      localStorage.removeItem(getEditCommentKey(editingId));
    }
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
      // Limpiar borrador del localStorage
      localStorage.removeItem(getEditCommentKey(commentId));
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
      <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
            rows={3}
            disabled={submitting}
          />

          {/* Mention Autocomplete Dropdown */}
          {showMentionDropdown && mentionItems.length > 0 && (
            <div className="absolute z-10 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
              {mentionItems.map((item, index) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => selectMention(item)}
                  className={`w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 transition ${
                    index === selectedMentionIndex ? 'bg-blue-100 dark:bg-gray-700' : ''
                  }`}
                >
                  {item.isGroup ? (
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                        style={{ backgroundColor: (item as UserGroup).color || '#3b82f6' }}
                      >
                        👥
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                            {item.name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded font-mono"
                            style={{
                              backgroundColor: `${(item as UserGroup).color}20`,
                              color: (item as UserGroup).color || '#3b82f6'
                            }}
                          >
                            @{(item as UserGroup).tag}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(item as UserGroup).members?.length || 0} {((item as UserGroup).members?.length || 0) === 1 ? 'miembro' : 'miembros'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {(item as User).name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                          {(item as User).name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {(item as User).email}
                        </div>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Componente de subida de archivos */}
        <CommentFileUpload
          priorityId={priorityId}
          onUploadSuccess={(attachment) => {
            setPendingAttachments(prev => [...prev, attachment._id]);
          }}
          onUploadError={(error) => {
            console.error('Error uploading file:', error);
            alert(`Error al subir archivo: ${error}`);
          }}
        />

        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {pendingAttachments.length > 0 ? (
              <span>📎 {pendingAttachments.length} archivo{pendingAttachments.length > 1 ? 's' : ''} listo{pendingAttachments.length > 1 ? 's' : ''} para enviar</span>
            ) : (
              <span>💡 Usa @ para mencionar usuarios</span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || (!newComment.trim() && pendingAttachments.length === 0)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? 'Enviando...' : 'Comentar'}
          </button>
        </div>
      </form>

      {/* Lista de comentarios */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
            Cargando comentarios...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">
            <div className="text-3xl mb-2">💬</div>
            <div>No hay comentarios aún. ¡Sé el primero en comentar!</div>
          </div>
        ) : (
          comments.map(comment => (
            comment.isSystemComment ? (
              // System comment - read-only with special styling
              <div key={comment._id} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700 border-l-4">
                <div className="flex items-start space-x-2">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    🤖
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm text-blue-900 dark:text-blue-200">
                        Sistema
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {formatDate(comment.createdAt)}
                      </div>
                    </div>
                    <p className="text-blue-800 dark:text-blue-300 text-sm whitespace-pre-wrap">{comment.text}</p>

                    {/* Attachments para comentarios del sistema */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {comment.attachments.map((attachment) => (
                          <AttachmentCard
                            key={attachment._id}
                            attachment={attachment}
                            showDelete={false}
                            compact={true}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Regular user comment - editable
              <div key={comment._id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {comment.userId?.name ? comment.userId.name.split(' ').map(n => n[0]).join('') : '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                        {comment.userId?.name || 'Usuario desconocido'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(comment.createdAt)}
                        {comment.createdAt !== comment.updatedAt && ' (editado)'}
                      </div>
                    </div>
                  </div>
                  {comment.userId && (comment.userId._id === currentUserId || isAdmin) && (
                    <div className="flex space-x-2">
                      {comment.userId && comment.userId._id === currentUserId && editingId !== comment._id && (
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      rows={3}
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
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
                  <>
                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">{comment.text}</p>

                    {/* Attachments para comentarios regulares */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {comment.attachments.map((attachment) => (
                          <AttachmentCard
                            key={attachment._id}
                            attachment={attachment}
                            showDelete={false}
                            compact={true}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
