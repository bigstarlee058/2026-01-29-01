import { useState, useEffect } from 'react';
import styles from './Tabs.module.scss';
import React from 'react'; // Added missing import for React.Fragment
import { useHorizontalScroll } from '../../../hooks/useHorizontalScroll';

const Tabs = ({
  tabs = [],
  onModeChange,
  tabName = 'galleryTab',
  defaultTab = null,
  activeTab: externalActiveTab = null, // New prop for external control
  classNameTabContainer,
  classNameTabs
}) => {
  const scrollContainerRef = useHorizontalScroll();
  
  const [internalActiveTab, setInternalActiveTab] = useState(() => {
    const savedTab = localStorage.getItem(tabName);
    if (savedTab && tabs.some(tab => tab.label === savedTab)) {
      return savedTab;
    }
    return defaultTab || (tabs.length > 0 ? tabs[0].label : '');
  });

  // Use external activeTab if provided, otherwise use internal state
  const activeTab = externalActiveTab !== null ? externalActiveTab : internalActiveTab;

  useEffect(() => {
    if (onModeChange && activeTab) {
      onModeChange(activeTab);
    }
  }, [activeTab]);


  const handleTabClick = (label, isActive, event) => {
    if (!isActive) return;
    
    if (externalActiveTab === null) {
      setInternalActiveTab(label);
      localStorage.setItem(tabName, label);
    }
    
    if (onModeChange) onModeChange(label);
    if (event && event.target && typeof event.target.blur === 'function') {
      event.target.blur();
    }
  };

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.tabContainer} ${classNameTabContainer}`} ref={scrollContainerRef}>
      <div className={`${styles.tabs} ${classNameTabs || ''}`}>
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.label}>
            <button
              className={`${styles.tab} ${
                activeTab === tab.label ? styles.active : ''
              }`}
              onClick={e => handleTabClick(tab.label, tab.active, e)}
              aria-pressed={activeTab === tab.label}
              disabled={!tab.active}
            >
              {tab.label}
            </button>
            {index < tabs.length - 1 && <div className={styles.tabDivider} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export { Tabs };
