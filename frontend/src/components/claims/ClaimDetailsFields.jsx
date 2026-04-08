import TimeInputPicker from '../TimeInputPicker';

const ClaimDetailsFields = ({ details, errors, onChange }) => {
  const fieldClassName = (fieldName) => (errors[fieldName] ? 'input-invalid' : '');

  const now = new Date();
  const currentDateValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentTimeValue = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const getMaxTimeForDate = (selectedDate) => (selectedDate === currentDateValue ? currentTimeValue : undefined);
  const emitFieldChange = (name, value) => onChange?.({ target: { name, value } });

  return (
    <>
      <div className="form-group">
        <label htmlFor="primaryLocation" className="required">Primary Location</label>
        <input
          id="primaryLocation"
          type="text"
          name="primaryLocation"
          placeholder="e.g., Near library, CSE building"
          value={details.primaryLocation}
          onChange={onChange}
          className={fieldClassName('primaryLocation')}
        />
        {errors.primaryLocation && <small className="field-error">{errors.primaryLocation}</small>}
      </div>

      <div className="form-group">
        <label htmlFor="location2">Possible Location 2 (optional)</label>
        <input
          id="location2"
          type="text"
          name="location2"
          placeholder="e.g., Near library, CSE building"
          value={details.location2}
          onChange={onChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="location3">Possible Location 3 (optional)</label>
        <input
          id="location3"
          type="text"
          name="location3"
          placeholder="e.g., Near library, CSE building"
          value={details.location3}
          onChange={onChange}
        />
      </div>

      <div className="form-group">
        <label htmlFor="description" className="required">Description</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Describe item (color, brand, unique marks...)"
          value={details.description}
          onChange={onChange}
          className={fieldClassName('description')}
        />
        {errors.description && <small className="field-error">{errors.description}</small>}
      </div>

      <div className="form-group">
        <label className="required">Time Span</label>
        <div className="form-row">
          <div>
            <label htmlFor="fromTime" style={{ fontSize: '0.9rem' }}>From Time</label>
            <input
              id="fromTime"
              type="hidden"
              name="fromTime"
              value={details.fromTime}
            />
            <TimeInputPicker
              value={details.fromTime}
              onChange={(value) => emitFieldChange('fromTime', value)}
              maxTime={getMaxTimeForDate(details.lostDate)}
            />
            {errors.fromTime && <small className="field-error">{errors.fromTime}</small>}
          </div>
          <div>
            <label htmlFor="toTime" style={{ fontSize: '0.9rem' }}>To Time</label>
            <input
              id="toTime"
              type="hidden"
              name="toTime"
              value={details.toTime}
            />
            <TimeInputPicker
              value={details.toTime}
              onChange={(value) => emitFieldChange('toTime', value)}
              maxTime={getMaxTimeForDate(details.lostDate)}
            />
            {errors.toTime && <small className="field-error">{errors.toTime}</small>}
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="lostDate" className="required">Lost Date</label>
        <input
          id="lostDate"
          type="date"
          name="lostDate"
          value={details.lostDate}
          onChange={onChange}
          max={currentDateValue}
          className={fieldClassName('lostDate')}
        />
        {errors.lostDate && <small className="field-error">{errors.lostDate}</small>}
      </div>
    </>
  );
};

export default ClaimDetailsFields;
