import { useId, useState } from 'react';

const EyeOpenIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="M12 5C6.4 5 2 9 1 12c1 3 5.4 7 11 7s10-4 11-7c-1-3-5.4-7-11-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-2.2a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z"
    />
  </svg>
);

const EyeClosedIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="currentColor"
      d="m2.7 3.9-1.4 1.4 3.1 3.1C2.8 9.6 1.6 10.9 1 12c1 3 5.4 7 11 7 2.3 0 4.4-.7 6.2-1.8l2.1 2.1 1.4-1.4L2.7 3.9ZM12 17c-4.1 0-7.4-2.7-8.7-5 0-.1.1-.2.2-.3 1.1-1.5 2.4-2.7 3.8-3.5l1.7 1.7a5 5 0 0 0 6 6l1.7 1.7c-1.4.7-3 .9-4.7.9Zm3.6-3.4a2.8 2.8 0 0 1-3.2-3.2l3.2 3.2ZM12 7a4.9 4.9 0 0 1 5 5c0 .6-.1 1.2-.3 1.8l1.6 1.6c2-1.4 3.5-3.2 4-4.4-1-3-5.4-7-11-7-1.6 0-3.1.3-4.5.9l1.7 1.7c.8-.4 1.7-.6 2.5-.6Z"
    />
  </svg>
);

const PasswordInput = ({
  wrapperClassName = '',
  inputClassName = '',
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  ...inputProps
}) => {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = inputProps.id || generatedId;
  const mergedInputClassName = [inputProps.className, inputClassName].filter(Boolean).join(' ');

  return (
    <div className={["password-input-wrapper", wrapperClassName].filter(Boolean).join(' ')}>
      <input
        {...inputProps}
        id={inputId}
        className={mergedInputClassName}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? hideLabel : showLabel}
        aria-controls={inputId}
        aria-pressed={visible}
      >
        {visible ? <EyeClosedIcon /> : <EyeOpenIcon />}
      </button>
    </div>
  );
};

export default PasswordInput;