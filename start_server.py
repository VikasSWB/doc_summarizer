
#!/usr/bin/env python3
"""
Startup script for the Document Summarizer server
"""
import os
import sys
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    
    # Check if required environment variables are set
    required_vars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please create a .env file based on .env.example")
        sys.exit(1)
    
    # Check for Gemini API key
    if not os.getenv('GEMINI_API_KEY'):
        print("Warning: GEMINI_API_KEY not set. AI summarization will use mock responses.")
    
    print("Starting Document Summarizer server...")
    print("Server will be available at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    
    # Import and run the Flask app
    from server import app
    app.run(debug=False, host='0.0.0.0', port=5000)

if __name__ == '__main__':
    main()
