import React from 'react';
import { useLanguage } from '../context/LanguageContext';

// Since ErrorBoundary is a class component, we need to wrap it with a function component
// to use hooks like useLanguage
function ErrorContent({ error, errorInfo }) {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark px-4">
      <div className="max-w-md w-full space-y-4 text-center">
        <div className="text-red-500 text-5xl mb-4">
          <i className="fas fa-exclamation-circle" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('common.error')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {t('errors.unexpectedError')}
        </p>
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition"
          >
            {t('common.refresh')}
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {t('common.goHome')}
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded text-left overflow-auto">
            <p className="text-red-600 dark:text-red-400 font-mono text-sm">
              {error && error.toString()}
            </p>
            <pre className="text-gray-700 dark:text-gray-300 font-mono text-xs mt-2">
              {errorInfo && errorInfo.componentStack}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log the error to your preferred error tracking service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorContent error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 