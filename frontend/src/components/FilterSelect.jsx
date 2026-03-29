import { useEffect, useMemo, useRef, useState } from 'react';

const FilterSelect = ({
  name,
  value,
  onChange,
  options,
  ariaLabel,
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const selectedOption = useMemo(() => {
    return options.find((option) => String(option.value) === String(value)) || options[0];
  }, [options, value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (nextValue) => {
    onChange({ target: { name, value: nextValue } });
    setOpen(false);
  };

  return (
    <div className={`filter-select ${className}`.trim()} ref={wrapperRef}>
      <button
        type="button"
        className="filter-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || name}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="filter-select-value">{selectedOption?.label || ''}</span>
        <span className="filter-select-arrow" aria-hidden="true" />
      </button>

      {open && (
        <div className="filter-select-menu" role="listbox" aria-label={ariaLabel || name}>
          {options.map((option) => {
            const isActive = String(option.value) === String(value);
            return (
              <button
                key={`${name}-${option.value}`}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`filter-select-option${isActive ? ' is-active' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FilterSelect;
