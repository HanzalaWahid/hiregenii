def build_resume_extraction_prompt(raw_text: str) -> str:
    return f"""
You are an expert AI Resume Parser. Analyze the following resume raw text and extract structured information.
You must output a valid JSON block containing the exact keys specified in the schema below.
Do not include any chat prefix/suffix or markdown formatting outside of the valid JSON block.

JSON Schema:
{{
  "name": "Candidate Name (string or null)",
  "professional_title": "current professional title (string or null)",
  "email": "email address (string or null)",
  "mobile_number": "phone number (string or null)",
  "address": "candidate location/address (string or null)",
  "linkedin": "linkedin url (string or null)",
  "github": "github url (string or null)",
  "portfolio": "portfolio url (string or null)",
  "website": "personal website url (string or null)",
  "skills": ["list of technical and professional skills"],
  "technical_skills": ["technical skills only"],
  "soft_skills": ["soft skills only"],
  "skill_categories": {{"category_name": ["skills"]}},
  "college_name": "university/college name (string or null)",
  "degree": "academic degree name (string or null)",
  "designation": "latest or current job title/designation (string or null)",
  "company_names": ["list of companies worked at"],
  "experience": "raw summary or history of work experience (string or null)",
  "experiences": [
    {{
      "company": "string",
      "position": "string",
      "employment_period": "string",
      "location": "string",
      "responsibilities": ["list"],
      "achievements": ["list"],
      "technologies_used": ["list"]
    }}
  ],
  "total_experience": (float number of years of experience, e.g. 2.5),
  "projects": ["list of major projects"],
  "project_details": [{{"name": "string", "description": "string", "technologies": ["list"]}}],
  "internships": ["list of internships"],
  "achievements": ["list of honors/awards/achievements"],
  "certifications": ["list of certifications"],
  "languages": ["list of spoken languages"],
  "awards": ["list of awards"],
  "publications": ["list of publications"],
  "hobbies": ["list of hobbies"],
  "interests": ["list of fields of interest"],
  "objective": "career objective (string or null)",
  "education": "summary description of education details (string or null)",
  "education_entries": [{{"degree": "string", "institution": "string", "dates": "string", "gpa": "string", "coursework": ["list"]}}],
  "summary": "profile summary (string or null)"
}}

Resume text:
{raw_text}
"""
