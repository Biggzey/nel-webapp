import React, { useState } from 'react';

const SettingsModal = () => {
  const [language, setLanguage] = useState('en');

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value)}
      style={{ width: '120px' }}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
    </select>
  );
};

export default SettingsModal; 