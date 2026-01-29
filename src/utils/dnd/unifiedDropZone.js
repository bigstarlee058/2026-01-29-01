import { useRef, useState, useCallback, useEffect } from 'react';
import { validateFile, detectCategory } from '../fileValidation';
import toast from 'react-hot-toast';

/**
 * Detects if a drag event contains external files (not internal react-dnd)
 */
export const isExternalFileDrag = (e) => {
  if (!e.dataTransfer) return false;
  
  const types = Array.from(e.dataTransfer.types || []);
  
  // Check for Files type (external) and absence of react-dnd markers
  const hasFiles = types.includes('Files');
  const isReactDnd = types.includes('application/json') || 
                     types.some(type => type.startsWith('__REACT_DND_'));
  
  return hasFiles && !isReactDnd;
};

/**
 * Detects if a drag event is from internal react-dnd
 */
export const isInternalDrag = (e) => {
  if (!e.dataTransfer) return false;
  
  const types = Array.from(e.dataTransfer.types || []);
  return types.includes('application/json') || 
         types.some(type => type.startsWith('__REACT_DND_'));
};

/**
 * Throttles a function using requestAnimationFrame
 */
export const throttleWithRAF = (func) => {
  let rafId = null;
  let lastArgs = null;
  
  const throttled = (...args) => {
    lastArgs = args;
    
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func(...lastArgs);
        rafId = null;
      });
    }
  };
  
  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
  
  return throttled;
};

/**
 * Gets cursor style based on drag validity
 */
export const getDragCursor = (isValid, isDragging) => {
  if (!isDragging) return 'auto';
  return isValid ? 'copy' : 'not-allowed';
};

/**
 * Sets the proper dropEffect on drag events
 */
export const setDropEffect = (e, isValid) => {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = isValid ? 'copy' : 'none';
  }
};

/**
 * Custom hook for unified external file drop handling
 */
export const useUnifiedDropZone = ({
  onDrop,
  onDragStateChange,
  acceptedTypes = ['image', 'video', 'audio'],
  validateFiles = true,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidDrag, setIsValidDrag] = useState(false);
  const dragCounterRef = useRef(0);
  const dropZoneRef = useRef(null);
  
  // Throttled drag over handler
  const handleDragOverThrottled = useCallback(
    throttleWithRAF((e) => {
      if (disabled || !isExternalFileDrag(e)) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Try to detect file validity (limited in dragover)
      const items = Array.from(e.dataTransfer.items || []);
      
      // Optimistic validation - assume valid unless clearly invalid
      let isValid = true;
      
      // Only mark as invalid if we have items and ALL are clearly non-media
      if (items.length > 0) {
        const hasAnyPossiblyValid = items.some(item => {
          if (item.kind !== 'file') return false;
          
          // If no type info, optimistically assume valid
          if (!item.type) return true;
          
          // Check if it's a media type
          const category = item.type.split('/')[0];
          if (acceptedTypes.includes(category)) return true;
          
          // Special cases for media that might have wrong MIME types
          // WebP and some images can show as application/octet-stream
          if (item.type === 'application/octet-stream') return true;
          
          // Check for clearly non-media types (be very conservative)
          // Only reject types we're SURE are not media
          const nonMediaTypes = [
            'text/plain', 'text/html', 'text/css', 'text/javascript',
            'application/pdf', 'application/zip', 'application/x-zip',
            'application/json', 'application/xml', 'application/msword',
            'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'
          ];
          
          if (nonMediaTypes.includes(item.type)) {
            return false;  // Definitely not media
          }
          
          // For any other type (including unknown application/* types), 
          // assume it could be valid media
          return true;
        });
        
        isValid = hasAnyPossiblyValid;
      }
      
      setIsValidDrag(isValid);
      setDropEffect(e, isValid);
    }),
    [disabled, acceptedTypes]
  );
  
  const handleDragEnter = useCallback((e) => {
    if (disabled || !isExternalFileDrag(e)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current++;
    
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
      // Set optimistic valid state initially - we'll validate properly in dragover
      setIsValidDrag(true);
      onDragStateChange?.(true);
      
      // Set dropEffect early for better UX
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    }
  }, [disabled, onDragStateChange]);
  
  const handleDragLeave = useCallback((e) => {
    if (disabled || !isExternalFileDrag(e)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current--;
    
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
      setIsValidDrag(false);
      onDragStateChange?.(false);
    }
  }, [disabled, onDragStateChange]);
  
  const handleDrop = useCallback(async (e) => {
    if (disabled || !isExternalFileDrag(e)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    dragCounterRef.current = 0;
    setIsDragging(false);
    setIsValidDrag(false);
    onDragStateChange?.(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    
    if (files.length === 0) {
      toast.error('No files detected');
      return;
    }
    
    // Validate files if requested
    const validFiles = [];
    const invalidFiles = [];
    
    for (const file of files) {
      if (validateFiles) {
        // Use proper validation with detectCategory
        const validation = validateFile(file, 'All');
        if (validation.ok) {
          // Include category info for proper handling
          const category = detectCategory(file);
          file._category = category; // Store category for later use
          validFiles.push(file);
        } else {
          invalidFiles.push({ file, reason: validation.reason });
        }
      } else {
        // Even without validation, detect category for proper processing
        const category = detectCategory(file);
        file._category = category;
        validFiles.push(file);
      }
    }
    
    // Show feedback for invalid files
    if (invalidFiles.length > 0) {
      const fileNames = invalidFiles.map(f => f.file.name).join(', ');
      toast.error(`Invalid files: ${fileNames}`);
    }
    
    // Process valid files
    if (validFiles.length > 0) {
      if (validFiles.length > 1) {
        toast(`Processing ${validFiles.length} files...`);
      }
      
      await onDrop(validFiles, e);
    }
  }, [disabled, validateFiles, acceptedTypes, onDrop, onDragStateChange]);
  
  // Clean up throttled function on unmount
  useEffect(() => {
    return () => {
      handleDragOverThrottled.cancel?.();
    };
  }, [handleDragOverThrottled]);
  
  return {
    dropZoneRef,
    isDragging,
    isValidDrag,
    dropZoneProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOverThrottled,
      onDrop: handleDrop,
    },
    dragState: {
      isDragging,
      isValidDrag,
      cursor: getDragCursor(isValidDrag, isDragging),
    },
  };
};

/**
 * Processes dropped files for scene/canvas usage
 */
export const processDroppedFiles = async (files, targetType = 'scene') => {
  const processed = [];
  
  for (const file of files) {
    const fileUrl = URL.createObjectURL(file);
    
    // Use detectCategory for proper categorization
    const category = file._category || detectCategory(file);
    
    // Map Animation to image for processing
    const fileType = category === 'Animation' ? 'image' : (category || file.type.split('/')[0]).toLowerCase();
    
    const basePayload = {
      id: `dropped-${Date.now()}-${Math.random()}`,
      name: file.name,
      url: fileUrl,
      file,
      size: file.size,
      type: fileType,
      category: category, // Keep original category for reference
    };
    
    if (fileType === 'image') {
      // Load image to get dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = fileUrl;
      });
      
      processed.push({
        ...basePayload,
        width: img.width,
        height: img.height,
        thumbnail: fileUrl,
      });
    } else if (fileType === 'video') {
      // Create video element to get metadata
      const video = document.createElement('video');
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = fileUrl;
      });
      
      processed.push({
        ...basePayload,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        thumbnail: fileUrl, // Could generate real thumbnail
      });
    } else if (fileType === 'audio') {
      // Create audio element to get duration
      const audio = new Audio();
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
        audio.src = fileUrl;
      });
      
      processed.push({
        ...basePayload,
        duration: audio.duration,
      });
    } else {
      processed.push(basePayload);
    }
  }
  
  return processed;
};

/**
 * HOC to add unified drop zone behavior to any component
 */
export const withUnifiedDropZone = (Component, dropConfig) => {
  return (props) => {
    const dropZone = useUnifiedDropZone(dropConfig);
    
    return (
      <div {...dropZone.dropZoneProps} ref={dropZone.dropZoneRef}>
        <Component {...props} dropZoneState={dropZone.dragState} />
      </div>
    );
  };
};