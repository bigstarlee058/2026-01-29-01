import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { IoCloudDoneOutline, IoCloudOutline } from "react-icons/io5";
import { Tooltip } from 'react-tooltip';
import {
  selectSyncStatus,
  selectHasUnsavedChanges,
  selectLastSyncTime,
  selectSyncError,
} from '../../redux/sync/syncSlice';
import styles from './SyncIndicator.module.scss';

const SyncIndicator = () => {
  const status = useSelector(selectSyncStatus);
  const hasUnsavedChanges = useSelector(selectHasUnsavedChanges);
  const lastSyncTime = useSelector(selectLastSyncTime);
  const errorMessage = useSelector(selectSyncError);
  
  const tooltipId = useRef(`sync-tooltip-${Math.random().toString(36).substr(2, 9)}`).current;

  const getStatusInfo = () => {
    switch (status) {
      case 'synced':
        return {
          icon: IoCloudDoneOutline,
          tooltipText: 'All changes saved',
          className: styles.synced,
        };
      case 'pending':
        return {
          icon: IoCloudOutline,
          tooltipText: 'Saving...',
          className: styles.pending,
        };
      case 'syncing':
        return {
          icon: IoCloudOutline,
          tooltipText: 'Syncing changes...',
          className: styles.syncing,
        };
      case 'error':
        return {
          icon: IoCloudOutline,
          tooltipText: errorMessage || 'Sync failed',
          className: styles.error,
        };
      default:
        return {
          icon: IoCloudOutline,
          tooltipText: 'Unknown status',
          className: styles.unknown,
        };
    }
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return '';
    
    const now = Date.now();
    const diff = now - lastSyncTime;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
  };

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  const getTooltipContent = () => {
    let tooltipText = statusInfo.tooltipText;
    
    if (status === 'synced' && lastSyncTime) {
      tooltipText += ` • ${formatLastSyncTime()}`;
    }
    
    return tooltipText;
  };

  return (
    <>
      <div 
        className={`${styles.syncIndicator} ${statusInfo.className}`}
        data-tooltip-id={tooltipId}
        data-tooltip-content={getTooltipContent()}
      >
        <IconComponent size={16} />
        {hasUnsavedChanges && status === 'synced' && (
          <span className={styles.unsaved}>•</span>
        )}
      </div>
      
      <Tooltip
        id={tooltipId}
        place="top"
        delayShow={200}
        delayHide={100}
        noArrow={false}
        border="1px solid #FFFFFF1A"
        style={{
          backgroundColor: '#131A25',
          color: 'white',
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 100000,
        }}
      />
    </>
  );
};

export default SyncIndicator;