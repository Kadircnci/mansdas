"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Chrome extension hatalarını filtrele
    if (error.message?.includes('chrome-extension') || 
        error.stack?.includes('chrome-extension') ||
        error.message?.includes('register') && error.stack?.includes('inject') ||
        error.message?.includes('t is not a function') ||
        errorInfo.componentStack?.includes('inject.js')) {
      console.warn('Chrome extension interference detected, ignoring error');
      this.setState({ hasError: false });
      return;
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Bir Hata Oluştu</h2>
            <p className="text-gray-600 mb-4">
              Sayfa yüklenirken beklenmeyen bir hata oluştu. Bu genellikle tarayıcı uzantılarından kaynaklanır.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
              >
                Tekrar Dene
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
              >
                Sayfayı Yenile
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left text-xs text-red-600">
                <summary className="cursor-pointer">Hata Detayları (Development)</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}