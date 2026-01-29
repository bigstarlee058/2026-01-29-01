import React, { memo } from 'react';
import { CustomCheckbox } from '../CustomCheckbox/CustomCheckbox';
import styles from './DataTable.module.scss';

const DataTableRow = memo(({
  item,
  itemIndex,
  columns,
  selectable,
  showCheckbox,
  checkedStates,
  toggleCheckbox,
  hoveredRowId,
  onRowClick,
  onRowMouseEnter,
  onRowMouseLeave,
  onRowContextMenu,
}) => {
  const handleRowClick = () => {
    if (onRowClick) {
      onRowClick(item, itemIndex);
    }
  };

  const handleRowMouseEnter = () => {
    if (onRowMouseEnter) {
      onRowMouseEnter(item);
    }
  };

  return (
    <tr
      key={item.id || itemIndex}
      className={`${styles.item_row} ${
        hoveredRowId === item.id ? styles.hovered : ''
      }`}
      onClick={handleRowClick}
      onMouseEnter={handleRowMouseEnter}
      onMouseLeave={onRowMouseLeave}
      onContextMenu={(e) => onRowContextMenu && onRowContextMenu(e, item, itemIndex)}
    >
      {selectable && showCheckbox && (
        <td className={`${styles.row_content} ${styles.col_checkbox}`}>
          <CustomCheckbox
            checked={checkedStates[itemIndex]}
            onChange={() => toggleCheckbox(itemIndex)}
            onClick={e => e.stopPropagation()}
          />
        </td>
      )}
      {columns.map((col) => (
        <td
          key={col.key}
          className={`${styles.row_content} ${styles[`col_${col.key}`]} ${
            col.className || ''
          }`}
        >
          {col.render
            ? col.render(item, null, null, itemIndex)
            : item[col.key]}
        </td>
      ))}
    </tr>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.checkedStates[prevProps.itemIndex] === nextProps.checkedStates[nextProps.itemIndex] &&
    prevProps.hoveredRowId === nextProps.hoveredRowId &&
    (prevProps.hoveredRowId !== prevProps.item.id && nextProps.hoveredRowId !== nextProps.item.id)
  );
});

DataTableRow.displayName = 'DataTableRow';

export { DataTableRow };