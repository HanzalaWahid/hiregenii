import React from 'react';
import styles from './Sidebar.module.css';
import { 
  FileText, 
  UploadCloud, 
  BarChart3, 
  User, 
  Sparkles, 
  BookOpen
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'upload', label: 'Upload & Parse', icon: UploadCloud },
    { id: 'dashboard', label: 'ATS Dashboard', icon: BarChart3 },
    { id: 'explorer', label: 'Resume Explorer', icon: User },
    { id: 'matcher', label: 'Job Matcher', icon: Sparkles },
    { id: 'knowledge', label: 'Skills Normalizer', icon: BookOpen }
  ];

  return (
    <aside className={`${styles.sidebar} glass-panel`}>
      <div className={styles.brandContainer}>
        <div className={styles.logoGlow}></div>
        <FileText className={styles.brandIcon} size={28} />
        <div>
          <h2 className={styles.brandName}>Resume AI</h2>
          <span className={styles.brandSubtitle}>Intelligence Platform</span>
        </div>
      </div>

      <nav className={styles.navMenu}>
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
              onClick={() => setActiveTab(item.id)}
              aria-label={`Navigate to ${item.label}`}
            >
              <div className={styles.iconContainer}>
                <IconComponent size={20} />
              </div>
              <span className={styles.navLabel}>{item.label}</span>
              {activeTab === item.id && <div className={styles.activeIndicator} />}
            </button>
          );
        })}
      </nav>

      <div className={styles.statusFooter}>
        <div className={styles.statusRow}>
          <span className={styles.statusPulse}></span>
          <span className={styles.statusText}>Live Analysis Engine Connected</span>
        </div>
        <span className={styles.versionText}>v1.1.0 (Phase 1 Refactored)</span>
      </div>
    </aside>
  );
}
