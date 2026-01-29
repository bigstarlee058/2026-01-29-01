import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { user } from '../redux/auth';
import { rateImage } from 'utils/generations';
import { getPromptGenerations, getGenerations } from 'utils/generations';
import { downloadSingleImage } from 'utils/downloadImage';
import { saveAs } from 'file-saver';
import { useDebounce } from 'use-debounce';
import FileSaver from 'file-saver';
import { usersList } from 'utils/users';
import { getPixabayImages } from '../utils/pixabay';
import JSZip from 'jszip';

export const useVirtuosoImages = (columns, initialProvider = 'leonardo') => {
  const [allImages, setAllImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [sort, setSort] = useState('Liked images');
  const [userSort, setUserSort] = useState('All Users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selections, setSelections] = useState(() => {
    const savedSelections = localStorage.getItem('imageSelections');
    return savedSelections ? JSON.parse(savedSelections) : [];
  });
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { username } = useSelector(user);
  const [searchPrompt] = useDebounce(search, 500);
  const [users, setUsers] = useState([]);
  const [userSearch] = useDebounce(userSort, 500);
  const [provider, setProvider] = useState(initialProvider);
  const [debouncedProvider] = useDebounce(provider, 300);

  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const cacheRef = useRef(new Map());
  const currentPageRef = useRef(1);
  const lastRequestIdRef = useRef(0);

  // Normalize provider name
  const normalizeProvider = useCallback(providerName => {
    if (!providerName) return 'leonardo';
    return String(providerName).toLowerCase();
  }, []);

  // Create sort string for API
  const onSortValueCheck = useCallback((filter, userSort) => {
    let sortString = '';

    if (filter === 'Most liked') {
      sortString += '&sort=likes';
    } else if (filter === 'Most disliked') {
      sortString += '&sort=dislikes';
    } else if (filter === 'Newest') {
      sortString += '&sort=newest';
    } else if (filter === 'Oldest') {
      sortString += '&sort=oldest';
    }

    if (userSort && userSort !== 'All Users') {
      sortString += `&user=${encodeURIComponent(userSort)}`;
    }

    return sortString;
  }, []);

  // Reset images when search/filter changes
  const resetImages = useCallback(() => {
    setAllImages([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(false);
    loadingRef.current = false;
    currentPageRef.current = 1;
    // Clear cache when resetting
    cacheRef.current.clear();
  }, []);

  // Optimized fetch function with request cancellation
  const fetchImages = useCallback(
    async (pageToLoad = 1, shouldReset = false, requestId = null) => {
      // If we have a request ID, check if it's still the latest
      if (requestId && requestId !== lastRequestIdRef.current) {
        return; // Cancel this request as it's outdated
      }

      if (loadingRef.current && currentPageRef.current === pageToLoad && !shouldReset) {
        return;
      }

      loadingRef.current = true;
      setIsLoading(true);

      try {
        const currentProvider = normalizeProvider(debouncedProvider);
        const sortString = onSortValueCheck(filter, userSort);
        
        // Calculate items per page based on columns
        const getItemsPerPage = (cols, provider) => {
          const baseItems = provider === 'pixabay' ? 24 : 20;
          
          // If columns not provided, use default
          if (!cols) {
            return baseItems;
          }
          
          if (cols <= 2) {
            return Math.floor(baseItems * 0.5); // 10-12 items for 1-2 columns
          } else if (cols === 3) {
            return Math.floor(baseItems * 0.75); // 15-18 items for 3 columns
          } else {
            return baseItems; // 20-24 items for 4+ columns
          }
        };
        
        const itemsPerPage = getItemsPerPage(columns, currentProvider);

        // Create cache key
        const cacheKey = `${currentProvider}-${searchPrompt}-${sortString}-${pageToLoad}-${columns || 'default'}`;
        
        // Check cache first
        if (cacheRef.current.has(cacheKey) && !shouldReset) {
          const cachedData = cacheRef.current.get(cacheKey);
          
          setAllImages(prevImages => {
            if (shouldReset || pageToLoad === 1) {
              return cachedData.images;
            }
            
            const existingIds = new Set(prevImages.map(img => img._id || img.url));
            const newImages = cachedData.images.filter(
              img => !existingIds.has(img._id || img.url)
            );
            
            return [...prevImages, ...newImages];
          });
          
          setHasMore(cachedData.hasMore);
          setIsLoading(false);
          loadingRef.current = false;
          return;
        }

        let response = [];
        let hasMoreItems = false;

        if (currentProvider === 'leonardo') {
          // Увеличиваем размер страницы для лучшей буферизации
          const enhancedItemsPerPage = itemsPerPage * 1.5; // 30 вместо 20
          
          if (searchPrompt && searchPrompt.trim().length > 0) {
            response = await getPromptGenerations({
              page: pageToLoad,
              limit: enhancedItemsPerPage,
              prompt: searchPrompt,
              sort: sortString,
            });
          } else {
            response = await getGenerations({
              page: pageToLoad,
              limit: enhancedItemsPerPage,
              sort: sortString,
            });
          }

          if (response && Array.isArray(response)) {
            const formattedImages = response.map(img => ({
              ...img,
              provider: 'leonardo',
            }));

            hasMoreItems = response.length === enhancedItemsPerPage;
            
            // Cache the result
            cacheRef.current.set(cacheKey, {
              images: formattedImages,
              hasMore: hasMoreItems
            });

            setAllImages(prevImages => {
              if (shouldReset || pageToLoad === 1) {
                return formattedImages;
              }

              const existingIds = new Set(prevImages.map(img => img._id || img.url));
              const newImages = formattedImages.filter(
                img => !existingIds.has(img._id || img.url)
              );

              return [...prevImages, ...newImages];
            });

            setHasMore(hasMoreItems);
          } else {
            setHasMore(false);
          }
        } else if (currentProvider === 'pixabay') {
          // Увеличиваем размер страницы для Pixabay тоже
          const enhancedItemsPerPage = Math.min(itemsPerPage * 1.5, 200); // Максимум 200 для Pixabay API
          
          const pixabayResponse = await getPixabayImages({
            q: searchPrompt || 'nature',
            page: pageToLoad,
            per_page: enhancedItemsPerPage,
          });

          if (
            pixabayResponse &&
            pixabayResponse.images &&
            Array.isArray(pixabayResponse.images)
          ) {
            const formattedImages = pixabayResponse.images.map(img => ({
              _id: img.id.toString(),
              url: img.largeImageURL,
              minUrl: img.webformatURL,
              likes: [img.likes],
              dislikes: [],
              provider: 'pixabay',
              imageWidth: img.imageWidth,
              imageHeight: img.imageHeight,
            }));

            hasMoreItems = pixabayResponse.images.length === enhancedItemsPerPage;
            
            // Cache the result
            cacheRef.current.set(cacheKey, {
              images: formattedImages,
              hasMore: hasMoreItems
            });

            setAllImages(prevImages => {
              if (shouldReset || pageToLoad === 1) {
                return formattedImages;
              }

              const existingIds = new Set(prevImages.map(img => img._id || img.url));
              const newImages = formattedImages.filter(
                img => !existingIds.has(img._id || img.url)
              );

              return [...prevImages, ...newImages];
            });

            setHasMore(hasMoreItems);
          } else {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        if (shouldReset || pageToLoad === 1) {
          setAllImages([]);
        }
        setHasMore(false);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [
      searchPrompt,
      filter,
      userSort,
      debouncedProvider,
      normalizeProvider,
      onSortValueCheck,
      columns,
    ]
  );

  // Optimized load more function for Virtuoso
  const loadMoreImages = useCallback(async () => {
    if (!hasMore || loadingRef.current) {
      return Promise.resolve();
    }

    const nextPage = page + 1;
    const requestId = ++lastRequestIdRef.current;
    
    setPage(nextPage);
    currentPageRef.current = nextPage;

    return fetchImages(nextPage, false, requestId);
  }, [hasMore, page, fetchImages]);

  // Initial load and when search/filter changes
  useEffect(() => {
    const requestId = ++lastRequestIdRef.current;
    resetImages();
    fetchImages(1, true, requestId);
  }, [searchPrompt, filter, userSort, debouncedProvider, resetImages, fetchImages]);

  // Get users list
  useEffect(() => {
    const getUsers = async () => {
      try {
        const usersData = await usersList({ search: userSearch });
        setUsers(usersData || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      }
    };

    getUsers();
  }, [userSearch]);

  // Update provider when initialProvider changes
  useEffect(() => {
    setProvider(initialProvider);
  }, [initialProvider]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Rate image function - optimized to prevent re-renders
  const onRateImg = useCallback(
    async (imageId, action, imageUrl) => {
      try {
        const response = await rateImage({
          imageId,
          action,
          username,
          url: imageUrl,
        });

        if (response) {
          setAllImages(prevImages =>
            prevImages.map(img => {
              if (img._id === imageId || img.url === imageUrl) {
                const updatedImg = { ...img };
                if (action === 'like') {
                  updatedImg.likes = response.likes || [];
                } else if (action === 'dislike') {
                  updatedImg.dislikes = response.dislikes || [];
                }
                return updatedImg;
              }
              return img;
            })
          );
        }
      } catch (error) {
        console.error('Error rating image:', error);
      }
    },
    [username]
  );

  // Download single image
  const onImageDownload = useCallback(async (imageUrl, imageName) => {
    try {
      const result = await downloadSingleImage({ image: imageUrl });
      saveAs(result, `${imageName || 'generated'}.jpg`);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  }, []);

  // Download multiple images
  const onScopeImagesDownload = useCallback(async () => {
    if (selections.length === 0) return;

    try {
      setIsDownloaded(false);
      const zip = new JSZip();

      for (let i = 0; i < selections.length; i++) {
        const image = selections[i];
        const result = await downloadSingleImage({
          image: image.googleCloudUrl || image.url,
        });
        zip.file(`image_${i + 1}.jpg`, result);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      FileSaver.saveAs(content, 'selected_images.zip');
      setIsDownloaded(true);
    } catch (error) {
      console.error('Error downloading images:', error);
    }
  }, [selections]);

  // Toggle image selection
  const onToggleSelected = useCallback(
    imageUrl => {
      setSelections(prevSelections => {
        const isSelected = prevSelections.some(item => item.url === imageUrl);
        let newSelections;

        if (isSelected) {
          newSelections = prevSelections.filter(item => item.url !== imageUrl);
        } else {
          const imageToAdd = allImages.find(img => img.url === imageUrl);
          if (imageToAdd) {
            newSelections = [...prevSelections, imageToAdd];
          } else {
            newSelections = prevSelections;
          }
        }

        localStorage.setItem('imageSelections', JSON.stringify(newSelections));
        return newSelections;
      });
    },
    [allImages]
  );

  // Check if image is selected
  const checkIfSelected = useCallback(
    imageUrl => {
      return selections.some(item => item.url === imageUrl);
    },
    [selections]
  );

  // Change search
  const onChangeSearch = useCallback(newSearch => {
    setSearch(newSearch);
  }, []);

  // Change filter search
  const onChangeFilterSearch = useCallback(value => {
    setSearch(value);
  }, []);

  // Change filters
  const onChangeFilters = useCallback(newFilter => {
    setFilter(newFilter);
  }, []);

  // Change user sort
  const onChangeUserSort = useCallback(newUserSort => {
    setUserSort(newUserSort);
  }, []);

  // Check user sort value
  const onUserSortValueCheck = useCallback(
    value => {
      return userSort === value;
    },
    [userSort]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilter('');
    setUserSort('All Users');
    setSelectedFilters([]);
  }, []);

  // Change provider
  const onChangeProvider = useCallback(newProvider => {
    setProvider(newProvider);
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Get images by prompt (for compatibility)
  const getImagesByPrompt = useCallback(() => {
    const requestId = ++lastRequestIdRef.current;
    resetImages();
    fetchImages(1, true, requestId);
  }, [resetImages, fetchImages]);

  // Clear cache function for external use
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      images: allImages,
      isLoading,
      onRateImg,
      onImageDownload,
      getImagesByPrompt,
      onChangeSearch,
      onChangeFilterSearch,
      onChangeFilters,
      onScopeImagesDownload,
      onToggleSelected,
      selectedFilters,
      filter,
      onChangeUserSort,
      userSort,
      onUserSortValueCheck,
      users,
      sort,
      resetFilters,
      checkIfSelected,
      provider,
      onChangeProvider,
      isSidebarOpen,
      toggleSidebar,
      hasMore,
      loadMoreImages,
      clearCache,
    }),
    [
      allImages,
      isLoading,
      onRateImg,
      onImageDownload,
      getImagesByPrompt,
      onChangeSearch,
      onChangeFilterSearch,
      onChangeFilters,
      onScopeImagesDownload,
      onToggleSelected,
      selectedFilters,
      filter,
      onChangeUserSort,
      userSort,
      onUserSortValueCheck,
      users,
      sort,
      resetFilters,
      checkIfSelected,
      provider,
      onChangeProvider,
      isSidebarOpen,
      toggleSidebar,
      hasMore,
      loadMoreImages,
      clearCache,
    ]
  );
};