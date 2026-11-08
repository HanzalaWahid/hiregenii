import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import UploadView from './components/UploadView';
import DashboardView from './components/DashboardView';
import ResumeExplorer from './components/ResumeExplorer';
import JobMatcher from './components/JobMatcher';
import KnowledgeBase from './components/KnowledgeBase';
import { useResume } from './context/ResumeContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const { analysisData } = useResume();

  const candidateName = analysisData?.personal_info?.name || null;

  return (
    <div style={appStyles.container}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={appStyles.mainContent}>
        {/* Dynamic header */}
        <header style={appStyles.topHeader}>
          <div style={appStyles.userInfo}>
            <span style={appStyles.welcomeText}>Welcome back,</span>
            <strong style={appStyles.userName}>Recruiter Portal</strong>
          </div>
          <div style={appStyles.systemMode}>
            <span style={appStyles.statusDot}></span>
            <span style={appStyles.statusText}>
              {candidateName ? `Active Resume: ${candidateName}` : 'Awaiting Resume Upload'}
            </span>
          </div>
        </header>

        {/* Dynamic Tab Rendering */}
        <div style={appStyles.viewWrapper}>
          {activeTab === 'upload' && (
            <UploadView
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'explorer' && <ResumeExplorer />}
          {activeTab === 'matcher' && <JobMatcher />}
          {activeTab === 'knowledge' && <KnowledgeBase />}
        </div>
      </main>
    </div>
  );
}

const appStyles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-base)',
    flexDirection: 'row',
  },
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflowY: 'auto',
    padding: '24px 32px 32px 32px',
    position: 'relative',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  welcomeText: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  userName: {
    fontSize: '1.05rem',
    color: 'var(--text-primary)',
    fontWeight: '700',
  },
  systemMode: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-color)',
    padding: '6px 14px',
    borderRadius: '8px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-accent)',
    boxShadow: '0 0 8px var(--color-accent)',
    display: 'inline-block',
  },
  statusText: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  viewWrapper: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
  }
};

// Responsive media query
const styleEl = document.createElement('style');
styleEl.innerHTML = `
  @media (max-width: 900px) {
    .app-container {
      flex-direction: column !important;
    }
    main {
      height: auto !important;
      overflow-y: visible !important;
      padding: 16px !important;
    }
  }
`;
document.head.appendChild(styleEl);
