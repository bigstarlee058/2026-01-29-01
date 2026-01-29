import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { user } from '../redux/auth';
import { rateImage } from 'utils/generations';
import { getPromptGenerations, getGenerations } from 'utils/generations';
import { downloadSingleImage } from 'utils/downloadImage';
import { downloadImages } from 'utils/downloadImage';
import { saveAs } from 'file-saver';
import { useDebounce } from 'use-debounce';
import FileSaver from 'file-saver';
import { usersList } from 'utils/users';
import { getPixabayImages } from '../utils/pixabay';
import JSZip from 'jszip';
export const useImages = (
  options = { needSearch: true, disableIntersectionObserver: false }
) => {
  const { needSearch = true, disableIntersectionObserver = false } = options;
  const [images, setImages] = useState([]);
  const [isLoadNewImages, setIsLoadNewImages] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [sort, setSort] = useState('Liked images');
  const [userSort, setUserSort] = useState('All Users');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selections, setSelections] = useState(() => {
    // Initialize from localStorage if available
    const savedSelections = localStorage.getItem('imageSelections');
    return savedSelections ? JSON.parse(savedSelections) : [];
  });
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { username } = useSelector(user);
  const [searchPrompt] = useDebounce(search, 500);
  const observer = useRef(null);
  const [users, setUsers] = useState([]);
  const [userSearch] = useDebounce(userSort, 500);
  const [hasMore, setHasMore] = useState(true);
  const [provider, setProvider] = useState('leonardo');
  const isMountedRef = useRef(true);
  const [imageCache, setImageCache] = useState(new Map());
  const loadingRef = useRef(false);
  const [debouncedProvider] = useDebounce(provider, 300);
  const initialLoadingRef = useRef(true);
  const currentPageRef = useRef(1); // Track the current page being loaded

  const [isProviderLoading, setIsProviderLoading] = useState(false);
  const currentRequestIdRef = useRef(0);
  const providerChangeTimeoutRef = useRef(null);
  const isChangingProviderRef = useRef(false);

  // Обработчик размонтирования компонента
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (providerChangeTimeoutRef.current) {
        clearTimeout(providerChangeTimeoutRef.current);
      }
      isChangingProviderRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialLoadingRef.current && needSearch) {
      getImages();
      initialLoadingRef.current = false;
    }
  }, [needSearch]);

  const safeSetIsLoading = value => {
    if (isMountedRef.current) {
      setIsLoading(value);
      loadingRef.current = value;
    }
  };

  const safeSetImages = value => {
    if (isMountedRef.current) {
      setImages(value);
    }
  };

  const safeSetHasMore = value => {
    if (isMountedRef.current) {
      setHasMore(value);
    }
  };

  useEffect(() => {
    // Skip if we don't need search
    if (!needSearch) {
      return;
    }

    const getAllUsers = async () => {
      try {
        const response = await usersList();
        if (isMountedRef.current) {
          setUsers(response.map(user => user.username));
        }
      } catch (error) {
}
    };

    getAllUsers();

    // Add event listener for gallery filters
    const handleOpenGalleryFilters = () => {
      setIsSidebarOpen(true);
    };

    window.addEventListener('openGalleryFilters', handleOpenGalleryFilters);

    return () => {
      window.removeEventListener(
        'openGalleryFilters',
        handleOpenGalleryFilters
      );
    };
  }, [needSearch]);

  const lastImageElementRef = useCallback(
    node => {
      // Skip intersection observer if disabled (for Masonic pagination)
      if (disableIntersectionObserver) {
        return;
      }

      if (isLoading || !hasMore) {
        return;
      }

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        entries => {
          if (entries[0].isIntersecting && hasMore && !isLoading) {
            setPage(prevPage => {
              const newPage = prevPage + 1;
              return newPage;
            });
          }
        },
        {
          root: null, // Use viewport as root
          rootMargin: '200px', // Start loading when element is 200px away from viewport
          threshold: 0.1,
        }
      );

      if (node) {
        observer.current.observe(node);
      }
    },
    [isLoading, hasMore, page, disableIntersectionObserver]
  );

  const onChangeSearch = value => {
    setSearch(value);
    // Reset page when search changes
    setPage(1);
    // Clear previous images when starting a new search
    setImages([]);
  };
  const onChangeFilterSearch = value => {
    setSearch(prev => {
      if (prev && prev.split(' ').includes(value)) {
        return prev
          .split(' ')
          .filter(item => item !== value)
          .join(' ');
      } else {
        return prev ? `${prev} ${value}` : value;
      }
    });
  };

  const onChangeFilters = (filterName, user) => {
    setHasMore(true);
    setSort(filterName);
    setFilter(filterName);
    setUserSort(user);
  };
  const onChangeUserSort = (user, sort) => {
    setSelectedFilters(sort);
    setUserSort(user);
  };

  const resetFilters = () => {
    setHasMore(true);
    onChangeFilters('', '');
    onChangeSearch('');
  };

  const onSortValueCheck = (sort, userSort) => {
    let value = null;
    const user = userSort !== 'All Users' ? `&username=${userSort}` : '';
    switch (sort) {
      case 'Liked images':
      case 'Liked by:':
        value = `&rate=likes&date=-1${user}`;
        break;
      case 'Disliked images':
      case 'Disliked by:':
        value = `&rate=dislikes&date=-1${user}`;
        break;
      case 'Older':
        value = '&date=1';
        break;
      case 'Newer':
        value = '&date=-1';
        break;
      default:
        value = '&rate=likes&date=-1';
        break;
    }
    return value;
  };

  const getCachedImages = async (key, fetchFunction) => {
    if (imageCache.has(key)) {
      return imageCache.get(key);
    }

    const results = await fetchFunction();
    setImageCache(prev => new Map(prev).set(key, results));
    return results;
  };

  const normalizeProvider = providerValue => {
    if (!providerValue) return 'leonardo';
    const value = String(providerValue).toLowerCase().trim();
    if (value === 'leonardo ai' || value === 'leonardo') return 'leonardo';
    if (value === 'pixabay') return 'pixabay';
    return 'leonardo';
  };

  useEffect(() => {
    if (!needSearch) return;
    if (!hasMore) return;

    // Only block if we're already loading the same page
    if (loadingRef.current && currentPageRef.current === page) return;

    // Update the current page being loaded
    currentPageRef.current = page;

    const currentProvider = normalizeProvider(debouncedProvider);
    safeSetIsLoading(true);


    const timeoutId = setTimeout(async () => {
      try {
        const cacheKey = `${searchPrompt}-${page}-${filter}-${sort}-${userSort}-${currentProvider}`;

        if (currentProvider === 'leonardo') {
          const response = await getCachedImages(cacheKey, async () => {
            // Use search-based API if there's a search prompt, otherwise use general API
            if (searchPrompt && searchPrompt.trim().length > 0) {
              return await getPromptGenerations({
                page,
                limit: 20,
                prompt: searchPrompt,
                sort: onSortValueCheck(filter, userSort),
              });
            } else {
              return await getGenerations({
                page,
                limit: 20,
                sort: onSortValueCheck(filter, userSort),
              });
            }
          });

          if (
            normalizeProvider(debouncedProvider) !== currentProvider ||
            !isMountedRef.current
          ) {
            safeSetIsLoading(false);
            return;
          }

          if (response?.length > 0) {
            const formattedImages = response.map(img => ({
              ...img,
              provider: 'leonardo',
            }));

            safeSetImages(prev => {
              if (page === 1) {
                return formattedImages;
              } else {
                // For pagination, append new images and avoid duplicates
                const existingIds = new Set(prev.map(img => img._id));
                const newImages = formattedImages.filter(
                  img => !existingIds.has(img._id)
                );
                return [...prev, ...newImages];
              }
            });
            safeSetHasMore(response.length === 20);
          } else {
            safeSetHasMore(false);
          }
        } else if (currentProvider === 'pixabay') {
          const response = await getCachedImages(cacheKey, async () => {
            return await getPixabayImages({
              q: searchPrompt || 'nature',
              page,
              per_page: 24,
            });
          });

          if (
            normalizeProvider(debouncedProvider) !== currentProvider ||
            !isMountedRef.current
          ) {
            safeSetIsLoading(false);
            return;
          }

          if (response.images?.length > 0) {
            const formattedImages = response.images.map(img => ({
              _id: img.id.toString(),
              url: img.largeImageURL,
              minUrl: img.largeImageURL,
              likes: img.likes,
              dislikes: 0,
              provider: 'pixabay',
            }));

            safeSetImages(prev => {
              if (page === 1) {
                return formattedImages;
              } else {
                // For pagination, append new images and avoid duplicates
                const existingIds = new Set(prev.map(img => img._id));
                const newImages = formattedImages.filter(
                  img => !existingIds.has(img._id)
                );
                return [...prev, ...newImages];
              }
            });
            safeSetHasMore(response.images.length === 24);
          } else {
            safeSetHasMore(false);
          }
        }
      } catch (error) {
        console.error('Error loading images:', error);
        safeSetHasMore(false);
      } finally {
        safeSetIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      safeSetIsLoading(false);
    };
  }, [
    page,
    searchPrompt,
    filter,
    sort,
    userSort,
    debouncedProvider,
    needSearch,
  ]);

  useEffect(() => {
    if (searchPrompt || filter || userSort) {
      // Reset everything when search/filter parameters change
      setImages([]);
      setPage(1);
      currentPageRef.current = 1;
      setHasMore(true);
    }
  }, [searchPrompt, filter, userSort]);

  useEffect(() => {
    // Skip if we don't need search
    if (!needSearch) return;

    // Normalize current provider for comparison
    const currentProviderLower = provider.toLowerCase();

    // Skip first render for leonardo
    if (currentProviderLower === 'leonardo' && initialLoadingRef.current) {
      return;
    }

    // Reset state when provider changes
    setImages([]);
    setPage(1);
    currentPageRef.current = 1;
    setHasMore(true);
    setIsLoading(true);

    initialLoadingRef.current = true;

    // Load data with a small delay
    const timeoutId = setTimeout(() => {
      if (isMountedRef.current) {
        getImages();
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [provider, needSearch]);

  const getImages = async (forcedProvider = null) => {
    if (!needSearch || !hasMore || isLoading || isChangingProviderRef.current)
      return;

    // Check if this request is still valid
    if (forcedProvider && forcedProvider !== normalizeProvider(provider)) {
      return;
    }

    safeSetIsLoading(true);
    // Используем принудительный провайдер если он передан
    const currentProvider = forcedProvider || normalizeProvider(provider);

    try {
      // Double check provider hasn't changed during async operation
      if (
        isChangingProviderRef.current ||
        currentProvider !== normalizeProvider(provider)
      ) {
        safeSetIsLoading(false);
        return;
      }

      // Store the current provider at the start of the request
      const requestProvider = currentProvider;

      if (currentProvider === 'leonardo') {
        const response = await getGenerations({
          page,
          limit: 20,
          sort: onSortValueCheck(filter, userSort),
        });

        // Check if provider has changed during the request
        if (
          !isMountedRef.current ||
          isChangingProviderRef.current ||
          requestProvider !== normalizeProvider(provider)
        ) {
          safeSetIsLoading(false);
          return;
        }

        if (response?.length > 0) {
          const formattedImages = response.map(img => ({
            ...img,
            provider: 'leonardo',
          }));

          safeSetImages(prev => {
            if (page === 1) return formattedImages;
            const existingIds = new Set(prev.map(img => img._id));
            const newImages = formattedImages.filter(
              img => !existingIds.has(img._id)
            );
            return [...prev, ...newImages];
          });
          safeSetHasMore(response.length === 20);
        } else {
          safeSetHasMore(false);
        }
      } else if (currentProvider === 'pixabay') {
        const response = await getPixabayImages({
          q: searchPrompt || 'nature',
          page,
          per_page: 24,
        });

        // Check if provider has changed during the request
        if (
          !isMountedRef.current ||
          isChangingProviderRef.current ||
          requestProvider !== normalizeProvider(provider)
        ) {
          safeSetIsLoading(false);
          return;
        }

        if (response.images?.length > 0) {
          const formattedImages = response.images.map(img => ({
            _id: img.id.toString(),
            url: img.largeImageURL,
            minUrl: img.largeImageURL,
            likes: img.likes,
            dislikes: 0,
            provider: 'pixabay',
          }));

          safeSetImages(prev =>
            page === 1 ? formattedImages : [...prev, ...formattedImages]
          );
          safeSetHasMore(response.images.length === 24);
        } else {
          safeSetHasMore(false);
        }
      }
    } catch (error) {
      safeSetHasMore(false);
    } finally {
      safeSetIsLoading(false);
    }
  };

  const getImagesByPrompt = async (forcedProvider = null) => {
    if (!hasMore || isLoading || isChangingProviderRef.current) return;

    // Check if this request is still valid
    if (forcedProvider && forcedProvider !== normalizeProvider(provider)) {
      return;
    }

    safeSetIsLoading(true);
    const currentProvider = forcedProvider || normalizeProvider(provider);

    try {
      if (currentProvider === 'leonardo') {
        const response = await getPromptGenerations({
          page,
          limit: 20,
          prompt: searchPrompt,
          sort: onSortValueCheck(filter, userSort),
        });

        if (
          !isMountedRef.current ||
          isChangingProviderRef.current ||
          (forcedProvider
            ? forcedProvider !== 'leonardo'
            : normalizeProvider(provider) !== 'leonardo')
        ) {
          safeSetIsLoading(false);
          return;
        }

        if (response?.length > 0) {
          const formattedImages = response.map(img => ({
            ...img,
            provider: 'leonardo',
          }));

          safeSetImages(prev => {
            if (page === 1) return formattedImages;
            const existingIds = new Set(prev.map(img => img._id));
            const newImages = formattedImages.filter(
              img => !existingIds.has(img._id)
            );
            return [...prev, ...newImages];
          });
          safeSetHasMore(response.length === 20);
        } else {
          safeSetHasMore(false);
        }
      } else if (currentProvider === 'pixabay') {
        const response = await getPixabayImages({
          q: searchPrompt,
          page,
          per_page: 24,
        });

        if (
          !isMountedRef.current ||
          isChangingProviderRef.current ||
          (forcedProvider
            ? forcedProvider !== 'pixabay'
            : normalizeProvider(provider) !== 'pixabay')
        ) {
          safeSetIsLoading(false);
          return;
        }

        if (response.images?.length > 0) {
          const formattedImages = response.images.map(img => ({
            _id: img.id.toString(),
            url: img.largeImageURL,
            minUrl: img.largeImageURL,
            likes: img.likes,
            dislikes: 0,
            provider: 'pixabay',
          }));

          safeSetImages(prev => {
            if (page === 1) return formattedImages;
            const existingIds = new Set(prev.map(img => img._id));
            const newImages = formattedImages.filter(
              img => !existingIds.has(img._id)
            );
            return [...prev, ...newImages];
          });
          safeSetHasMore(response.images.length === 24);
        } else {
          safeSetHasMore(false);
        }
      }
    } catch (error) {
      safeSetHasMore(false);
    } finally {
      safeSetIsLoading(false);
    }
  };

  const onRateImg = async (id, action, optimisticImage) => {
    try {
      const imageToUpdate = images.find(i => i._id === id);
      const data = {
        url: imageToUpdate.url,
        action,
        username,
      };

      // Apply optimistic update immediately
      if (optimisticImage) {
        setImages(prevImages =>
          prevImages.map(i => (i._id === id ? optimisticImage : i))
        );
      }

      const response = await rateImage(data);

      if (response) {
        // Update with server response
        setImages(prevImages =>
          prevImages.map(i =>
            i._id === id
              ? { ...i, likes: response.likes, dislikes: response.dislikes }
              : i
          )
        );
      }
    } catch (error) {
// Revert optimistic update on error
      if (optimisticImage) {
        setImages(prevImages =>
          prevImages.map(i =>
            i._id === id
              ? {
                  ...i,
                  likes: imageToUpdate.likes,
                  dislikes: imageToUpdate.dislikes,
                }
              : i
          )
        );
      }
    }
  };

  const onToggleSelected = (imageData, isMultiSelect = true) => {
    setSelections(prevSelections => {
      let prevOnes = [];
      if (!localStorage.getItem('imageSelections')) {
        localStorage.setItem('imageSelections', JSON.stringify([]));
      } else {
        prevOnes = JSON.parse(localStorage.getItem('imageSelections'));
      }
      const isSelected =
        prevOnes.length === 0
          ? false
          : prevOnes.some(item => item.url === imageData.url);

      if (isSelected) {
        // Always remove the image if it is already selected
        const newSelections = prevOnes.filter(
          item => item.url !== imageData.url
        );
        localStorage.setItem('imageSelections', JSON.stringify(newSelections));
        return newSelections;
      } else {
        // If single select mode, replace the entire selection
        const newSelections = isMultiSelect
          ? [...prevOnes, imageData]
          : [imageData];
        localStorage.setItem('imageSelections', JSON.stringify(newSelections));
        return newSelections;
      }
    });
  };

  const checkIfSelected = url => {
    return selections.find(item => item.url === url);
  };
  const getSelectedGenerationImagesByStoryId = storyId => {
    const filteredSelections = selections.filter(item => {
      return item.storyId === storyId;
    });
    return filteredSelections;
  };

  const clearSelections = () => {
    setSelections([]);
  };

  const onImageDownload = async id => {
    try {
      const imgToDownload = images.find(i => i._id === id);
      setIsDownloaded(false);

      const response = await fetch(imgToDownload.url);
      const blob = await response.blob();
      saveAs(blob, `${imgToDownload._id}.jpg`);

      setIsDownloaded(true);
    } catch (error) {
}
  };
  const onScopeImagesDownload = async () => {
    try {
      const selectedOnes = JSON.parse(localStorage.getItem('imageSelections'));
      if (selectedOnes.length === 0) return;
      const zip = new JSZip();

      for (const selection of selectedOnes) {
        try {
          const response = await fetch(selection.url);
          const blob = await response.blob();
          const filename = selection.url.split('/').pop();
          zip.file(filename, blob);
        } catch (error) {
          console.error(
            `Failed to download image from ${selection.url}:`,
            error
          );
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      FileSaver.saveAs(content, 'images.zip');
      setIsDownloaded(true);

      // setSelections([]);
      // localStorage.removeItem('imageSelections');
    } catch (error) {
}
  };

  const onChangeProvider = newProvider => {
    const currentNormalizedProvider = normalizeProvider(provider);
    const newNormalizedProvider = normalizeProvider(newProvider);
    if (newNormalizedProvider !== currentNormalizedProvider) {
      // Set loading state for provider buttons
      setIsProviderLoading(true);
      isChangingProviderRef.current = true;

      // Cancel any pending operations
      if (isLoading) {
        safeSetIsLoading(false);
      }

      // Clear any pending timeouts
      if (providerChangeTimeoutRef.current) {
        clearTimeout(providerChangeTimeoutRef.current);
      }

      // Clear previous results immediately
      safeSetImages([]);
      setPage(1);
      currentPageRef.current = 1;
      safeSetHasMore(true);

      // Update provider state
      setProvider(newNormalizedProvider);

      // Create a function to load images for the new provider
      const loadImagesForProvider = specificProvider => {
        // Clear image cache
        setImageCache(new Map());

        // Use a promise to ensure operations complete in order
        const loadOperation = new Promise((resolve, reject) => {
          // Force a small delay before loading to ensure state updates are complete
          setTimeout(() => {
            if (searchPrompt && searchPrompt.length > 0) {
              getImagesByPrompt(specificProvider)
                .then(() => {
                  setIsProviderLoading(false);
                  isChangingProviderRef.current = false;
                  resolve();
                })
                .catch(error => {
                  setIsProviderLoading(false);
                  isChangingProviderRef.current = false;
                  reject(error);
                });
            } else {
              getImages(specificProvider)
                .then(() => {
                  setIsProviderLoading(false);
                  isChangingProviderRef.current = false;
                  resolve();
                })
                .catch(error => {
                  setIsProviderLoading(false);
                  isChangingProviderRef.current = false;
                  reject(error);
                });
            }
          }, 100); // Add a small delay to ensure state updates are complete
        });

        // After loading completes, reset the loading state
        loadOperation
          .then(() => {})
          .catch(error => {})
          .finally(() => {
            setIsProviderLoading(false);
            isChangingProviderRef.current = false;
          });
      };

      // Use a single timeout for the entire operation
      providerChangeTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) {
          isChangingProviderRef.current = false;
          return;
        }
        loadImagesForProvider(newNormalizedProvider);
      }, 100);
    }
  };

  // Add cleanup for the provider change timeout
  useEffect(() => {
    return () => {
      if (providerChangeTimeoutRef.current) {
        clearTimeout(providerChangeTimeoutRef.current);
      }
      window.isProviderChanging = false;
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Add a function to load more images that can be called by Masonic
  const loadMoreImages = useCallback(() => {
    if (hasMore && !isLoading) {

      setPage(prevPage => {
        const newPage = prevPage + 1;
        return newPage;
      });
    } 
  }, [hasMore, isLoading, page, images.length]);

  return {
    images,
    isLoading,
    page,
    search,
    onRateImg,
    onImageDownload,
    getImagesByPrompt,
    onChangeSearch,
    onChangeFilterSearch,
    onChangeFilters,
    onScopeImagesDownload,
    onToggleSelected,
    lastImageElementRef,
    selectedFilters,
    filter,
    onChangeUserSort,
    userSort,
    users,
    sort,
    resetFilters,
    checkIfSelected,
    clearSelections,
    provider,
    onChangeProvider,
    getSelectedGenerationImagesByStoryId,
    selections,
    isSidebarOpen,
    toggleSidebar,
    isProviderLoading,
    hasMore,
    loadMoreImages,
  };
};
