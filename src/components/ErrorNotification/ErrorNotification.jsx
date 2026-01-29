import React, { useEffect, useState } from 'react';
import './ErrorNotification.scss';
import ErrorNotificationIcon from 'components/Icons/ErrorNotificationIcon';
import InfoPossitiveIcon from 'components/Icons/InfoPossitiveIcon';
import DonePoossitiveIcon from 'components/Icons/DonePoossitiveIcon';
import InfoNeutralIcon from 'components/Icons/InfoNeutralIcon';
import CloseIcon from 'components/Icons/CloseIcon';

const ErrorNotification = ({ 
  message, 
  description = '',
  type = 'info-negative',
  onClose, 
  className = '',
  showCloseButton = true,
  duration = 3000,
  onOutsideClick = true
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  const handleOutsideClick = (e) => {
    if (onOutsideClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  const getIconComponent = () => {
    switch (type) {
      case 'info-positive':
        return <InfoPossitiveIcon color="var(--accent-color)" className="error-notification__error-icon" />;
      case 'info-negative':
        return <ErrorNotificationIcon color="var(--accent-color)" className="error-notification__error-icon" />;
      case 'done-positive':
        return <DonePoossitiveIcon color="var(--accent-color)" className="error-notification__error-icon" />;
      case 'info-neutral':
        return <InfoNeutralIcon color="var(--accent-color)" className="error-notification__error-icon" />;
      default:
        return <ErrorNotificationIcon color="var(--accent-color)" className="error-notification__error-icon" />;
    }
  };

  return (
    <div 
      className={`error-notification ${className} ${isClosing ? 'error-notification--closing' : ''}`}
      onClick={handleOutsideClick}
    >
      <div className="error-notification__indicator"></div>
      <div className="error-notification__right-indicator">
        {getIconComponent()}
      </div>
      <div className="error-notification__text-container">
        <span className="error-notification__text">
          {message}
        </span>
        {description && (
          <span className="error-notification__error-text">
            {description}
          </span>
        )}
      </div>
      {showCloseButton && (
        <div className="error-notification__close-button" onClick={handleClose}>
          <CloseIcon size="6px" color="rgba(255, 255, 255, 0.4)" />
        </div>
      )}
    </div>
  );
};

export default ErrorNotification;
