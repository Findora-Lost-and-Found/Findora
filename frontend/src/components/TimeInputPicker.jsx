import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './TimeInputPicker.css';

const pad2 = (value) => String(value).padStart(2, '0');

const parse24Time = (value) => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

const to12HourParts = (value) => {
  const parsed = parse24Time(value);
  if (!parsed) {
    return { hour12: '12', minute: '00', meridiem: 'AM' };
  }

  const meridiem = parsed.hour >= 12 ? 'PM' : 'AM';
  const hour12Number = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return { hour12: pad2(hour12Number), minute: pad2(parsed.minute), meridiem };
};

const to24HourString = (hour12, minute, meridiem) => {
  const parsedHour = Number(hour12);
  const parsedMinute = Number(minute);

  if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinute)) {
    return '';
  }

  const safeHour12 = Math.min(12, Math.max(1, parsedHour));
  const safeMinute = Math.min(59, Math.max(0, parsedMinute));

  let hour24 = safeHour12 % 12;
  if (String(meridiem).toUpperCase() === 'PM') {
    hour24 += 12;
  }

  return `${pad2(hour24)}:${pad2(safeMinute)}`;
};

const toMinutes = (value) => {
  const parsed = parse24Time(value);
  if (!parsed) {
    return -1;
  }
  return (parsed.hour * 60) + parsed.minute;
};

const sanitizePart = (raw, maxLen) => String(raw || '').replace(/\D/g, '').slice(0, maxLen);

const TimeInputPicker = ({
  value,
  onChange,
  maxTime,
  placeholder = '--:-- --',
  disabled = false
}) => {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0 });
  const [draftHour, setDraftHour] = useState('12');
  const [draftMinute, setDraftMinute] = useState('00');
  const [draftMeridiem, setDraftMeridiem] = useState('AM');

  const syncFromValue = () => {
    const next = to12HourParts(value);
    setDraftHour(next.hour12);
    setDraftMinute(next.minute);
    setDraftMeridiem(next.meridiem);
  };

  useEffect(() => {
    if (!open) {
      syncFromValue();
    }
  }, [value, open]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const clickedInsideTrigger = rootRef.current && rootRef.current.contains(event.target);
      const clickedInsidePanel = panelRef.current && panelRef.current.contains(event.target);
      if (!clickedInsideTrigger && !clickedInsidePanel) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect();
      const panelEl = panelRef.current;
      if (!triggerRect || !panelEl) {
        return;
      }

      const spacing = 8;
      const panelWidth = panelEl.offsetWidth || 360;
      const panelHeight = panelEl.offsetHeight || 320;

      let nextLeft = triggerRect.left;
      if (nextLeft + panelWidth > window.innerWidth - spacing) {
        nextLeft = Math.max(spacing, window.innerWidth - panelWidth - spacing);
      }

      let nextTop = triggerRect.bottom + spacing;
      if (nextTop + panelHeight > window.innerHeight - spacing) {
        nextTop = Math.max(spacing, triggerRect.top - panelHeight - spacing);
      }

      setPanelStyle({ top: Math.round(nextTop), left: Math.round(nextLeft) });
    };

    const frameId = requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const displayValue = useMemo(() => {
    const parts = to12HourParts(value);
    return `${parts.hour12}:${parts.minute} ${parts.meridiem}`;
  }, [value]);

  const draft24 = to24HourString(draftHour, draftMinute, draftMeridiem);
  const exceedsMax = Boolean(maxTime) && toMinutes(draft24) > toMinutes(maxTime);

  const applyDraft = () => {
    if (!draft24 || exceedsMax) {
      return;
    }

    onChange?.(draft24);
    setOpen(false);
  };

  const adjustHour = (delta) => {
    const current = Number(draftHour || '12');
    const normalized = Number.isNaN(current) ? 12 : current;
    const next = ((normalized - 1 + delta + 12) % 12) + 1;
    setDraftHour(pad2(next));
  };

  const adjustMinute = (delta) => {
    const current = Number(draftMinute || '00');
    const normalized = Number.isNaN(current) ? 0 : current;
    const next = (normalized + delta + 60) % 60;
    setDraftMinute(pad2(next));
  };

  const onHourBlur = () => {
    const parsed = Number(draftHour);
    if (Number.isNaN(parsed)) {
      setDraftHour('12');
      return;
    }
    const clamped = Math.min(12, Math.max(1, parsed));
    setDraftHour(pad2(clamped));
  };

  const onMinuteBlur = () => {
    const parsed = Number(draftMinute);
    if (Number.isNaN(parsed)) {
      setDraftMinute('00');
      return;
    }
    const clamped = Math.min(59, Math.max(0, parsed));
    setDraftMinute(pad2(clamped));
  };

  return (
    <div className="time-picker" ref={rootRef}>
      <button
        type="button"
        className="time-picker-trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
      >
        <span>{displayValue || placeholder}</span>
        <span className="time-picker-clock" aria-hidden="true">🕒</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="time-picker-panel"
          role="dialog"
          aria-label="Select time"
          style={{ top: `${panelStyle.top}px`, left: `${panelStyle.left}px` }}
        >
          <div className="time-picker-title">Enter Time</div>

          <div className="time-picker-controls">
            <div className="time-picker-unit">
              <button type="button" onClick={() => adjustHour(1)} className="time-arrow" aria-label="Increase hour">▲</button>
              <input
                type="text"
                inputMode="numeric"
                value={draftHour}
                onChange={(event) => setDraftHour(sanitizePart(event.target.value, 2))}
                onBlur={onHourBlur}
                maxLength={2}
              />
              <button type="button" onClick={() => adjustHour(-1)} className="time-arrow" aria-label="Decrease hour">▼</button>
              <small>Hour</small>
            </div>

            <div className="time-colon">:</div>

            <div className="time-picker-unit">
              <button type="button" onClick={() => adjustMinute(1)} className="time-arrow" aria-label="Increase minute">▲</button>
              <input
                type="text"
                inputMode="numeric"
                value={draftMinute}
                onChange={(event) => setDraftMinute(sanitizePart(event.target.value, 2))}
                onBlur={onMinuteBlur}
                maxLength={2}
              />
              <button type="button" onClick={() => adjustMinute(-1)} className="time-arrow" aria-label="Decrease minute">▼</button>
              <small>Minute</small>
            </div>

            <div className="time-meridiem">
              <button
                type="button"
                className={draftMeridiem === 'AM' ? 'active' : ''}
                onClick={() => setDraftMeridiem('AM')}
              >
                AM
              </button>
              <button
                type="button"
                className={draftMeridiem === 'PM' ? 'active' : ''}
                onClick={() => setDraftMeridiem('PM')}
              >
                PM
              </button>
            </div>
          </div>

          {exceedsMax && (
            <p className="time-picker-error">Selected time cannot be in the future.</p>
          )}

          <div className="time-picker-actions">
            <button
              type="button"
              onClick={() => {
                syncFromValue();
                setOpen(false);
              }}
            >
              Cancel
            </button>
            <button type="button" onClick={applyDraft} disabled={exceedsMax || !draft24}>OK</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TimeInputPicker;
