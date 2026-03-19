import { useMemo } from 'react';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index),
    [totalPages]
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination-wrap" aria-label="Pagination Navigation">
      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(Math.max(currentPage - 1, 0))}
        disabled={currentPage === 0}
        aria-label="Previous page"
      >
        <span className="pagination-icon" aria-hidden="true">
          &larr;
        </span>
        <span>Previous</span>
      </button>

      {pageNumbers.map((pageIndex) => (
        <button
          key={pageIndex}
          type="button"
          className={`pagination-btn pagination-number ${pageIndex === currentPage ? 'is-active' : ''}`}
          onClick={() => onPageChange(pageIndex)}
          aria-current={pageIndex === currentPage ? 'page' : undefined}
        >
          {pageIndex + 1}
        </button>
      ))}

      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages - 1))}
        disabled={currentPage >= totalPages - 1}
        aria-label="Next page"
      >
        <span>Next</span>
        <span className="pagination-icon" aria-hidden="true">
          &rarr;
        </span>
      </button>
    </nav>
  );
};

export default Pagination;