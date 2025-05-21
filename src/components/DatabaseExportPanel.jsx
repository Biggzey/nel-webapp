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
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Database Export</h2>
      <div className="space-y-4">
        <div>
          <p className="text-gray-600 mb-4">
            Export the entire database to a JSON file. This file can be used to migrate to another database.
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isExporting ? 'Exporting...' : 'Export Database'}
          </button>
          {error && (
            <p className="text-red-500 mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
} 