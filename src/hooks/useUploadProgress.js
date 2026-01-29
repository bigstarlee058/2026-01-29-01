import { useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';

/**
 * useUploadProgress
 * - Provides real upload progress via XHR (axios) with AbortController cancellation.
 * - Default endpoint targets `${REACT_APP_BACKEND_URL}gallery/upload`.
 *
 * API:
 * const { upload, cancel, isUploading, lastError } = useUploadProgress();
 * await upload(formData, { onProgress?: (percent:number)=>void, endpoint?: string });
 * cancel() to abort the in-flight request.
 */
export const useUploadProgress = () => {
  const token = useSelector(state => state.auth?.token);
  const controllerRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState(null);

  const upload = useCallback(
    async (formData, { onProgress, endpoint } = {}) => {
      setIsUploading(true);
      setLastError(null);

      // Create controller for cancellation
      const controller = new AbortController();
      controllerRef.current = controller;

      const base = process.env.REACT_APP_BACKEND_URL || '';
      const url = endpoint || `${base}gallery/upload`;

      try {
        const response = await axios.post(url, formData, {
          signal: controller.signal,
          // Don't set Content-Type explicitly; axios will set proper boundary for FormData
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          onUploadProgress: e => {
            if (e.total) {
              const percentage = Math.round((e.loaded * 100) / e.total);
              if (typeof onProgress === 'function') onProgress(percentage);
            }
          },
        });

        if (typeof onProgress === 'function') onProgress(100);
        return { data: response.data };
      } catch (error) {
        // Handle cancellation consistently across axios versions
        const isCanceled =
          (axios.isCancel && axios.isCancel(error)) ||
          error?.name === 'CanceledError' ||
          error?.message === 'canceled' ||
          error?.code === 'ERR_CANCELED';

        const wrapped = isCanceled ? { canceled: true, error } : { canceled: false, error };
        setLastError(wrapped);
        throw wrapped;
      } finally {
        setIsUploading(false);
        controllerRef.current = null;
      }
    },
    [token]
  );

  const cancel = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);

  return { upload, cancel, isUploading, lastError };
};

export default useUploadProgress;