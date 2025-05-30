Let’s design a FastAPI backend for your web app that handles patient surveys, stores data in a PostgreSQL database, includes authentication, and supports role-based access for patients and clinicians. The app will also need to calculate scores (to be implemented later) and store historical survey data for tracking changes over time, which can be visualized as a line graph.

### Overview of Requirements
1. **Authentication**: Patients and clinicians need to log in. Patients can only access their own data, while clinicians can access data for all patients.
2. **Database**: Use PostgreSQL to store user info, survey responses, and scores.
3. **Survey Workflow**: Patients can submit survey responses, and the system calculates a total score (placeholder for now). Historical data is stored for tracking.
4. **Role-Based Access**: Patients see their own surveys; clinicians see all patients’ surveys.
5. **Future Visualization**: Historical survey scores can be retrieved for line graph plotting.

### FastAPI Backend Design

#### Database Schema (Conceptual, for Context)
- **Users Table**: Stores user info (patients and clinicians).
  - `id`, `username`, `password` (hashed), `role` (patient/clinician), `email`.
- **Surveys Table**: Stores survey metadata.
  - `id`, `patient_id` (foreign key to Users), `created_at`, `total_score`.
- **Responses Table**: Stores individual survey responses.
  - `id`, `survey_id` (foreign key to Surveys), `question_id`, `answer` (e.g., Yes/No or 0/1).
- **Questions Table**: Stores survey questions (for reference).
  - `id`, `question_text`, `category` (e.g., demographic, medical history, BDI).

#### Authentication
- Use JWT (JSON Web Tokens) for authentication.
- Patients and clinicians will log in with a username/password.
- Role-based access will be enforced using a dependency in FastAPI.

#### FastAPI Routing and Functionality

Here’s the FastAPI backend design with routes and core functionality. I’ll include authentication, CRUD operations for surveys, and a placeholder for score calculation.

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import asyncpg
from enum import Enum

app = FastAPI()

# JWT Configuration
SECRET_KEY = "your-secret-key"  # Replace with a secure key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database connection pool
DATABASE_URL = "postgresql://user:password@localhost:5432/survey_db"  # Update with your credentials

async def get_db():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        await conn.close()

# Role Enum
class Role(str, Enum):
    PATIENT = "patient"
    CLINICIAN = "clinician"

# Pydantic Models
class User(BaseModel):
    username: str
    email: str
    role: Role

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    role: Role

class SurveyResponse(BaseModel):
    question_id: int
    answer: int  # 0 or 1 for Yes/No

class SurveyCreate(BaseModel):
    responses: List[SurveyResponse]

class Survey(BaseModel):
    id: int
    patient_id: int
    created_at: datetime
    total_score: float
    responses: List[SurveyResponse]

# Token Model
class Token(BaseModel):
    access_token: str
    token_type: str

# Helper Functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(db, username: str):
    query = "SELECT * FROM users WHERE username = $1"
    user = await db.fetchrow(query, username)
    if user:
        return UserInDB(**user)

async def authenticate_user(db, username: str, password: str):
    user = await get_user(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = await get_user(db, username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_patient(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != Role.PATIENT:
        raise HTTPException(status_code=403, detail="Not authorized as patient")
    return current_user

async def get_current_clinician(current_user: UserInDB = Depends(get_current_user)):
    if current_user.role != Role.CLINICIAN:
        raise HTTPException(status_code=403, detail="Not authorized as clinician")
    return current_user

# Routes

# 1. User Registration
@app.post("/register", response_model=User)
async def register_user(user: UserCreate, db = Depends(get_db)):
    hashed_password = get_password_hash(user.password)
    query = """
    INSERT INTO users (username, email, hashed_password, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, email, role
    """
    try:
        new_user = await db.fetchrow(query, user.username, user.email, hashed_password, user.role)
        return User(**new_user)
    except asyncpg.exceptions.UniqueViolationError:
        raise HTTPException(status_code=400, detail="Username already exists")

# 2. Login and Token Generation
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# 3. Submit a Survey (Patient Only)
@app.post("/surveys", response_model=Survey)
async def submit_survey(survey: SurveyCreate, current_user: UserInDB = Depends(get_current_patient), db = Depends(get_db)):
    # Placeholder for score calculation (to be implemented by human)
    total_score = 0  # Replace with actual calculation logic

    # Insert survey metadata
    query = """
    INSERT INTO surveys (patient_id, created_at, total_score)
    VALUES ($1, $2, $3)
    RETURNING id, patient_id, created_at, total_score
    """
    survey_data = await db.fetchrow(query, current_user.id, datetime.utcnow(), total_score)
    survey_id = survey_data["id"]

    # Insert responses
    for response in survey.responses:
        query = """
        INSERT INTO responses (survey_id, question_id, answer)
        VALUES ($1, $2, $3)
        """
        await db.execute(query, survey_id, response.question_id, response.answer)

    return Survey(id=survey_id, patient_id=current_user.id, created_at=survey_data["created_at"],
                  total_score=total_score, responses=survey.responses)

# 4. Get Patient's Own Surveys (Patient Only)
@app.get("/surveys/me", response_model=List[Survey])
async def get_my_surveys(current_user: UserInDB = Depends(get_current_patient), db = Depends(get_db)):
    # Fetch surveys
    query = "SELECT * FROM surveys WHERE patient_id = $1 ORDER BY created_at DESC"
    surveys = await db.fetch(query, current_user.id)

    # Fetch responses for each survey
    result = []
    for survey in surveys:
        query = "SELECT * FROM responses WHERE survey_id = $1"
        responses = await db.fetch(query, survey["id"])
        responses_list = [SurveyResponse(question_id=r["question_id"], answer=r["answer"]) for r in responses]
        result.append(Survey(id=survey["id"], patient_id=survey["patient_id"], created_at=survey["created_at"],
                            total_score=survey["total_score"], responses=responses_list))
    return result

# 5. Get All Surveys for a Patient (Clinician Only)
@app.get("/surveys/patient/{patient_id}", response_model=List[Survey])
async def get_patient_surveys(patient_id: int, current_user: UserInDB = Depends(get_current_clinician), db = Depends(get_db)):
    # Verify patient exists
    query = "SELECT * FROM users WHERE id = $1 AND role = $2"
    patient = await db.fetchrow(query, patient_id, Role.PATIENT)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Fetch surveys
    query = "SELECT * FROM surveys WHERE patient_id = $1 ORDER BY created_at DESC"
    surveys = await db.fetch(query, patient_id)

    # Fetch responses for each survey
    result = []
    for survey in surveys:
        query = "SELECT * FROM responses WHERE survey_id = $1"
        responses = await db.fetch(query, survey["id"])
        responses_list = [SurveyResponse(question_id=r["question_id"], answer=r["answer"]) for r in responses]
        result.append(Survey(id=survey["id"], patient_id=survey["patient_id"], created_at=survey["created_at"],
                            total_score=survey["total_score"], responses=responses_list))
    return result

# 6. Get Survey Scores for a Patient (For Line Graph, Clinician or Patient)
@app.get("/surveys/scores/{patient_id}", response_model=List[dict])
async def get_survey_scores(patient_id: int, current_user: UserInDB = Depends(get_current_user), db = Depends(get_db)):
    # Patients can only access their own scores
    if current_user.role == Role.PATIENT and current_user.id != patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this patient's data")

    # Fetch scores and timestamps
    query = "SELECT created_at, total_score FROM surveys WHERE patient_id = $1 ORDER BY created_at"
    scores = await db.fetch(query, patient_id)
    return [{"created_at": score["created_at"], "total_score": score["total_score"]} for score in scores]
```

### Explanation of Routes
1. **`/register`**: Allows new users (patients or clinicians) to register. Passwords are hashed using `bcrypt`.
2. **`/token`**: Authenticates users and returns a JWT token for accessing protected routes.
3. **`/surveys` (POST)**: Patients submit survey responses. The route stores the survey metadata and responses in the database. A placeholder for score calculation is included.
4. **`/surveys/me` (GET)**: Patients retrieve their own survey history.
5. **`/surveys/patient/{patient_id}` (GET)**: Clinicians retrieve survey history for a specific patient.
6. **`/surveys/scores/{patient_id}` (GET)**: Retrieves historical scores for a patient, which can be used to plot a line graph in the frontend.

### Next Steps
- **Database Setup**: Set up PostgreSQL with the schema mentioned (Users, Surveys, Responses, Questions tables).
- **Score Calculation**: Implement the score calculation logic in the `/surveys` POST route.
- **Frontend**: Build a frontend (e.g., using React) to interact with these endpoints, display forms for survey input, and visualize historical scores using a line graph (e.g., with a library like Chart.js).

Let me know if you’d like to proceed with the frontend design or any other part!
