'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  X,
  Eye,
  ArrowRight,
  CheckCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';

// Custom debounce hook
function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

interface DuplicateCandidate {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  similarity: number;
  matchedOn: string[];
}

interface DuplicateWarningProps {
  type: 'client' | 'contact';
  name?: string;
  email?: string;
  phone?: string;
  excludeId?: string;
  onSelect?: (id: string) => void;
  onIgnore?: () => void;
  className?: string;
}

/**
 * Component that checks for duplicates and shows a warning if found.
 * Use this in creation/edit forms to prevent duplicate entries.
 */
export default function DuplicateWarning({
  type,
  name,
  email,
  phone,
  excludeId,
  onSelect,
  onIgnore,
  className = '',
}: DuplicateWarningProps) {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Debounced check function
  const checkDuplicates = useDebouncedCallback(
    async (checkName?: string, checkEmail?: string, checkPhone?: string) => {
      if (!checkName && !checkEmail) {
        setDuplicates([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({ type });
        if (checkName) params.append('name', checkName);
        if (checkEmail) params.append('email', checkEmail);
        if (checkPhone) params.append('phone', checkPhone);
        if (excludeId) params.append('excludeId', excludeId);

        const res = await fetch(`/api/crm/duplicates/check?${params}`);
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates || []);
          setDismissed(false);
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
      } finally {
        setLoading(false);
      }
    },
    500 // 500ms debounce
  );

  // Check when inputs change
  useEffect(() => {
    checkDuplicates(name, email, phone);
  }, [name, email, phone, checkDuplicates]);

  const handleDismiss = () => {
    setDismissed(true);
    onIgnore?.();
  };

  const handleSelect = (id: string) => {
    onSelect?.(id);
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.95) return 'text-red-600';
    if (similarity >= 0.85) return 'text-orange-600';
    return 'text-yellow-600';
  };

  const formatMatchedOn = (matchedOn: string[]) => {
    const labels: Record<string, string> = {
      name: 'nombre',
      email: 'email',
      phone: 'teléfono',
    };
    return matchedOn.map(m => labels[m] || m).join(', ');
  };

  // Don't show if dismissed or no duplicates
  if (dismissed || duplicates.length === 0) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              Posibles duplicados encontrados
            </h4>
            <button
              onClick={handleDismiss}
              className="p-1 text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-400"
              title="Ignorar y continuar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
            Se encontraron {duplicates.length} registro(s) similar(es). Revisa antes de crear uno nuevo.
          </p>

          <div className="space-y-2">
            {duplicates.map((dup) => (
              <div
                key={dup._id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {dup.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      {dup.email && <span>{dup.email}</span>}
                      {dup.phone && <span>{dup.phone}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-medium ${getSimilarityColor(dup.similarity)}`}>
                        {Math.round(dup.similarity * 100)}% similar
                      </span>
                      <span className="text-xs text-gray-400">
                        (coincide en: {formatMatchedOn(dup.matchedOn)})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={`/crm/${type === 'client' ? 'clients' : 'contacts'}/${dup._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                      title="Ver registro"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {onSelect && (
                      <button
                        onClick={() => handleSelect(dup._id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
                      >
                        Usar este
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
            <button
              onClick={handleDismiss}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Ignorar y crear nuevo
            </button>
            <a
              href="/crm/duplicates"
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline flex items-center gap-1"
            >
              <Copy className="w-4 h-4" />
              Gestionar duplicados
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for checking duplicates programmatically
 */
export function useDuplicateCheck(type: 'client' | 'contact') {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  const checkDuplicates = useCallback(async (
    fields: { name?: string; email?: string; phone?: string },
    excludeId?: string
  ) => {
    const { name, email, phone } = fields;

    if (!name && !email) {
      setDuplicates([]);
      return { hasDuplicates: false, duplicates: [] };
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (name) params.append('name', name);
      if (email) params.append('email', email);
      if (phone) params.append('phone', phone);
      if (excludeId) params.append('excludeId', excludeId);

      const res = await fetch(`/api/crm/duplicates/check?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.duplicates || []);
        return data;
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    } finally {
      setLoading(false);
    }

    return { hasDuplicates: false, duplicates: [] };
  }, [type]);

  return {
    duplicates,
    loading,
    checkDuplicates,
    hasDuplicates: duplicates.length > 0,
  };
}
