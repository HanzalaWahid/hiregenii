# Database Design Document

## Overview

This database is designed for a Resume Intelligence Platform that stores user profiles, resumes, skill knowledge, matching results, job data, and AI provider configuration.

The system is structured as a layered domain model with clear separation between:
- user data
- resume data
- knowledge data
- analysis results
- job information
- AI provider integration

---

## 1. Database Goals

The database should support the following core needs:

- Store user accounts and profiles
- Manage multiple resume versions per user
- Store extracted resume sections such as experience, education, projects, certifications, and languages
- Maintain a skill knowledge base with canonical names and aliases
- Track unknown or unresolved skills for future enrichment
- Store ATS analysis results and recommendations
- Store job descriptions and matching results
- Support optional AI provider usage such as Gemini
- Support future resume builder and versioning workflows

---

## 2. Core Design Principles

- Use a relational database such as PostgreSQL
- Keep domain boundaries clear
- Each table should have a stable primary key
- Use timestamps for auditing and traceability
- Use soft deletes where appropriate for data recovery
- Normalize skills and aliases to avoid duplication
- Keep AI provider configuration separate from business logic
- Favor durable domain models over ad hoc JSON-heavy storage, except for flexible metadata

---

## 3. Domain Architecture

### User Domain
Responsible for user identity and ownership.

Entities:
- Users
- User Profiles
- User Settings

### Resume Domain
Responsible for all resume-related data.

Entities:
- Resumes
- Resume Versions
- Resume Sections
- Experience
- Education
- Projects
- Certifications
- Languages
- Skills extracted in resume context

### Knowledge Domain
Responsible for canonicalized skills and learned vocabulary.

Entities:
- Skills
- Skill Categories
- Skill Aliases
- Knowledge Candidates
- Knowledge Observations
- Skill Relationships

### Analysis Domain
Responsible for scoring, recommendations, and validation.

Entities:
- Analysis Runs
- ATS Results
- Recommendations
- Feedback
- Validation Records

### Job Domain
Responsible for storing job postings and evaluation.

Entities:
- Job Descriptions
- Job Requirements
- Job Matches
- Match Details

### AI / Provider Domain
Responsible for provider configuration and usage tracking.

Entities:
- API Providers
- API Keys
- Usage Logs
- Provider Configurations

---

## 4. Recommended Table Structure

### 4.1 User Domain

#### users
Purpose:
- Stores the main user account

Suggested fields:
- id
- email
- password_hash
- full_name
- created_at
- updated_at
- is_active
- is_verified

#### user_profiles
Purpose:
- Stores profile-level metadata for each user

Suggested fields:
- id
- user_id
- headline
- location
- phone
- linked_in
- portfolio_url
- bio
- created_at
- updated_at

#### user_settings
Purpose:
- Stores preferences for analysis and UI behavior

Suggested fields:
- id
- user_id
- timezone
- default_resume_format
- match_threshold
- notification_preferences
- created_at
- updated_at

---

### 4.2 Resume Domain

#### resumes
Purpose:
- Represents the main resume entity for a user

Suggested fields:
- id
- user_id
- title
- source_type
- source_file_name
- raw_text
- status
- created_at
- updated_at

#### resume_versions
Purpose:
- Keeps multiple versions of the same resume over time

Suggested fields:
- id
- resume_id
- version_number
- normalized_text
- extracted_json
- file_path
- created_by
- created_at
- is_current

#### experience
Purpose:
- Stores work experience entries

Suggested fields:
- id
- resume_version_id
- company_name
- role_title
- start_date
- end_date
- description
- location
- is_current
- created_at

#### education
Purpose:
- Stores educational background

Suggested fields:
- id
- resume_version_id
- institution_name
- degree
- field_of_study
- start_date
- end_date
- grade
- created_at

#### projects
Purpose:
- Stores project experience

Suggested fields:
- id
- resume_version_id
- project_name
- description
- technologies
- url
- start_date
- end_date
- created_at

#### certifications
Purpose:
- Stores credentials and certifications

Suggested fields:
- id
- resume_version_id
- name
- issuer
- issued_date
- expiry_date
- credential_id
- created_at

#### languages
Purpose:
- Stores language skills

Suggested fields:
- id
- resume_version_id
- language_name
- proficiency_level
- created_at

#### resume_skills
Purpose:
- Tracks skills found in a resume version and their normalization

Suggested fields:
- id
- resume_version_id
- skill_id
- raw_skill_name
- normalized_skill_name
- confidence_score
- source
- created_at

---

### 4.3 Knowledge Domain

#### skill_categories
Purpose:
- Groups skills into high-level categories

Suggested fields:
- id
- name
- description
- parent_category_id
- created_at

#### skills
Purpose:
- Canonical skill records

Suggested fields:
- id
- canonical_name
- category_id
- subcategory
- description
- confidence_score
- status
- created_at
- updated_at

#### skill_aliases
Purpose:
- Stores alternate names, abbreviations, and variations

Suggested fields:
- id
- skill_id
- alias_name
- alias_type
- created_at

Example:
- IFRS 17
- IFRS17
- International Financial Reporting Standard 17

#### knowledge_candidates
Purpose:
- Stores a skill or term that was not yet approved into the canonical knowledge base

Suggested fields:
- id
- raw_term
- detected_context
- source_type
- source_reference
- extracted_from_resume_id
- status
- created_at
- updated_at

#### knowledge_observations
Purpose:
- Tracks evidence of skill usage across resumes or jobs

Suggested fields:
- id
- skill_id
- observed_in
- observation_type
- evidence_text
- source_id
- created_at

#### skill_relationships
Purpose:
- Stores relationships between skills and domains

Suggested fields:
- id
- skill_id
- related_skill_id
- relationship_type
- confidence_score
- created_at

Example relationship types:
- same_as
- parent_of
- related_to
- prerequisite_for

---

### 4.4 Analysis Domain

#### analysis_runs
Purpose:
- Represents one ATS analysis execution for a resume version

Suggested fields:
- id
- resume_version_id
- user_id
- run_status
- ats_score
- overall_summary
- created_at
- completed_at

#### ats_results
Purpose:
- Stores detailed ATS metrics and scoring breakdown

Suggested fields:
- id
- analysis_run_id
- category_name
- score
- max_score
- details
- created_at

Example categories:
- keyword_match
- experience_alignment
- education_match
- formatting_compatibility
- skills_coverage

#### recommendations
Purpose:
- Stores optimization suggestions generated from ATS analysis

Suggested fields:
- id
- analysis_run_id
- recommendation_type
- title
- description
- priority
- created_at

#### feedback
Purpose:
- Stores user feedback on recommendations or analysis

Suggested fields:
- id
- analysis_run_id
- user_id
- feedback_type
- comment
- rating
- created_at

---

### 4.5 Job Domain

#### job_descriptions
Purpose:
- Stores raw job data

Suggested fields:
- id
- title
- company_name
- location
- employment_type
- description
- posted_at
- source_url
- created_at

#### job_requirements
Purpose:
- Stores extracted job requirement data

Suggested fields:
- id
- job_description_id
- requirement_type
- requirement_text
- canonical_skill_id
- created_at

#### job_matches
Purpose:
- Stores candidate-to-job match records

Suggested fields:
- id
- user_id
- resume_id
- job_description_id
- match_score
- created_at

#### match_details
Purpose:
- Stores detailed match explanations

Suggested fields:
- id
- job_match_id
- matched_skill_id
- match_strength
- reason
- created_at

---

### 4.6 AI / Provider Domain

#### api_providers
Purpose:
- Stores supported AI or external providers

Suggested fields:
- id
- name
- provider_type
- is_active
- api_base_url
- created_at

Examples:
- Gemini
- OpenAI
- Local model provider

#### api_keys
Purpose:
- Stores provider credentials securely

Suggested fields:
- id
- provider_id
- user_id
- key_name
- encrypted_key
- status
- created_at
- expires_at

#### provider_usage
Purpose:
- Tracks API calls and cost

Suggested fields:
- id
- provider_id
- user_id
- request_type
- model_name
- prompt_tokens
- completion_tokens
- cost
- created_at

---

## 5. Key Relationships

The database should model these relationships:

- One user has many resumes
- One resume has many resume versions
- One resume version has many experience records
- One resume version has many education records
- One resume version has many projects
- One resume version has many certifications
- One resume version has many languages
- One resume version has many extracted skills
- One skill can have many aliases
- One category can have many skills
- One skill can appear in many resume versions
- One analysis run belongs to one resume version
- One analysis run has many ATS results
- One analysis run has many recommendations
- One job description has many job requirements
- One user can have many job matches
- One job match relates to one resume and one job
- One provider can have many API keys
- One provider can have many usage records

---

## 6. Data Flow Design

The typical flow is:

- User uploads a resume
- System creates a resume and first version
- Parser extracts structured fields
- Skills are normalized against the knowledge base
- Unknown terms move to knowledge_candidates
- ATS analysis runs on the normalized resume
- Job matching compares resume skills to job requirements
- AI provider may assist in enrichment or unresolved-term resolution
- Knowledge is gradually stored and reused for future runs

This is important because it keeps learning local and operational, rather than relying on untrusted AI output for every resume.

---

## 7. Recommended Data Governance

For long-term product health, define these rules:

- Canonical skills must be reviewed before being promoted to the main skills table
- Unknown skill candidates must not be blindly trusted
- Alias resolution should be deterministic
- Analysis results should remain immutable once generated
- Resume versions should be preserved for auditability
- User-facing recommendations should be generated from normalized, validated data only

---

## 8. Suggested Naming Convention

Use clear, consistent names:
- singular table names such as user, resume, skill
- snake_case naming for columns
- foreign key names like user_id, resume_id, skill_id
- timestamps named created_at, updated_at, deleted_at
- status fields named status, run_status, provider_status

---

## 9. Recommended Implementation Strategy

For the first version:

- Build the user, resume, and analysis tables first
- Add the skills and alias tables next
- Add job domain after ATS scoring works
- Add AI/provider domain last, as optional integration
- Keep knowledge enrichment logic separate from core ATS logic

This helps avoid building too much complexity before the core product is stable.

---

## 10. Final Database Direction

This database model is a strong foundation for a Resume Intelligence Platform because it supports:

- resume lifecycle tracking
- raw and normalized skill logic
- future AI enrichment
- ATS analysis
- job matching
- long-term knowledge growth

This is the correct direction before deployment because it creates a scalable, structured base for the rest of the product.
