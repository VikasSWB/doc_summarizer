
# Python Server Setup for Document Summarizer

## Prerequisites

- Python 3.8 or higher
- MySQL Server
- Gemini API key from Google AI Studio

## Installation Steps

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` file with your configuration:
```
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=docsummarizer
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Set up MySQL Database

1. Make sure MySQL server is running
2. Run the database setup script:
```bash
python setup_database.py
```

This will create the database and required tables.

### 4. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

### 5. Start the Server

```bash
python start_server.py
```

Or directly:
```bash
python server.py
```

The server will start on `http://localhost:5000`

## API Endpoints

- `POST /api/summarize` - Upload and summarize documents
- `POST /api/contact` - Handle contact form submissions
- `GET /api/health` - Server health check

## Supported File Types

- PDF (.pdf)
- Microsoft Word (.docx)
- Plain text (.txt)

## File Size Limit

Maximum file size: 10MB

## Database Tables

### summaries
- Stores document summaries and metadata

### contact_messages  
- Stores contact form submissions

## Troubleshooting

1. **Database Connection Error**: Check MySQL credentials in `.env`
2. **File Upload Error**: Ensure `uploads/` directory has write permissions
3. **Gemini API Error**: Verify API key is valid and has quota remaining

## Development

To run in development mode with auto-reload:
```bash
export FLASK_ENV=production
python server.py
```

## Production Deployment

For production, consider using:
- Gunicorn as WSGI server
- Nginx as reverse proxy
- Environment-specific configuration
- SSL certificates for HTTPS
