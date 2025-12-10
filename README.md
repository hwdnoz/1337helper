## Setup

### Backend Setup

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip (Optional: if the warning annoys you)
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

## Run the application

### Backend

```bash
# Start Flask api
python app.py
```

Backend runs on `http://localhost:5001`

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Start server
npm run dev
```

Frontend runs on `http://localhost:3000`