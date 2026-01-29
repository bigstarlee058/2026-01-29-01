import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useDebounce } from 'use-debounce';
import { getPixabayVideos } from '../utils/pixabay';
import { user } from '../redux/auth';

export const useVideos = () => {
  const [allVideos, setAllVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [order, setOrder] = useState('popular');
  const [provider, setProvider] = useState('pixabay');

  const { username } = useSelector(user);
  const [searchPrompt] = useDebounce(search, 500);
  const [debouncedProvider] = useDebounce(provider, 300);

  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);
  const currentPageRef = useRef(1);

  // Reset videos when search/order changes
  const resetVideos = useCallback(() => {
    setAllVideos([]);
    setPage(1);
    setHasMore(true);
    setIsLoading(false);
    loadingRef.current = false;
    currentPageRef.current = 1;
  }, []);

  // Fetch videos function with pagination
  const fetchVideos = useCallback(
    async (pageToLoad = 1, shouldReset = false) => {
      if (loadingRef.current && currentPageRef.current === pageToLoad) return;

      loadingRef.current = true;
      setIsLoading(true);

      try {
        const itemsPerPage = 50;

        const response = await getPixabayVideos({
          q: searchPrompt || '', // Provide default search term if empty
          page: pageToLoad,
          per_page: itemsPerPage,
          order: order,
        });

        if (response && response.videos && Array.isArray(response.videos)) {
          const formattedVideos = response.videos
            .filter(video => video && typeof video === 'object') // Ensure each video is a valid object
            .map(video => ({
              ...video,
              provider: 'pixabay',
              // Ensure required fields exist
              id: video.id || video._id || Math.random().toString(),
              _id: video._id || video.id || Math.random().toString(),
            }));

          setAllVideos(prevVideos => {
            if (shouldReset || pageToLoad === 1) {
              return formattedVideos;
            }

            // Prevent duplicates when adding new videos
            const existingIds = new Set(
              prevVideos.map(video => video.id || video._id)
            );
            const newVideos = formattedVideos.filter(
              video => !existingIds.has(video.id || video._id)
            );

            return [...prevVideos, ...newVideos];
          });

          // Update hasMore based on response length
          setHasMore(response.videos.length === itemsPerPage);
        } else {
          setHasMore(false);
          if (shouldReset || pageToLoad === 1) {
            setAllVideos([]);
          }
        }
      } catch (error) {
        console.error('Error fetching videos:', error);
        if (shouldReset || pageToLoad === 1) {
          setAllVideos([]);
        }
        setHasMore(false);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [searchPrompt, order]
  );

  // Load more videos function for infinite scroll
  const loadMoreVideos = useCallback(async () => {
    if (!hasMore || loadingRef.current) {
      return;
    }

    const nextPage = page + 1;

    loadingRef.current = true;
    setIsLoading(true);
    setPage(nextPage);
    currentPageRef.current = nextPage;

    try {
      const itemsPerPage = 8;

      const response = await getPixabayVideos({
        q: searchPrompt || '', // Provide default search term if empty
        page: nextPage,
        per_page: itemsPerPage,
        order: order,
      });

      if (response && response.videos && Array.isArray(response.videos)) {
        const formattedVideos = response.videos
          .filter(video => video && typeof video === 'object') // Ensure each video is a valid object
          .map(video => ({
            ...video,
            provider: 'pixabay',
            // Ensure required fields exist
            id: video.id || video._id || Math.random().toString(),
            _id: video._id || video.id || Math.random().toString(),
          }));

        setAllVideos(prevVideos => {
          const existingIds = new Set(
            prevVideos.map(video => video.id || video._id)
          );

          const newVideos = formattedVideos.filter(
            video => !existingIds.has(video.id || video._id)
          );

          return [...prevVideos, ...newVideos];
        });

        const hasMoreItems = response.videos.length === itemsPerPage;
        setHasMore(hasMoreItems);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more videos:', error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [hasMore, page, searchPrompt, order]);

  // Initial load and when search/order changes
  useEffect(() => {
    resetVideos();
    fetchVideos(1, true);
  }, [searchPrompt, order]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Change search
  const onChangeSearch = useCallback(newSearch => {
    setSearch(newSearch);
  }, []);

  // Change order
  const onChangeOrder = useCallback(newOrder => {
    setOrder(newOrder);
  }, []);

  // Get videos by prompt (for compatibility)
  const getVideosByPrompt = useCallback(() => {
    resetVideos();
    fetchVideos(1, true);
  }, [resetVideos, fetchVideos]);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      videos: allVideos,
      isLoading,
      onChangeSearch,
      onChangeOrder,
      getVideosByPrompt,
      loadMoreVideos,
      hasMore,
      order,
      search,
    }),
    [
      allVideos,
      isLoading,
      onChangeSearch,
      onChangeOrder,
      getVideosByPrompt,
      loadMoreVideos,
      hasMore,
      order,
      search,
    ]
  );
};
