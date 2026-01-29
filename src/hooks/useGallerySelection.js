import { useState } from 'react';

export const useGallerySelection = (isMultiSelect = true) => {
  const [selections, setSelections] = useState([]);

  const onToggleSelected = imageData => {


    setSelections(prevSelections => {
      const isSelected = prevSelections.some(
        item => item.url === imageData.url
      );

      if (isSelected) {
        // In single-select mode, don't allow deselection
        if (!isMultiSelect) {
          return prevSelections;
        }
        return prevSelections.filter(item => item.url !== imageData.url);
      } else {
        // If single select mode, replace the entire selection
        const newSelections = isMultiSelect
          ? [...prevSelections, imageData]
          : [imageData];
        return newSelections;
      }
    });
  };

  const checkIfSelected = id => {
    return selections.find(item => item._id === id);
  };

  const clearSelections = () => {
    setSelections([]);
  };

  return {
    selections,
    onToggleSelected,
    checkIfSelected,
    clearSelections,
  };
};
