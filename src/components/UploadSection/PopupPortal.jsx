import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PopupPortal = ({ children }) => {
  const [portalElement, setPortalElement] = useState(null);

  useEffect(() => {
    const element = document.createElement('div');
    element.className = 'popup-portal';
    document.body.appendChild(element);

    setPortalElement(element);

    // Cleanup function to remove the element when component unmounts
    return () => {
      document.body.removeChild(element);
    };
  }, []);

  // Only render the portal when the element is available
  if (!portalElement) return null;

  return createPortal(children, portalElement);
};

export { PopupPortal };
