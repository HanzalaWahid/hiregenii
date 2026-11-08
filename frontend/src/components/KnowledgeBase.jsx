import React, { useState, useEffect } from 'react';
import styles from './KnowledgeBase.module.css';
import { 
  Search, 
  Plus, 
  ArrowRight, 
  Database,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getSkillMappings, addSkillMapping, deleteSkillMapping } from '../utils/api';
import { useResume } from '../context/ResumeContext';

export default function KnowledgeBase() {
  const { analysisData } = useResume();
  const [mappings, setMappings] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form states
  const [raw, setRaw] = useState('');
  const [normalized, setNormalized] = useState('');
  const [category, setCategory] = useState('frontend');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load skill mappings on mount
  useEffect(() => {
    const loadMappings = async () => {
      try {
        setIsLoading(true);
        const response = await getSkillMappings();
        setMappings(response.mappings || []);
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to load skill mappings');
        setMappings([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadMappings();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!raw.trim() || !normalized.trim()) return;

    // Check if duplicate raw term
    if (mappings.some(m => m.raw.toLowerCase() === raw.trim().toLowerCase())) {
      setError("This raw alias mapping already exists!");
      return;
    }

    try {
      setIsSubmitting(true);
      await addSkillMapping(raw.trim(), normalized.trim(), category);
      
      // Add to local state immediately
      const newMapping = {
        raw: raw.trim(),
        normalized: normalized.trim(),
        category: category
      };
      setMappings([newMapping, ...mappings]);
      
      setRaw('');
      setNormalized('');
      setSuccessMsg('New skill mapping registered successfully!');
      setError('');
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to add skill mapping');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rawTerm) => {
    try {
      await deleteSkillMapping(rawTerm);
      setMappings(mappings.filter(m => m.raw !== rawTerm));
      setSuccessMsg(`Removed "${rawTerm}" mapping`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete mapping');
    }
  };

  const filteredMappings = mappings.filter(item => 
    item.raw.toLowerCase().includes(search.toLowerCase()) ||
    item.normalized.toLowerCase().includes(search.toLowerCase())
  );

  const normalizedSkillMap = analysisData?.normalized_skill_map || [];

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Skills Normalization Dictionary</h1>
        <p className={styles.subtitle}>Manage dictionary aliases that resolve legacy and colloquial technical abbreviations to standard taxonomy values.</p>
      </header>

      <div className={styles.grid}>
        {/* Left Side: Mapping List & Search */}
        <div className={`${styles.listCard} glass-panel`}>
          <div className={styles.listHeader}>
            <h3 className={styles.cardTitle}>Current Resume Skill Normalization</h3>
          </div>
          <div className={styles.mappingList}>
            {normalizedSkillMap.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Original Skill</th>
                      <th></th>
                      <th>Normalized Skill</th>
                      <th>Category</th>
                      <th>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {normalizedSkillMap.map((item, idx) => (
                      <tr key={`norm-${idx}`} className={styles.row}>
                        <td className={styles.rawCell}>{item.original}</td>
                        <td className={styles.arrowCell}><ArrowRight size={14} /></td>
                        <td className={styles.normalizedCell}>{item.normalized}</td>
                        <td>
                          <span className={styles.categoryBadge}>{item.category.replaceAll('_', ' ')}</span>
                        </td>
                        <td>{Math.round((item.confidence || 0) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <AlertCircle size={24} className={styles.emptyIcon} />
                <p>Upload a resume to view live skill normalization results.</p>
              </div>
            )}
          </div>

          <div className={styles.listHeader}>
            <h3 className={styles.cardTitle}>Vocabulary Mappings</h3>
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} size={16} />
              <input
                type="text"
                placeholder="Search raw or normalized terms..."
                className={styles.searchInput}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.mappingList}>
            {filteredMappings.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Raw Extracted Term</th>
                      <th></th>
                      <th>Normalized Output</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.map((item, idx) => (
                      <tr key={idx} className={styles.row}>
                        <td className={styles.rawCell}>{item.raw}</td>
                        <td className={styles.arrowCell}><ArrowRight size={14} /></td>
                        <td className={styles.normalizedCell}>{item.normalized}</td>
                        <td>
                          <span className={`${styles.categoryBadge} ${
                            item.category === 'frontend' ? styles.catFront :
                            item.category === 'backend' ? styles.catBack : styles.catDevOps
                          }`}>
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <button 
                            className={styles.deleteBtn}
                            onClick={() => handleDelete(item.raw)}
                            aria-label={`Delete ${item.raw} mapping`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <Database size={32} className={styles.emptyIcon} />
                <p>No matching alias records found in the database.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Add Mapping Form */}
        <div className={`${styles.formCard} glass-panel`}>
          <h3 className={styles.cardTitle}>Add Dictionary Alias</h3>
          <p className={styles.cardDesc}>
            Add a mapping rule so that whenever the extractor encounters a custom raw string, it will group it under the unified standard name.
          </p>

          {successMsg && (
            <div className={styles.successAlert}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="raw-term" className={styles.label}>Raw Extracted Text</label>
              <input
                id="raw-term"
                type="text"
                placeholder="e.g., ReactJS, AWS S3, TS"
                className={styles.input}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="normalized-term" className={styles.label}>Normalized Canonical Name</label>
              <input
                id="normalized-term"
                type="text"
                placeholder="e.g., React, AWS, TypeScript"
                className={styles.input}
                value={normalized}
                onChange={(e) => setNormalized(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="skill-category" className={styles.label}>Category</label>
              <select
                id="skill-category"
                className={styles.select}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="frontend">Frontend & Design</option>
                <option value="backend">Backend & System</option>
                <option value="devops">Cloud & DevOps</option>
              </select>
            </div>

            <button type="submit" className="btn-primary">
              Register Alias Rule <Plus size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
