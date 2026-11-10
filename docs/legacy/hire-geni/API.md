# API Documentation

## 1. Base URL
Local development:
- `http://127.0.0.1:8000`

## 2. Authentication
The platform uses JWT-based access tokens.

### Register a user
- `POST /auth/register`
- Body:
```json
{
  "full_name": "Ali Khan",
  "email": "ali@example.com",
  "password": "StrongPass123",
  "role": "seeker"
}
```

### Login
- `POST /auth/login`
- Body:
```json
{
  "email": "ali@example.com",
  "password": "StrongPass123"
}
```

### Get current user
- `GET /auth/me`
- Requires authentication token

## 3. Profile APIs
### Get own profile
- `GET /profile/me`

### Update own profile
- `PUT /profile/me`

### Get recruiter profile
- `GET /profile/recruiter`

### Update recruiter profile
- `PUT /profile/recruiter`

## 4. Job APIs
### List jobs
- `GET /jobs`

### List my jobs
- `GET /jobs/my`

### Create a job
- `POST /jobs`
- Body:
```json
{
  "title": "Senior Developer",
  "description": "Build backend APIs and microservices.",
  "experience_level": "senior",
  "required_skills": [
    { "skill": "Python", "weight": 5 },
    { "skill": "FastAPI", "weight": 5 }
  ]
}
```

### Get single job
- `GET /jobs/{job_id}`

## 5. CV APIs
### Upload CV
- `POST /cv/upload`
- Form-data: file upload

### Reprocess CV
- `POST /cv/re-process`

### Apply current CV to a job
- `POST /cv/apply-current`

### Get latest CV
- `GET /cv/my/latest`

### Get specific CV
- `GET /cv/{cv_id}`

### Anonymize a CV
- `POST /cv/anonymize`

## 6. Candidate Ranking and Shortlisting
### Get ranking for a job
- `GET /rank/{job_id}`

### Shortlist candidate for a job
- `POST /rank/{job_id}/shortlist/{candidate_id}`

### Get applications for current user
- `GET /applications/my`

### Shortlist application
- `POST /applications/{app_id}/shortlist`

### Reject application
- `POST /applications/{app_id}/reject`

### Get shortlisted jobs / applications
- `GET /shortlisted`

## 7. Reveal Workflow
### Request reveal
- `POST /applications/{app_id}/request-reveal`

### Respond to reveal request
- `POST /applications/{app_id}/respond-reveal`

## 8. Notifications and Interviews
### List notifications
- `GET /notifications`

### Create interview
- `POST /interviews`

### Get my interviews
- `GET /interviews/my`

### Get recruiter interviews
- `GET /interviews/recruiter`

## 9. Recommendation and Bias Report
### Recommendation endpoint
- `GET /recommend/{candidate_id}`

### Bias report
- `GET /bias-report`

## 10. WebSocket
### Job updates
- `WS /ws/jobs?token=<jwt_token>`

## 11. Notes
- Most endpoints require a valid JWT token.
- The implementation uses a local SQLite DB and is designed as a prototype.
- API responses are mostly JSON and follow Pydantic models defined in `backend/schemas.py`.
