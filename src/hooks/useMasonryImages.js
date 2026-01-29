import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

export const useMasonryImages = () => {
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
  const [provider, setProvider] = useState('leonardo');
  const [debouncedProvider] = useDebounce(provider, 300);

  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const cacheRef = useRef(new Map());
  const currentPageRef = useRef(1);

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
  }, []);

  // Fetch images function with pagination
  const fetchImages = useCallback(
    async (pageToLoad = 1, shouldReset = false) => {
      if (loadingRef.current && currentPageRef.current === pageToLoad) return;

      loadingRef.current = true;
      setIsLoading(true);

      try {
        const currentProvider = normalizeProvider(debouncedProvider);
        const sortString = onSortValueCheck(filter, userSort);
        const itemsPerPage = 24;

        let response = [];

        if (currentProvider === 'leonardo') {
          if (searchPrompt && searchPrompt.trim().length > 0) {
            response = await getPromptGenerations({
              page: pageToLoad,
              limit: itemsPerPage,
              prompt: searchPrompt,
              sort: sortString,
            });
          } else {
            response = await getGenerations({
              page: pageToLoad,
              limit: itemsPerPage,
              sort: sortString,
            });
          }

          if (response && Array.isArray(response)) {
            const formattedImages = response.map(img => ({
              ...img,
              provider: 'leonardo',
            }));

            setAllImages(prevImages => {
              if (shouldReset || pageToLoad === 1) {
                return formattedImages;
              }

              // Prevent duplicates when adding new images
              const existingIds = new Set(
                prevImages.map(img => img._id || img.url)
              );
              const newImages = formattedImages.filter(
                img => !existingIds.has(img._id || img.url)
              );

              return [...prevImages, ...newImages];
            });

            // Update hasMore based on response length
            setHasMore(response.length === itemsPerPage);
          } else {
            setHasMore(false);
          }
        } else if (currentProvider === 'pixabay') {
          const pixabayResponse = await getPixabayImages({
            q: searchPrompt || 'nature',
            page: pageToLoad,
            per_page: itemsPerPage,
          });

          if (
            pixabayResponse &&
            pixabayResponse.images &&
            Array.isArray(pixabayResponse.images)
          ) {
            const formattedImages = pixabayResponse.images.map(img => ({
              _id: img.id.toString(),
              url: img.largeImageURL,
              minUrl: img.largeImageURL,
              likes: [img.likes], // Convert to array format to match Leonardo structure
              dislikes: [],
              provider: 'pixabay',
              imageWidth: img.imageWidth,
              imageHeight: img.imageHeight,
            }));

            setAllImages(prevImages => {
              if (shouldReset || pageToLoad === 1) {
                return formattedImages;
              }

              const existingIds = new Set(
                prevImages.map(img => img._id || img.url)
              );
              const newImages = formattedImages.filter(
                img => !existingIds.has(img._id || img.url)
              );

              return [...prevImages, ...newImages];
            });

            setHasMore(pixabayResponse.images.length === itemsPerPage);
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
    ]
  );

  // Load more images function for infinite scroll - updated to match useInfiniteLoader pattern
  const loadMoreImages = useCallback(
    async (startIndex, stopIndex, currentItems) => {
      if (!hasMore) {
        return;
      }

      // If loading is stuck, reset it (safety check)
      if (isLoading && !loadingRef.current) {
        setIsLoading(false);
      }

      if (loadingRef.current) {
        return;
      }

      // Simple page increment - same algorithm for both providers
      const nextPage = page + 1;

      loadingRef.current = true;
      setIsLoading(true);
      setPage(nextPage);
      currentPageRef.current = nextPage;

      try {
        const currentProvider = normalizeProvider(debouncedProvider);
        const itemsPerPage = currentProvider === 'pixabay' ? 24 : 20;
        const sortString = onSortValueCheck(filter, userSort);

        let response = [];

        if (currentProvider === 'leonardo') {
          if (searchPrompt && searchPrompt.trim().length > 0) {
            response = await getPromptGenerations({
              page: nextPage,
              limit: itemsPerPage,
              prompt: searchPrompt,
              sort: sortString,
            });
          } else {
            response = await getGenerations({
              page: nextPage,
              limit: itemsPerPage,
              sort: sortString,
            });
          }

          if (response && Array.isArray(response)) {
            const formattedImages = response.map(img => ({
              ...img,
              provider: 'leonardo',
            }));

            setAllImages(prevImages => {
              // Prevent duplicates when adding new images
              const existingIds = new Set(
                prevImages.map(img => img._id || img.url)
              );
              const newImages = formattedImages.filter(
                img => !existingIds.has(img._id || img.url)
              );

              return [...prevImages, ...newImages];
            });

            // Update hasMore based on response length
            const hasMoreItems = response.length === itemsPerPage;
            setHasMore(hasMoreItems);
          } else {
            setHasMore(false);
          }
        } else if (currentProvider === 'pixabay') {
          const pixabayResponse = await getPixabayImages({
            q: searchPrompt || 'nature',
            page: nextPage,
            per_page: itemsPerPage,
          });

          if (
            pixabayResponse &&
            pixabayResponse.images &&
            Array.isArray(pixabayResponse.images)
          ) {
            const formattedImages = pixabayResponse.images.map(img => ({
              _id: img.id.toString(),
              url: img.largeImageURL,
              minUrl: img.largeImageURL,
              likes: [img.likes], // Convert to array format to match Leonardo structure
              dislikes: [],
              provider: 'pixabay',
              imageWidth: img.imageWidth,
              imageHeight: img.imageHeight,
            }));

            setAllImages(prevImages => {
              const existingIds = new Set(
                prevImages.map(img => img._id || img.url)
              );

              const newImages = formattedImages.filter(
                img => !existingIds.has(img._id || img.url)
              );

              return [...prevImages, ...newImages];
            });

            const hasMoreItems = pixabayResponse.images.length === itemsPerPage;
            setHasMore(hasMoreItems);
          } else {
            setHasMore(false);
          }
        }
      } catch (error) {
        console.error('Error loading more images:', error);
        setHasMore(false);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [
      hasMore,
      isLoading,
      page,
      searchPrompt,
      filter,
      userSort,
      debouncedProvider,
      normalizeProvider,
      onSortValueCheck,
    ]
  );

  // Initial load and when search/filter changes
  useEffect(() => {
    resetImages();
    fetchImages(1, true);
  }, [searchPrompt, filter, userSort, debouncedProvider]);

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
    resetImages();
    fetchImages(1, true);
  }, [resetImages, fetchImages]);

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
    ]
  );
};
