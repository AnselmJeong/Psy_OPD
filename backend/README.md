# Healthcare Survey Backend

FastAPI-based backend for a healthcare survey application that manages patient survey data, provides scoring algorithms for psychological assessment tools, and offers a clinician dashboard for data analysis.

## Features

- **User Authentication**: Support for patients (medical record number + birthdate/password) and clinicians (email-based)
- **Survey Management**: Collection, scoring, and storage of multiple survey types
- **Scoring Algorithms**: Automated scoring for AUDIT, PSQI, BDI, BAI, K-MDQ assessments
- **LLM Integration**: AI-generated summaries of survey results
- **Clinician Dashboard**: Analytics, trend visualization, and patient management
- **Role-based Access Control**: Patients access only their data, clinicians access all patients
- **Data Export**: CSV and JSON export capabilities for clinical use

## Supported Survey Types

- **AUDIT**: Alcohol Use Disorders Identification Test
- **PSQI**: Pittsburgh Sleep Quality Index
- **BDI**: Beck Depression Inventory
- **BAI**: Beck Anxiety Inventory
- **K-MDQ**: Korean Mood Disorder Questionnaire

## Tech Stack

- **Framework**: FastAPI 0.104.1
- **Database**: Firebase (Firestore + Authentication)
- **Authentication**: Firebase Auth with custom tokens
- **AI Integration**: OpenAI-compatible API for summaries
- **Testing**: pytest with async support
- **Validation**: Pydantic models

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py          # Authentication endpoints
│   │       ├── survey.py        # Survey submission/retrieval
│   │       ├── dashboard.py     # Clinician dashboard
│   │       └── user.py          # User profile management
│   ├── config/
│   │   └── settings.py          # Configuration management
│   ├── dependencies/
│   │   └── auth.py              # Authentication dependencies
│   ├── models/
│   │   ├── auth.py              # Authentication models
│   │   ├── survey.py            # Survey-related models
│   │   └── user.py              # User profile models
│   ├── services/
│   │   ├── firebase.py          # Firebase integration
│   │   ├── scoring.py           # Survey scoring algorithms
│   │   ├── llm.py               # LLM integration
│   │   └── analytics.py         # Data analytics service
│   ├── utils/
│   │   └── helpers.py           # Utility functions
│   └── main.py                  # FastAPI application
├── tests/
│   ├── conftest.py              # Test configuration
│   ├── test_auth.py             # Authentication tests
│   ├── test_scoring.py          # Scoring algorithm tests
│   └── test_api.py              # API integration tests
├── requirements.txt             # Python dependencies
├── run.py                       # Application runner
└── README.md                    # This file
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Firebase project with Firestore and Authentication enabled
- Firebase Admin SDK credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Firebase Setup**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore and Authentication
   - Generate Admin SDK private key
   - Place the JSON file in `secret/firebase_credentials.json`

5. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   DEBUG=True
   HOST=0.0.0.0
   PORT=8000
   FIREBASE_CREDENTIALS_PATH=secret/firebase_credentials.json
   LLM_API_KEY=your_llm_api_key_here
   LLM_API_BASE_URL=https://api.openai.com/v1
   ADMIN_SECRET_KEY=your_admin_secret_here
   SECRET_KEY=your_jwt_secret_here
   ```

6. **Run the application**
   ```bash
   python run.py
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/patient/update-password` - Update patient password
- `POST /api/v1/auth/clinician/register` - Register new clinician (admin only)

### Surveys
- `POST /api/v1/survey/submit` - Submit survey responses
- `GET /api/v1/survey/patient/{patient_id}` - Get patient surveys
- `GET /api/v1/survey/metadata` - Get available survey types

### Dashboard (Clinician only)
- `GET /api/v1/dashboard/patients` - Get all patients and their surveys
- `GET /api/v1/dashboard/patient/{patient_id}/trends` - Get trend data
- `GET /api/v1/dashboard/analytics` - Get analytics data
- `GET /api/v1/dashboard/patient/{patient_id}/export` - Export patient data

### User Management
- `GET /api/v1/user/{user_id}` - Get user profile
- `PUT /api/v1/user/{user_id}` - Update user profile

### Health
- `GET /` - Root endpoint
- `GET /health` - Health check

## Authentication

### Patient Authentication
- **Initial Login**: Medical record number + date of birth (YYYYMMDD format)
- **Subsequent Logins**: Medical record number + updated password
- **Password Updates**: Patients can change their password anytime

### Clinician Authentication
- **Registration**: Admin-only via `/auth/clinician/register` endpoint
- **Login**: Email address + admin-set password
- **Access**: Full access to all patient data and dashboard

## Survey Scoring

### AUDIT (Alcohol Use Disorders Identification Test)
- 10 questions, scored 0-4 each
- Total range: 0-40
- Interpretation: Low risk (≤7), Hazardous (8-15), Harmful (16-19), Dependence likely (≥20)

### BDI (Beck Depression Inventory)
- 21 questions, scored 0-3 each
- Total range: 0-63
- Interpretation: Minimal (0-13), Mild (14-19), Moderate (20-28), Severe (29-63)

### BAI (Beck Anxiety Inventory)
- 21 questions, scored 0-3 each
- Total range: 0-63
- Interpretation: Minimal (0-7), Mild (8-15), Moderate (16-25), Severe (26-63)

### PSQI (Pittsburgh Sleep Quality Index)
- 7 components, scored 0-3 each
- Total range: 0-21
- Interpretation: Good sleep quality (≤5), Poor sleep quality (>5)

### K-MDQ (Korean Mood Disorder Questionnaire)
- Part 1: 13 yes/no questions
- Part 2: Symptom clustering (yes/no)
- Part 3: Impairment level (0-3)
- Screening: Positive if Part 1 ≥7, Part 2 = yes, Part 3 ≥2

## Testing

Run the test suite:

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_scoring.py

# Run with verbose output
pytest -v
```

## Development

### Adding New Survey Types

1. **Add scoring function** in `app/services/scoring.py`
2. **Update survey metadata** in `app/api/v1/survey.py`
3. **Add interpretation logic** in scoring service
4. **Create LLM template** in `app/services/llm.py`
5. **Write tests** in `tests/test_scoring.py`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Enable debug mode | `True` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase credentials | `secret/firebase_credentials.json` |
| `LLM_API_KEY` | API key for LLM service | None |
| `LLM_API_BASE_URL` | LLM service base URL | `https://api.openai.com/v1` |
| `ADMIN_SECRET_KEY` | Secret key for admin operations | None |
| `SECRET_KEY` | JWT secret key | `your-secret-key-change-in-production` |

## Security Considerations

- Firebase credentials stored securely in `secret/` directory
- Role-based access control enforced at API level
- Patient data access restricted by user type
- Admin operations require secret key verification
- All API endpoints use proper authentication middleware

## Deployment

### Production Setup

1. **Set environment variables**:
   ```env
   DEBUG=False
   HOST=0.0.0.0
   PORT=8000
   SECRET_KEY=secure_random_key_here
   ADMIN_SECRET_KEY=secure_admin_key_here
   ```

2. **Configure Firebase security rules**
3. **Set up HTTPS/SSL certificates**
4. **Configure CORS for your frontend domain**
5. **Set up monitoring and logging**

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "run.py"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Run the test suite
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Check the API documentation at `/docs` when running the application 