/**
 * API Client — connects the React frontend to the FastAPI backend.
 * All backend communication goes through this module.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling.
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      errorDetail = errorBody.detail
        ? typeof errorBody.detail === 'string'
          ? errorBody.detail
          : JSON.stringify(errorBody.detail)
        : errorDetail;
    } catch {
      // Ignore JSON parse errors
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

/**
 * Analyze a resume file.
 * @param {File} file - The PDF or DOCX file to analyze.
 * @param {string} provider - Extraction provider: 'auto' | 'custom_rule' | 'gemini' | 'cerebras'
 * @returns {Promise<AnalysisResponse>}
 */
export async function analyzeResume(file, provider = 'custom_rule') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('provider', provider);

  return apiFetch('/api/analyze', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Get all skill mappings from the knowledge repository.
 * @returns {Promise<{mappings: SkillMapping[]}>}
 */
export async function getSkillMappings() {
  return apiFetch('/api/knowledge/skills');
}

/**
 * Add a new skill alias mapping.
 * @param {string} raw - Raw extracted term.
 * @param {string} normalized - Canonical normalized name.
 * @param {string} category - 'frontend' | 'backend' | 'devops'
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addSkillMapping(raw, normalized, category) {
  return apiFetch('/api/knowledge/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw, normalized, category }),
  });
}

/**
 * Delete a skill alias mapping.
 * @param {string} rawTerm - The raw term to delete.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteSkillMapping(rawTerm) {
  return apiFetch(`/api/knowledge/skills/${encodeURIComponent(rawTerm)}`, {
    method: 'DELETE',
  });
}

/**
 * Match a job description against resume skills.
 * @param {string} jobDescription - The job description text.
 * @param {string[]} skills - List of resume skills.
 * @returns {Promise<JobMatchResponse>}
 */
export async function matchJob(jobDescription, skills = []) {
  return apiFetch('/api/job-match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_description: jobDescription, skills }),
  });
}

/**
 * Health check — verifies the backend is reachable.
 * @returns {Promise<{status: string, version: string, providers: string[]}>}
 */
export async function checkHealth() {
  return apiFetch('/health');
}
