import React, { useState, useEffect } from 'react';
import styles from './DashboardView.module.css';
import {
  Check,
  HelpCircle,
  User,
  Briefcase,
  GraduationCap,
  Cpu,
  Layout,
  Key,
  ChevronRight,
  TrendingUp,
  FolderOpen,
  AlertCircle,
  UploadCloud,
} from 'lucide-react';
import { useResume } from '../context/ResumeContext';

function getIcon(name) {
  switch (name) {
    case 'user': return <User size={18} />;
    case 'briefcase': return <Briefcase size={18} />;
    case 'graduation-cap': return <GraduationCap size={18} />;
    case 'cpu': return <Cpu size={18} />;
    case 'layout': return <Layout size={18} />;
    case 'key': return <Key size={18} />;
    case 'folder-open': return <FolderOpen size={18} />;
    default: return <HelpCircle size={18} />;
  }
}

function getRankLabel(score) {
  if (score >= 85) return 'Top 10%';
  if (score >= 70) return 'Top 25%';
  if (score >= 55) return 'Top 50%';
  return 'Below Average';
}

function getScoreDescriptor(score) {
  if (score >= 85) return 'Outstanding Resume — Ready for enterprise routing.';
  if (score >= 70) return 'Strong Candidate Alignment — Minor improvements recommended.';
  if (score >= 50) return 'Moderate Match — Several areas need enhancement.';
  return 'Needs Improvement — Significant gaps detected.';
}

export default function DashboardView() {
  const { analysisData } = useResume();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState(null);

  const atsData = analysisData?.ats_score;
  const score = atsData?.overall ?? 0;
  const breakdown = atsData?.breakdown ?? [];
  const strengths = atsData?.strengths ?? [];
  const improvements = atsData?.improvements ?? [];
  const providerUsed = analysisData?.provider_used || 'auto';
  const fallbackUsed = Boolean(analysisData?.fallback_used);
  const confidenceScore = typeof analysisData?.confidence_score === 'number' ? analysisData.confidence_score : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  // Gauge SVG
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  if (!analysisData) {
    return (
      <div className={`${styles.container} animate-fade-in`}>
        <div className={`${styles.emptyState} glass-panel`}>
          <UploadCloud size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No Resume Analyzed Yet</h2>
          <p className={styles.emptyMsg}>Upload a resume in the Upload tab to see your ATS performance dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <div className={styles.headerTitleArea}>
          <h1 className={styles.title}>ATS Performance Audit</h1>
          <p className={styles.subtitle}>
            Analyze scoring bottlenecks and check actionable suggestions to optimize resume matching.
          </p>
        </div>
        <div className={styles.metaBadge}>
          <TrendingUp size={16} />
          <span>Overall Match Rank: {getRankLabel(score)}</span>
        </div>
        <div className={styles.metaBadge}>
          <Cpu size={16} />
          <span>{providerUsed}{fallbackUsed ? ' · fallback used' : ''}</span>
        </div>
      </header>

      <div className={styles.gridTop}>
        {/* Radial Gauge Card */}
        <div className={`${styles.gaugeCard} glass-panel`}>
          <h3 className={styles.cardTitle}>Match Strength</h3>
          <div className={styles.gaugeContainer}>
            <svg className={styles.gaugeSvg} width="220" height="220" viewBox="0 0 220 220">
              <circle
                className={styles.gaugeBgCircle}
                cx="110"
                cy="110"
                r={radius}
              />
              <circle
                className={styles.gaugeFillCircle}
                cx="110"
                cy="110"
                r={radius}
                strokeDasharray={circumference}
                style={{
                  '--offset': strokeDashoffset,
                  stroke: score >= 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-primary)' : 'var(--color-danger)'
                }}
              />
            </svg>
            <div className={styles.gaugeValue}>
              <span className={styles.scoreNumber}>{animatedScore}</span>
              <span className={styles.scoreLabel}>Score</span>
            </div>
          </div>
          <p className={styles.gaugeDescriptor}>{getScoreDescriptor(score)}</p>
        </div>

        {/* Breakdown Card */}
        <div className={`${styles.breakdownCard} glass-panel`}>
          <h3 className={styles.cardTitle}>Criteria Breakdown</h3>
          <div className={styles.breakdownList}>
            {breakdown.map((item, idx) => {
              const pct = item.max_score > 0 ? Math.round((item.score / item.max_score) * 100) : 0;
              return (
                <div key={idx} className={styles.breakdownItem}>
                  <div className={styles.breakdownItemHeader}>
                    <div className={styles.breakdownLabelGroup}>
                      <span className={styles.itemIconContainer}>
                        {getIcon(item.icon)}
                      </span>
                      <span className={styles.itemName}>{item.name}</span>
                    </div>
                    <span className={styles.itemScore}>{item.score}/{item.max_score}</span>
                  </div>
                  <div className={styles.itemProgressBg}>
                    <div
                      className={styles.itemProgressFill}
                      style={{
                        width: `${pct}%`,
                        background: pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-primary)' : 'var(--color-warning)'
                      }}
                    />
                  </div>
                  <p className={styles.emptyMsg}>{item.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.gridBottom}>
        {/* Strengths List */}
        <div className={`${styles.auditCard} glass-panel`}>
          <div className={styles.cardHeaderWithCount}>
            <h3 className={styles.cardTitle}>Audited Strengths</h3>
            <span className={`${styles.badge} ${styles.badgeSuccess}`}>
              {strengths.length} Passed
            </span>
          </div>
          {strengths.length > 0 ? (
            <ul className={styles.bulletList}>
              {strengths.map((str, idx) => (
                <li key={idx} className={styles.strengthItem}>
                  <div className={styles.strengthCheck}>
                    <Check size={14} />
                  </div>
                  <span className={styles.bulletText}>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyMsg}>No specific strengths detected. Upload a more detailed resume.</p>
          )}
        </div>

        {/* Improvement Recommendations */}
        <div className={`${styles.auditCard} glass-panel`}>
          <div className={styles.cardHeaderWithCount}>
            <h3 className={styles.cardTitle}>Actionable Improvements</h3>
            <span className={`${styles.badge} ${styles.badgeWarning}`}>
              {improvements.length} Flagged
            </span>
          </div>
          {improvements.length > 0 ? (
            <div className={styles.accordionContainer}>
              {improvements.map((imp, idx) => {
                const isOpen = activeAccordion === idx;
                return (
                  <div
                    key={idx}
                    className={`${styles.accordionItem} ${isOpen ? styles.accordionOpen : ''}`}
                  >
                    <button
                      className={styles.accordionHeader}
                      onClick={() => setActiveAccordion(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                    >
                      <span className={styles.accordionTitle}>{imp}</span>
                      <ChevronRight size={16} className={styles.accordionChevron} />
                    </button>
                    <div className={styles.accordionContent}>
                      <p className={styles.accordionDetail}>{imp}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.emptyMsg}>No improvements needed — great resume!</p>
          )}
        </div>
      </div>
    </div>
  );
}
