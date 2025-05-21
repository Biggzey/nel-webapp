import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function DatabaseExportPanel() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);

      const response = await fetch('/api/admin/export-db', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export database');
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'database-export.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return null;
  }

  return (
    <div className="bg-background-container-light dark:bg-background-container-dark rounded-2xl border-2 border-primary/20 shadow-md p-4 flex flex-col h-full justify-between">
      <div>
        <h2 className="text-lg font-semibold mb-2">Database Export</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Export the database as a JSON file.
        </p>
      </div>
      <div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 text-sm font-semibold"
        >
          {isExporting ? 'Exporting...' : 'Export Database'}
        </button>
        {error && (
          <p className="text-red-500 mt-2 text-xs">{error}</p>
        )}
      </div>
    </div>
  );
} 