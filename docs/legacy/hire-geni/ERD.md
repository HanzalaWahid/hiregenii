# Entity Relationship Diagram (ERD)

## 1. Overview
This project stores recruitment data in a SQLite database using SQLAlchemy models. The main entities are users, jobs, CV records, applications, notifications, and interviews.

## 2. Core Entities

### User
- id
- email
- full_name
- role (`seeker` or `recruiter`)
- password_hash
- is_active
- created_at

### RecruiterProfile
- id
- user_id
- company_name
- company_website
- location
- industry
- company_description
- updated_at

### UserProfile
- id
- user_id
- skills
- experience
- education
- phone
- address
- current_university

### Job
- id
- recruiter_id
- title
- description
- experience_level
- required_skills
- created_at

### CVRecord
- id
- user_id
- candidate_id
- filename
- toggle_view
- original_text
- anonymized_text
- removed
- extracted
- scoring
- explanations
- recommendations
- created_at

### Application
- id
- job_id
- user_id
- cv_record_id
- score
- status
- reveal_status
- xai_explanation
- created_at

### Notification
- id
- user_id
- title
- message
- type
- read
- extra_data
- created_at

### Interview
- id
- job_id
- user_id
- scheduled_at
- meeting_link
- status
- created_at

## 3. Relationship Summary

```text
User 1---1 RecruiterProfile
User 1---* Job
User 1---* CVRecord
User 1---* Application
User 1---* Notification
User 1---* Interview

Recruiter 1---* Job
Job 1---* Application
CVRecord 1---* Application
Job 1---* Interview
User 1---* Interview
```

## 4. Important Business Rules
- A user can be either a recruiter or a seeker.
- Each recruiter can create many jobs.
- A seeker can upload multiple CV records.
- One application belongs to one job and one candidate.
- A CV record can be used by many applications, but explanation data is stored on each application to keep per-application context isolated.
- Notification records are linked directly to users.
- Interview records link a specific job, candidate, and scheduling time.

## 5. Key Implementation Notes
The actual ERD is represented in `backend/models.py`. This project uses SQLAlchemy ORM models rather than a separate database design file. For production use, migrations should be added and schema constraints should be explicitly versioned.
