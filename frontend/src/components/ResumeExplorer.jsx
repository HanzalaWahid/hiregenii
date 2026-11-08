import React, { useState } from 'react';
import styles from './ResumeExplorer.module.css';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Cpu, 
  Mail, 
  Phone, 
  MapPin,
  Globe, 
  Calendar,
  UploadCloud,
  AlertCircle
} from 'lucide-react';
import { useResume } from '../context/ResumeContext';

// Custom inline SVG for LinkedIn icon since it is not in the utility-focused lucide-react version
const Linkedin = ({ size = 24, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function ResumeExplorer() {
  const { analysisData } = useResume();
  const [subTab, setSubTab] = useState('personal');

  const tabs = [
    { id: 'personal', label: 'Contact Details', icon: User },
    { id: 'experience', label: 'Work History', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills Database', icon: Cpu }
  ];

  if (!analysisData) {
    return (
      <div className={`${styles.container} animate-fade-in`}>
        <div className={`${styles.emptyState} glass-panel`}>
          <UploadCloud size={48} style={{ color: '#6366f1', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Resume Analyzed Yet</h2>
          <p style={{ color: '#94a3b8', marginBottom: '0' }}>Upload a resume in the Upload tab to explore extracted data.</p>
        </div>
      </div>
    );
  }

  const personalInfo = analysisData.personal_info || {};
  const skills = analysisData.skills || [];
  const skillCategories = analysisData.skill_categories || {};
  const experiences = analysisData.experiences || [];
  const educationEntries = analysisData.education_entries || [];
  const summary = analysisData.summary || '';
  const totalExperience = analysisData.total_experience || 0;

  const sortedExperiences = [...experiences].sort((a, b) => {
    const getYear = (value) => {
      const match = String(value || '').match(/(20\d{2}|19\d{2})/);
      return match ? parseInt(match[1], 10) : 0;
    };
    return getYear(b.employment_period) - getYear(a.employment_period);
  });

  const contactRows = [
    { key: 'email', label: 'Email', value: personalInfo.email, icon: Mail, href: personalInfo.email ? `mailto:${personalInfo.email}` : null },
    { key: 'mobile_number', label: 'Phone', value: personalInfo.mobile_number, icon: Phone },
    { key: 'address', label: 'Address', value: personalInfo.address, icon: MapPin },
    { key: 'linkedin', label: 'LinkedIn', value: personalInfo.linkedin, icon: Linkedin, href: personalInfo.linkedin },
    { key: 'github', label: 'GitHub', value: personalInfo.github, icon: Globe, href: personalInfo.github },
    { key: 'portfolio', label: 'Portfolio', value: personalInfo.portfolio, icon: Globe, href: personalInfo.portfolio },
    { key: 'website', label: 'Website', value: personalInfo.website, icon: Globe, href: personalInfo.website },
  ].filter((row) => row.value);

  const skillSections = [
    { key: 'programming_languages', title: 'Programming Languages' },
    { key: 'frameworks', title: 'Frameworks' },
    { key: 'libraries', title: 'Libraries' },
    { key: 'databases', title: 'Databases' },
    { key: 'cloud_platforms', title: 'Cloud Platforms' },
    { key: 'ai_ml', title: 'AI/ML' },
    { key: 'data_science', title: 'Data Science' },
    { key: 'devops', title: 'DevOps' },
    { key: 'tools', title: 'Tools' },
    { key: 'soft_skills', title: 'Soft Skills' },
  ];

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Resume Object Explorer</h1>
        <p className={styles.subtitle}>Navigate through extracted data items parsed by the system's pipeline.</p>
      </header>

      {/* Sub tabs navigation */}
      <div className={styles.subTabContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${subTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setSubTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className={`${styles.panel} glass-panel`}>
        
        {/* PERSONAL DETAILS PANEL */}
        {subTab === 'personal' && (
          <div className={styles.personalGrid}>
            <div className={styles.profileSummary}>
              <div className={styles.avatarGlow}>
                <User size={36} className={styles.avatarIcon} />
              </div>
              <h2 className={styles.fullName}>{personalInfo.name || 'Name not extracted'}</h2>
              <p className={styles.userTitle}>{personalInfo.professional_title || personalInfo.designation || 'Professional title not extracted'}</p>
              <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '14px' }}>
                Level: {personalInfo.candidate_level || 'N/A'} | 
                Experience: {totalExperience.toFixed(1)} years
              </p>
              {summary && <p style={{ color: '#cbd5e1', marginTop: '12px', fontSize: '13px', lineHeight: 1.55 }}>{summary}</p>}
            </div>
            
            <div className={styles.contactDetails}>
              <h3 className={styles.sectionHeading}>Contact Information</h3>
              <div className={styles.infoList}>
                {contactRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.key} className={styles.infoItem}>
                      <Icon className={styles.infoIcon} size={18} />
                      <div>
                        <span className={styles.infoLabel}>{row.label}</span>
                        {row.href ? (
                          <a href={row.href} target="_blank" rel="noreferrer" className={styles.infoValue}>
                            {row.value}
                          </a>
                        ) : (
                          <span className={styles.infoValue}>{row.value}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className={styles.infoItem}>
                  <Calendar className={styles.infoIcon} size={18} />
                  <div>
                    <span className={styles.infoLabel}>Resume Pages</span>
                    <span className={styles.infoValue}>{personalInfo.no_of_pages || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORK HISTORY TIMELINE */}
        {subTab === 'experience' && (
          <div className={styles.experienceTimeline}>
            {sortedExperiences.length > 0 ? (
              sortedExperiences.map((exp, idx) => (
                <div key={idx} className={styles.timelineItem}>
                  <div className={styles.timelinePoint}>
                    <Briefcase size={14} />
                  </div>
                  <div className={`${styles.timelineCard} glass-card`}>
                    <div className={styles.timelineHeader}>
                      <div>
                        <h3 className={styles.roleTitle}>{exp.position || personalInfo.designation || 'Role'}</h3>
                        <h4 className={styles.companyName}>
                          {exp.company || 'Company'}
                        </h4>
                      </div>
                      <div className={styles.periodBadge}>
                        <Calendar size={14} />
                        <span>{exp.employment_period || 'Period not detected'}</span>
                      </div>
                    </div>
                    {exp.location && <p className={styles.roleDesc}>Location: {exp.location}</p>}
                    {exp.responsibilities?.length > 0 && (
                      <p className={styles.roleDesc}>Responsibilities: {exp.responsibilities.join(' | ')}</p>
                    )}
                    {exp.achievements?.length > 0 && (
                      <p className={styles.roleDesc}>Achievements: {exp.achievements.join(' | ')}</p>
                    )}
                    {exp.technologies_used?.length > 0 && (
                      <p className={styles.roleDesc}>Technologies: {exp.technologies_used.join(', ')}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                <AlertCircle size={24} style={{ marginBottom: '12px' }} />
                <p>No work experience extracted</p>
              </div>
            )}
          </div>
        )}

        {/* EDUCATION PANEL */}
        {subTab === 'education' && (
          <div className={styles.educationGrid}>
            {educationEntries.length > 0 ? (
              educationEntries.map((edu, idx) => (
                <div key={idx} className={`${styles.eduCard} glass-card`}>
                  <div className={styles.eduHeader}>
                    <div className={styles.eduIconBox}>
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <h3 className={styles.degreeTitle}>{edu.degree || personalInfo.degree || 'Degree'}</h3>
                      <h4 className={styles.institutionName}>{edu.institution || personalInfo.college_name || 'Institution'}</h4>
                    </div>
                  </div>
                  <p className={styles.eduDetails}>Dates: {edu.dates || 'Not specified'}</p>
                  {edu.gpa && <p className={styles.eduDetails}>GPA: {edu.gpa}</p>}
                  {edu.coursework?.length > 0 && (
                    <p className={styles.eduDetails}>Relevant Coursework: {edu.coursework.join(', ')}</p>
                  )}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                <AlertCircle size={24} style={{ marginBottom: '12px' }} />
                <p>No education information extracted</p>
              </div>
            )}
          </div>
        )}

        {/* SKILLS PANEL */}
        {subTab === 'skills' && (
          <div className={styles.skillsGrid}>
            {skills.length > 0 ? (
              skillSections.map((section) => {
                const sectionSkills = skillCategories[section.key] || [];
                if (!sectionSkills.length) return null;
                return (
                  <div key={section.key} className={`${styles.skillsCategoryCard} glass-card`}>
                    <h3 className={styles.categoryTitle}>{section.title} ({sectionSkills.length})</h3>
                    <div className={styles.skillsTagCloud}>
                      {sectionSkills.map((skill, idx) => (
                        <div key={`${section.key}-${idx}`} className={styles.skillTag}>
                          <span className={styles.skillName}>{skill}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                <AlertCircle size={24} style={{ marginBottom: '12px' }} />
                <p>No skills extracted</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
