import React, { useState, useRef } from 'react';
import styles from './UploadView.module.css';
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Settings2,
} from 'lucide-react';
import { useResume } from '../context/ResumeContext';

const PIPELINE_STAGES = [
  { id: 1, name: 'File Validation', desc: 'Checking format, size, and security' },
  { id: 2, name: 'Text Extraction', desc: 'Running PDF/DOCX structure parsing' },
  { id: 3, name: 'Section Detection', desc: 'Detecting contact, work, and skills layout' },
  { id: 4, name: 'Entity Extraction', desc: 'Parsing names, organizations, and periods' },
  { id: 5, name: 'Skill Extraction', desc: 'Mapping raw skills from vocabulary' },
  { id: 6, name: 'Data Normalization', desc: 'Generating structured Resume Object' },
];

const PROVIDERS = [
  { value: 'auto', label: 'Auto (Local)', description: 'Uses the local rule-based extractor; no AI provider fallback' },
  { value: 'custom_rule', label: 'Custom Rule-based Extractor', description: 'Fast offline extraction — no API key needed' },
  { value: 'gemini', label: 'Gemini LLM Extractor', description: 'Google Gemini AI — requires GEMINI_API_KEY' },
  { value: 'cerebras', label: 'Cerebras Qwen Extractor', description: 'Cerebras inference — requires CEREBRAS_API_KEY' },
];

export default function UploadView({ setActiveTab }) {
  const { runAnalysis, isLoading } = useResume();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, parsing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [provider, setProvider] = useState('auto');
  const [analysisResult, setAnalysisResult] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateClientSide = (selectedFile) => {
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setStatus('error');
      setErrorMessage('Unsupported file format! Please upload a PDF or DOCX file.');
      return false;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setStatus('error');
      setErrorMessage('File size exceeds the 10MB safety limit.');
      return false;
    }
    return true;
  };

  const processFile = async (selectedFile) => {
    if (!validateClientSide(selectedFile)) return;

    setFile(selectedFile);
    setStatus('parsing');
    setErrorMessage('');
    setCurrentStage(1);
    setProgress(10);

    // Animate the pipeline stages while the real API call runs
    let stageTimer = 1;
    const stageInterval = setInterval(() => {
      stageTimer += 1;
      if (stageTimer <= PIPELINE_STAGES.length) {
        setCurrentStage(stageTimer);
        setProgress((stageTimer / PIPELINE_STAGES.length) * 85); // Cap at 85% until done
      }
    }, 800);

    try {
      const result = await runAnalysis(selectedFile, provider);
      clearInterval(stageInterval);
      setProgress(100);
      setCurrentStage(PIPELINE_STAGES.length + 1); // Mark all complete
      setAnalysisResult(result);
      setStatus('success');
    } catch (err) {
      clearInterval(stageInterval);
      setStatus('error');
      setErrorMessage(err.message || 'Analysis failed. The backend may not be reachable.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetUploader = () => {
    setFile(null);
    setStatus('idle');
    setCurrentStage(0);
    setProgress(0);
    setErrorMessage('');
    setAnalysisResult(null);
  };

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Upload Resume</h1>
        <p className={styles.subtitle}>
          Securely upload your resume for immediate structure extraction and ATS matching analysis.
        </p>
      </header>

      {/* Provider Selector — shown in idle or success state */}
      {(status === 'idle') && (
        <div className={`${styles.providerCard} glass-panel`}>
          <div className={styles.providerHeader}>
            <Settings2 size={18} />
            <span>Extraction Provider</span>
          </div>
          <div className={styles.providerOptions}>
            {PROVIDERS.map((p) => (
              <label key={p.value} className={`${styles.providerOption} ${provider === p.value ? styles.providerSelected : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value={p.value}
                  checked={provider === p.value}
                  onChange={() => setProvider(p.value)}
                  className={styles.providerRadio}
                />
                <div>
                  <strong className={styles.providerLabel}>{p.label}</strong>
                  <span className={styles.providerDesc}>{p.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {status === 'idle' && (
        <form
          className={`${styles.dragArea} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className={styles.fileInput}
            onChange={handleChange}
            accept=".pdf,.docx"
            id="resume-file-input"
          />
          <div className={styles.uploadIconContainer}>
            <UploadCloud className={styles.uploadIcon} size={48} />
          </div>
          <h3 className={styles.uploadHeading}>Drag and drop your file here</h3>
          <p className={styles.uploadInfo}>Supports PDF or DOCX (Max 10MB)</p>
          <button type="button" className="btn-primary">Browse Files</button>
        </form>
      )}

      {status === 'error' && (
        <div className={`${styles.errorCard} glass-panel`}>
          <AlertCircle className={styles.errorIcon} size={44} />
          <h3 className={styles.errorTitle}>Validation Failed</h3>
          <p className={styles.errorMsg}>{errorMessage}</p>
          <button className="btn-primary" onClick={resetUploader}>Try Another File</button>
        </div>
      )}

      {status === 'parsing' && (
        <div className={`${styles.parsingCard} glass-panel`}>
          <div className={styles.fileDetails}>
            <File className={styles.fileIcon} size={28} />
            <div>
              <h4 className={styles.fileName}>{file?.name}</h4>
              <span className={styles.fileSize}>{(file?.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <Loader2 className={styles.spinningLoader} size={24} />
          </div>

          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Processing Pipeline...</span>
              <span className={styles.progressPercentage}>{Math.round(progress)}%</span>
            </div>
            <div className={styles.progressBarBg}>
              <div className={styles.progressBarFill} style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <div className={styles.pipelineTimeline}>
            {PIPELINE_STAGES.map((stage) => {
              const isActive = currentStage === stage.id;
              const isCompleted = currentStage > stage.id;
              return (
                <div
                  key={stage.id}
                  className={`${styles.pipelineStep} ${isActive ? styles.stepActive : ''} ${isCompleted ? styles.stepCompleted : ''}`}
                >
                  <div className={styles.stepIndicator}>
                    {isCompleted ? (
                      <CheckCircle2 size={18} className={styles.checkIcon} />
                    ) : isActive ? (
                      <Loader2 size={16} className={styles.spinIcon} />
                    ) : (
                      <span className={styles.stepNum}>{stage.id}</span>
                    )}
                  </div>
                  <div className={styles.stepContent}>
                    <h5 className={styles.stepTitle}>{stage.name}</h5>
                    <p className={styles.stepDesc}>{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {status === 'success' && analysisResult && (
        <div className={`${styles.successCard} glass-panel`}>
          <div className={styles.successBadge}>
            <CheckCircle2 size={40} className={styles.successIcon} />
          </div>
          <h2 className={styles.successTitle}>Analysis Complete!</h2>
          <p className={styles.successMsg}>
            <strong>{file?.name}</strong> has been processed successfully.
            {analysisResult.personal_info?.name && (
              <> Detected candidate: <strong>{analysisResult.personal_info.name}</strong>.</>
            )}
          </p>
          <p className={styles.emptyMsg}>
            Extraction path: <strong>{analysisResult.provider_used || 'auto'}</strong>
            {analysisResult.fallback_used ? ' · fallback used' : ''}
            {typeof analysisResult.confidence_score === 'number' ? ` · Confidence ${Math.round(analysisResult.confidence_score * 100)}%` : ''}
          </p>

          <div className={styles.successStats}>
            <div className={styles.statBox}>
              <ShieldCheck size={20} className={styles.statIcon} />
              <div>
                <strong>ATS Score</strong>
                <span>{analysisResult.ats_score?.overall ?? 0} / 100</span>
              </div>
            </div>
            <div className={styles.statBox}>
              <Cpu size={20} className={styles.statIcon} />
              <div>
                <strong>{analysisResult.skills?.length ?? 0} Skills</strong>
                <span>Extracted &amp; Normalized</span>
              </div>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button className="btn-secondary" onClick={resetUploader}>Upload Different Resume</button>
            <button className="btn-primary" onClick={() => setActiveTab('dashboard')}>
              View ATS Dashboard <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
