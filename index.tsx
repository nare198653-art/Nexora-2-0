import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getWorkspaceUid } from './firebase';
import { LanguageProvider } from './localization/LanguageContext';
import { nexoraFirestoreService } from './services/nexoraFirestoreService';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class FirebaseErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected application error occurred.'
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nexora runtime boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-slate-100 font-sans px-6 text-center">
          <h1 className="font-display text-2xl font-bold mb-3 text-white">Neural Uplink Interrupted</h1>
          <p className="text-slate-400 mb-6 max-w-md text-sm leading-relaxed">
            {this.state.errorMessage}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-white text-black rounded-full text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            Reconnect Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const WorkspaceBootstrap = () => {
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const uid = getWorkspaceUid();
    const initializeWorkspace = async () => {
      try {
        await Promise.race([
          nexoraFirestoreService.migrateLocalDataIfNeeded(uid),
          new Promise((resolve) => setTimeout(resolve, 2500))
        ]);
      } catch (e) {
        console.warn('Error initializing user workspace in Firestore:', e);
      } finally {
        if (active) setDataLoaded(true);
      }
    };
    initializeWorkspace();
    return () => {
      active = false;
    };
  }, []);

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-100 font-sans">
        Synchronizing Workspace...
      </div>
    );
  }

  return <App />;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FirebaseErrorBoundary>
      <LanguageProvider>
        <WorkspaceBootstrap />
      </LanguageProvider>
    </FirebaseErrorBoundary>
  </React.StrictMode>
);
