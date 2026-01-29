import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CustomCheckbox } from 'components/reusableComponents/CustomCheckbox/CustomCheckbox';
import { LottieLoader } from 'components/reusableComponents/LottieLoader/LottieLoader';
import { ButtonWithIcon } from 'components/reusableComponents/ButtonWithIcon';
import PropTypes from 'prop-types';
import styles from './DataTable.module.scss';
import { DataTableRow } from './DataTableRow';
import { UploadingRow } from './UploadingRow';

const DataTable = ({
  data = [],
  columns = [],
  isLoading = false,
  onSelectionChange,
  onRowClick,
  className = '',
  emptyMessage = 'No items found',
  selectable = true,
  sortable = false,
  onSort,
  sortColumn = null,
  sortDirection = 'asc',
  showSearch = false,
  searchPlaceholder = 'Search',
  searchKey = 'title', // Default search key for the name column
  searchFilters = false,
  filterOptions = [], // Custom filter options
  onFilterChange, // Filter change callback
  activeFilter = 'All', // Active filter state
  onRowMouseEnter, // Row mouse enter handler
  onRowMouseLeave, // Row mouse leave handler
  linkInputComponent, // Custom link input component to show after thead
  progressData = {}, // Progress data for uploading items
  isSmallVideoPlaceholder = false,
  // Infinite scroll props
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  infiniteScrollDistance = 400, // Distance from bottom to trigger load more
  showTableHeader = true,
  showCheckbox = true,
  searchContainerMarginLeft = 4,
  hoveredRowId = null, // ID of currently hovered row
  onCancelUpload, // optional: cancel handler for uploading rows
  onRowContextMenu, // optional: context menu handler for rows
  rowWrapper, // optional: function to wrap rows for drag-and-drop or other functionality
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [checkedStates, setCheckedStates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const tableContainerRef = useRef(null);
  const loadingRef = useRef(false);

  // Memoize filtered data for better performance
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {
      return data;
    }
    
    return data.filter(item => {
      // Try multiple possible fields for the search
      const searchValue =
        item[searchKey] || item.title || item.name || item.filename || '';
      return searchValue.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, searchKey]);

  // Reset checked states when filtered data changes
  useEffect(() => {
    setCheckedStates(new Array(filteredData.length).fill(false));
    setSelectedItems([]);
  }, [filteredData]);

  // Handle infinite scroll
  const handleScroll = useCallback(
    event => {
      if (!hasMore || !onLoadMore || isLoadingMore || loadingRef.current)
        return;

      const container = event.target;
      const scrollHeight = container.scrollHeight;
      const scrollTop = container.scrollTop;
      const clientHeight = container.clientHeight;

      // Calculate remaining scroll distance
      const remainingScroll = scrollHeight - scrollTop - clientHeight;

      // Load more when user scrolls near bottom
      if (remainingScroll < infiniteScrollDistance) {
        loadingRef.current = true;
        onLoadMore()
          .catch(error => {
            console.error('Error loading more items:', error);
          })
          .finally(() => {
            loadingRef.current = false;
          });
      }
    },
    [hasMore, onLoadMore, isLoadingMore, infiniteScrollDistance]
  );

  // Add scroll event listener for infinite scroll
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container || !hasMore || !onLoadMore) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, hasMore, onLoadMore]);

  const toggleCheckbox = index => {
    const newStates = [...checkedStates];
    newStates[index] = !newStates[index];
    setCheckedStates(newStates);

    const selectedData = filteredData.filter((_, i) => newStates[i]);
    setSelectedItems(selectedData);

    if (onSelectionChange) {
      onSelectionChange(selectedData);
    }
  };

  const toggleAllCheckboxes = () => {
    const allChecked = checkedStates.every(state => state);
    const newStates = new Array(filteredData.length).fill(!allChecked);
    setCheckedStates(newStates);

    const selectedData = allChecked ? [] : [...filteredData];
    setSelectedItems(selectedData);

    if (onSelectionChange) {
      onSelectionChange(selectedData);
    }
  };

  const isAllChecked = checkedStates.every(state => state);
  const isIndeterminate = checkedStates.some(state => state) && !isAllChecked;

  // Define event handlers before using them in useMemo dependencies
  const handleRowClick = useCallback((item, index) => {
    if (onRowClick) {
      onRowClick(item, index);
    }
  }, [onRowClick]);

  const handleRowMouseEnter = useCallback((item) => {
    if (onRowMouseEnter) {
      onRowMouseEnter(item.id);
    }
  }, [onRowMouseEnter]);

  const handleRowMouseLeave = useCallback(() => {
    if (onRowMouseLeave) {
      onRowMouseLeave();
    }
  }, [onRowMouseLeave]);

  // Memoize rendered rows to prevent recreation on every render
  const renderedRows = useMemo(() => {
    return filteredData.map((item, itemIndex) => {
      const itemProgress = progressData[item.id];
      const isUploading = itemProgress && itemProgress.progress < 100;

      // If this is an uploading item, use UploadingRow component
      if (isUploading) {
        const uploadingRowElement = (
          <UploadingRow
            key={item.id || itemIndex}
            item={item}
            itemIndex={itemIndex}
            columns={columns}
            itemProgress={itemProgress}
            isSmallVideoPlaceholder={isSmallVideoPlaceholder}
            selectable={selectable}
            showCheckbox={showCheckbox}
            checkedStates={checkedStates}
            toggleCheckbox={toggleCheckbox}
            onCancelUpload={onCancelUpload}
          />
        );

        // Wrap with rowWrapper if provided
        return rowWrapper ? rowWrapper(item, uploadingRowElement) : uploadingRowElement;
      }

      // Regular row rendering using DataTableRow component
      const regularRowElement = (
        <DataTableRow
          key={item.id || itemIndex}
          item={item}
          itemIndex={itemIndex}
          columns={columns}
          selectable={selectable}
          showCheckbox={showCheckbox}
          checkedStates={checkedStates}
          toggleCheckbox={toggleCheckbox}
          hoveredRowId={hoveredRowId}
          onRowClick={handleRowClick}
          onRowMouseEnter={handleRowMouseEnter}
          onRowMouseLeave={handleRowMouseLeave}
          onRowContextMenu={onRowContextMenu}
        />
      );

      // Wrap with rowWrapper if provided
      return rowWrapper ? rowWrapper(item, regularRowElement) : regularRowElement;
    });
  }, [
    filteredData,
    progressData,
    columns,
    isSmallVideoPlaceholder,
    selectable,
    showCheckbox,
    checkedStates,
    toggleCheckbox,
    onCancelUpload,
    rowWrapper,
    hoveredRowId,
    handleRowClick,
    handleRowMouseEnter,
    handleRowMouseLeave,
    onRowContextMenu,
  ]);

  const handleSort = columnKey => {
    if (sortable && onSort) {
      const newDirection =
        sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnKey, newDirection);
    }
  };

  const handleSearchChange = e => {
    const value = e.currentTarget.value;
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterClick = filter => {
    if (onFilterChange) {
      onFilterChange(filter);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <LottieLoader />
      </div>
    );
  }

  return (
    <div className={styles.table_wrapper}>
      {showSearch && (
        <div className={styles.search_container_wrapper}>
          <div className={styles.search_container} style={{ marginLeft: `${searchContainerMarginLeft}px` }}>
            <div className={styles.search_form}>
              <ButtonWithIcon
                icon="SearchIcon"
                size="15px"
                color="rgba(255, 255, 255, 0.32)"
                accentColor="#FFFFFFB2"
                activeColor="white"
                classNameButton={styles.search_btn}
                classNameIcon={styles.search_icon}
                onClick={e => e.preventDefault()}
              />
              <input
                placeholder={searchPlaceholder}
                onChange={handleSearchChange}
                value={searchTerm}
                className={styles.search_input}
              />
            </div>
          </div>

          {searchFilters && (
            <div className={styles.search_filters} style={{ marginLeft: `${searchContainerMarginLeft}px` }}>
              {filterOptions.length > 0
                ? filterOptions.map((filter, index) => (
                    <div
                      key={index}
                      className={`${styles.search_filters_item} ${
                        activeFilter === filter ? styles.active : ''
                      }`}
                      onClick={() => handleFilterClick(filter)}
                    >
                      {filter}
                    </div>
                  ))
                : null}
            </div>
          )}
        </div>
      )}

      <div
        className={`${styles.table_container} ${className}`}
        ref={tableContainerRef}
      >
        {linkInputComponent && (
          <div className={styles.link_input_container}>
            {linkInputComponent}
          </div>
        )}

        <table className={styles.table}>
          {showTableHeader && (
            <thead>
              <tr className={styles.header_row}>
                {selectable && showCheckbox && (
                  <th className={`${styles.col_title} ${styles.col_checkbox}`}>
                    <CustomCheckbox
                      checked={isAllChecked}
                      onChange={toggleAllCheckboxes}
                      indeterminate={isIndeterminate}
                    />
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`${styles.col_title} ${
                      styles[`col_${col.key}`]
                    } ${
                      sortable && col.sortable !== false ? styles.sortable : ''
                    } ${col.className || ''}`}
                    onClick={() =>
                      sortable && col.sortable !== false
                        ? handleSort(col.key)
                        : null
                    }
                  >
                    <div className={styles.header_content}>
                      {col.label}
                      {sortable &&
                        col.sortable !== false &&
                        sortColumn === col.key && (
                          <span className={styles.sort_indicator}>
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}

          <tbody>
            {filteredData.length === 0 ? (
              <tr className={styles.empty_row}>
                <td
                  colSpan={columns.length + (selectable && showCheckbox ? 1 : 0)}
                  className={styles.empty_cell}
                >
                  {searchTerm
                    ? 'No items found matching your search'
                    : emptyMessage}
                </td>
              </tr>
            ) : (
              renderedRows
            )}
          </tbody>
        </table>
      </div>

      {/* Loading indicator for infinite scroll */}
      {isLoadingMore && hasMore && (
        <div className={styles.infinite_loading}>
          <div className={styles.loading_dots}>
            <div className={styles.loading_dot}></div>
            <div className={styles.loading_dot}></div>
            <div className={styles.loading_dot}></div>
          </div>
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
};

DataTable.propTypes = {
  data: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      render: PropTypes.func,
      sortable: PropTypes.bool,
      className: PropTypes.string, // Add className prop for columns
    })
  ),
  isLoading: PropTypes.bool,
  onSelectionChange: PropTypes.func,
  onRowClick: PropTypes.func,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  selectable: PropTypes.bool,
  sortable: PropTypes.bool,
  onSort: PropTypes.func,
  sortColumn: PropTypes.string,
  sortDirection: PropTypes.oneOf(['asc', 'desc']),
  paddings: PropTypes.oneOf(['small', 'medium']),
  showSearch: PropTypes.bool,
  searchPlaceholder: PropTypes.string,
  searchKey: PropTypes.string,
  filterOptions: PropTypes.array,
  onFilterChange: PropTypes.func,
  activeFilter: PropTypes.string,
  onRowMouseEnter: PropTypes.func,
  onRowMouseLeave: PropTypes.func,
  linkInputComponent: PropTypes.node,
  progressData: PropTypes.object,
  isSmallVideoPlaceholder: PropTypes.bool,
  hoveredRowId: PropTypes.string,
  // Infinite scroll props
  hasMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
  isLoadingMore: PropTypes.bool,
  infiniteScrollDistance: PropTypes.number,
  onCancelUpload: PropTypes.func,
  onRowContextMenu: PropTypes.func,
  rowWrapper: PropTypes.func,
};

export { DataTable };
