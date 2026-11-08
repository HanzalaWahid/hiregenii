import React, { useState } from 'react';
import styles from './JobMatcher.module.css';
import { 
  Sparkles, 
  Plus, 
  Target,
  AlertTriangle,
  UploadCloud,
} from 'lucide-react';
import { useResume } from '../context/ResumeContext';
import { matchJob } from '../utils/api';

export default function JobMatcher() {
  const { analysisData } = useResume();
  const [jobDescription, setJobDescription] = useState('');
  const [status, setStatus] = useState('idle'); // idle, analyzing, results
  const [jobMatchResult, setJobMatchResult] = useState(null);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim() || !analysisData) return;

    setStatus('analyzing');
    setError('');
    try {
      const response = await matchJob(jobDescription, analysisData.skills || []);
      setJobMatchResult(response);
      setStatus('results');
    } catch (err) {
      setError(err.message || 'Failed to run job matching.');
      setStatus('idle');
    }
  };

  const handleReset = () => {
    setJobDescription('');
    setStatus('idle');
    setJobMatchResult(null);
    setError('');
  };

  if (!analysisData) {
    return (
      <div className={`${styles.container} animate-fade-in`}>
        <div className={`${styles.analyzingCard} glass-panel`}>
          <UploadCloud size={48} className={styles.pulseIcon} />
          <h3 className={styles.analyzingTitle}>Upload a Resume First</h3>
          <p className={styles.analyzingSubtitle}>
            Job matching requires extracted skills from the currently uploaded resume.
          </p>
        </div>
      </div>
    );
  }

  const matchScore = jobMatchResult?.match_score ?? 0;
  const missingKeywords = jobMatchResult?.missing_keywords || [];
  const actionPlan = jobMatchResult?.action_plan || [];
  const matchingKeywords = jobMatchResult?.matching_keywords || [];
  const careerFitAnalysis = jobMatchResult?.career_fit_analysis || '';
  const suggestedImprovements = jobMatchResult?.suggested_improvements || [];

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Semantic Job Matcher</h1>
        <p className={styles.subtitle}>Paste a job description to compare key skills, find critical vocabulary gaps, and audit candidate alignment.</p>
      </header>

      {status === 'idle' && (
        <form onSubmit={handleAnalyze} className={`${styles.form} glass-panel`}>
          <div className={styles.inputGroup}>
            <label htmlFor="job-description" className={styles.label}>
              <Target size={16} /> Target Job Description
            </label>
            <textarea
              id="job-description"
              className={styles.textarea}
              placeholder="Paste the target job description here (responsibilities, requirements, technical qualifications)..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
            ></textarea>
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={!jobDescription.trim()}
          >
            Analyze Candidate Match <Sparkles size={16} />
          </button>
          {error && <p className={styles.cardDesc}>{error}</p>}
        </form>
      )}

      {status === 'analyzing' && (
        <div className={`${styles.analyzingCard} glass-panel`}>
          <div className={styles.loaderGlow}></div>
          <div className={styles.pulseContainer}>
            <div className={styles.pulseCircle}></div>
            <Sparkles className={styles.pulseIcon} size={32} />
          </div>
          <h3 className={styles.analyzingTitle}>Running Semantic Matching</h3>
          <p className={styles.analyzingSubtitle}>
            Comparing resume tokens against job taxonomy using sentence-transformers...
          </p>
        </div>
      )}

      {status === 'results' && (
        <div className={styles.resultsGrid}>
          {/* Left panel: Score & Keywords */}
          <div className={styles.leftCol}>
            <div className={`${styles.scoreCard} glass-panel`}>
              <div className={styles.scoreRow}>
                <div>
                  <h3 className={styles.cardTitle}>Compatibility Score</h3>
                  <p className={styles.scoreText}>Good alignment with key requirements.</p>
                </div>
                <div className={styles.scoreBadgeCircle}>
                  <span className={styles.badgeVal}>{matchScore}%</span>
                </div>
              </div>
              <div className={styles.scoreProgressBg}>
                <div className={styles.scoreProgressFill} style={{ width: `${matchScore}%` }} />
              </div>
            </div>

            <div className={`${styles.keywordsCard} glass-panel`}>
              <h3 className={styles.cardTitle}>Critical Vocabulary Gaps</h3>
              <p className={styles.cardDesc}>We detected the following missing keywords on your resume that are heavily weighted in this job description.</p>
              
              <div className={styles.keywordCloud}>
                {missingKeywords.map((kw, idx) => (
                  <span key={idx} className={styles.missingKeywordTag}>
                    <Plus size={12} /> {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${styles.keywordsCard} glass-panel`}>
              <h3 className={styles.cardTitle}>Matching Skills</h3>
              <p className={styles.cardDesc}>These terms overlap between your resume and the target job description.</p>
              <div className={styles.keywordCloud}>
                {matchingKeywords.map((kw, idx) => (
                  <span key={idx} className={styles.missingKeywordTag}>{kw}</span>
                ))}
              </div>
            </div>

            <button className="btn-secondary" onClick={handleReset}>
              Analyze Another Job Description
            </button>
          </div>

          {/* Right panel: Optimization Action Plan */}
          <div className={`${styles.actionCard} glass-panel`}>
            <h3 className={styles.cardTitle}>ATS Optimization Roadmap</h3>
            <p className={styles.cardDesc}>Incorporate these points to increase match relevance:</p>

            <div className={styles.actionList}>
              {actionPlan.map((action, idx) => (
                <div key={idx} className={styles.actionItem}>
                  <div className={`${styles.importanceBadge} ${
                    action.importance === 'High' ? styles.importanceHigh :
                    action.importance === 'Medium' ? styles.importanceMedium : styles.importanceLow
                  }`}>
                    {action.importance} Priority
                  </div>
                  <div className={styles.actionContent}>
                    <p className={styles.actionText}>{action.step}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.courseAlert}>
              <AlertTriangle className={styles.alertIcon} size={18} />
              <div>
                <strong>Career Fit Analysis:</strong> {careerFitAnalysis}
              </div>
            </div>

            <div className={styles.courseAlert}>
              <AlertTriangle className={styles.alertIcon} size={18} />
              <div>
                <strong>Suggested Improvements:</strong> {suggestedImprovements.join(' ')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
