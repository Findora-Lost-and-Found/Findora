import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected application error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Root render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
          <h2>Findora failed to load</h2>
          <p>{this.state.message}</p>
          <p>Open browser console for full stack trace.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
