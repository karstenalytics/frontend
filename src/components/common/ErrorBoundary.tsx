/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Usage:
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <YourComponent />
 * </ErrorBoundary>
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            background: 'var(--ifm-background-surface-color)',
            border: '2px solid var(--ifm-color-danger)',
            borderRadius: 'var(--ifm-global-radius)',
            margin: '24px 0',
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              marginBottom: '16px',
            }}
          >
            ⚠️
          </div>
          <h2
            style={{
              color: 'var(--ifm-color-danger)',
              marginBottom: '16px',
              fontSize: '1.5rem',
            }}
          >
            Something Went Wrong
          </h2>
          <p
            style={{
              color: 'var(--ifm-font-color-base)',
              marginBottom: '24px',
              maxWidth: '600px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            We encountered an error while loading this component.
            This might be due to a data loading issue or an unexpected problem.
          </p>
          {this.state.error && (
            <details
              style={{
                marginTop: '24px',
                padding: '16px',
                background: 'var(--ifm-background-color)',
                borderRadius: '4px',
                textAlign: 'left',
                maxWidth: '800px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--ifm-color-danger)',
                }}
              >
                Error Details (for developers)
              </summary>
              <pre
                style={{
                  fontSize: '0.875rem',
                  overflow: 'auto',
                  padding: '12px',
                  background: 'var(--ifm-code-background)',
                  borderRadius: '4px',
                  color: 'var(--ifm-code-color)',
                }}
              >
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'white',
              background: 'var(--ifm-color-primary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Simple error fallback component for inline use
 */
export function SimpleErrorFallback({
  message = 'Failed to load data',
  error,
}: {
  message?: string;
  error?: Error | string;
}): React.ReactElement {
  return (
    <div
      style={{
        padding: '32px',
        textAlign: 'center',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-color-danger)',
        borderRadius: 'var(--ifm-global-radius)',
        color: 'var(--ifm-color-danger)',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>
        {message}
      </div>
      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--ifm-font-color-secondary)' }}>
          {typeof error === 'string' ? error : error.message}
        </p>
      )}
    </div>
  );
}
