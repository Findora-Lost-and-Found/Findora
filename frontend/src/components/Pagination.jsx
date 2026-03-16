import { useMemo } from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index),
    [totalPages]
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-controls">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
        disabled={currentPage === 0}
      >
        Previous
      </button>

      {pageNumbers.map((pageIndex) => (
        <button
          key={pageIndex}
          type="button"
          onClick={() => onPageChange(pageIndex)}
          disabled={pageIndex === currentPage}
        >
          {pageIndex + 1}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
        disabled={currentPage >= totalPages - 1}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;