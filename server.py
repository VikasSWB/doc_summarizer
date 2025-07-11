from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import os
import hashlib
from datetime import datetime
import google.generativeai as genai
from werkzeug.utils import secure_filename
import PyPDF2
import docx
import io
import logging




from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix  # Add this import
 
app = Flask(__name__)
 
# Add this middleware to handle base path
app.wsgi_app = ProxyFix(app.wsgi_app, x_prefix=1)
 
# Define your base path
BASE_PATH = "/docsummary"
 
# Update all routes to include BASE_PATH
@app.route(BASE_PATH + '/')
def home():
    return "Document Summarizer Home"
 
@app.route(BASE_PATH + '/summarize')
def summarize():
    # Your summarization code here
    return "Summary results"




# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



# Configuration
UPLOAD_FOLDER = 'uploads'
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc', 'txt'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'docsummarizer')
}

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash')
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")
    model = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_db_connection():
    """Create and return a database connection"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        return connection
    except Error as e:
        logger.error(f"Database connection error: {e}")
        return None

def extract_text_from_file(file):
    """Extract text content from uploaded file"""
    filename = file.filename.lower()
    
    try:
        if filename.endswith('.pdf'):
            return extract_text_from_pdf(file)
        elif filename.endswith('.docx'):
            return extract_text_from_docx(file)
        elif filename.endswith('.txt'):
            return file.read().decode('utf-8')
        else:
            raise ValueError("Unsupported file type")
    except Exception as e:
        logger.error(f"Error extracting text from file: {e}")
        raise

def extract_text_from_pdf(file):
    """Extract text from PDF file"""
    text = ""
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
    
    for page in pdf_reader.pages:
        text += page.extract_text()
    
    return text

def extract_text_from_docx(file):
    """Extract text from DOCX file"""
    doc = docx.Document(io.BytesIO(file.read()))
    text = ""
    
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    
    return text

def call_gemini_api(file_content, file_name):
    """Generate summary using Gemini API"""
    if not model:
        # Return mock summary if API key is not configured
        return f"""This document discusses key concepts and strategies for effective communication and project management. The main points include:

• Strategic planning and goal setting methodologies
• Team collaboration and communication best practices  
• Risk management and mitigation strategies
• Performance metrics and evaluation criteria
• Implementation timelines and resource allocation

The document emphasizes the importance of clear communication channels and regular progress reviews to ensure project success. It also highlights the need for adaptable strategies that can respond to changing market conditions and stakeholder requirements.

Key recommendations include establishing clear roles and responsibilities, implementing regular check-ins, and maintaining comprehensive documentation throughout the project lifecycle.

*Note: This is a mock summary. Please configure GEMINI_API_KEY for actual AI summarization."""

    try:
        prompt = f"""Please provide a comprehensive summary of the following document titled "{file_name}":

{file_content}

Please include:
- Main topics and key points
- Important conclusions or recommendations
- Any significant data or statistics mentioned
- Overall purpose and context of the document

Format the summary in a clear, bullet-pointed structure."""

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise

def save_summary_to_database(summary_data):
    """Save summary to MySQL database"""
    connection = get_db_connection()
    if not connection:
        raise Exception("Database connection failed")
    
    try:
        cursor = connection.cursor()
        
        query = """
        INSERT INTO summaries (file_name, file_size, original_content, summary, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """
        
        values = (
            summary_data['file_name'],
            summary_data['file_size'],
            summary_data.get('original_content', ''),
            summary_data['summary'],
            datetime.now()
        )
        
        cursor.execute(query, values)
        connection.commit()
        
        return cursor.lastrowid
    except Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def save_question_to_database(question_data):
    """Save question and answer to database"""
    connection = get_db_connection()
    if not connection:
        raise Exception("Database connection failed")
    
    try:
        cursor = connection.cursor()
        
        query = """
        INSERT INTO questions (summary_id, file_name, question, answer, is_suggested, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        values = (
            question_data.get('summary_id'),
            question_data['file_name'],
            question_data['question'],
            question_data['answer'],
            question_data.get('is_suggested', False),
            datetime.now()
        )
        
        cursor.execute(query, values)
        connection.commit()
        
        return cursor.lastrowid
    except Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def get_questions_by_file(file_name):
    """Retrieve questions for a specific file"""
    connection = get_db_connection()
    if not connection:
        return []
    
    try:
        cursor = connection.cursor(dictionary=True)
        
        query = """
        SELECT id, question, answer, is_suggested, created_at
        FROM questions 
        WHERE file_name = %s 
        ORDER BY created_at DESC
        """
        
        cursor.execute(query, (file_name,))
        questions = cursor.fetchall()
        
        return questions
    except Error as e:
        logger.error(f"Database error: {e}")
        return []
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def save_contact_message(contact_data):
    """Save contact message to database"""
    connection = get_db_connection()
    if not connection:
        raise Exception("Database connection failed")
    
    try:
        cursor = connection.cursor()
        
        query = """
        INSERT INTO contact_messages (name, email, subject, message, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        values = (
            contact_data['name'],
            contact_data['email'],
            contact_data['subject'],
            contact_data['message'],
            'new',
            datetime.now()
        )
        
        cursor.execute(query, values)
        connection.commit()
        
        return cursor.lastrowid
    except Error as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

@app.route('/')
def serve_index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

@app.route('/api/summarize', methods=['POST'])
def summarize_document():
    """Handle document summarization"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Invalid file type'}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'success': False, 'error': 'File too large'}), 400
        
        # Extract text from file
        file_content = extract_text_from_file(file)
        
        if not file_content.strip():
            return jsonify({'success': False, 'error': 'No text content found in file'}), 400
        
        # Generate summary using Gemini API
        summary = call_gemini_api(file_content, file.filename)
        
        # Save to database
        summary_data = {
            'file_name': file.filename,
            'file_size': file_size,
            'original_content': file_content[:5000],  # Store first 5000 chars
            'summary': summary
        }
        
        summary_id = save_summary_to_database(summary_data)
        
        return jsonify({
            'success': True,
            'summary': summary,
            'id': summary_id
        })
    
    except Exception as e:
        logger.error(f"Error in summarize_document: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/contact', methods=['POST'])
def handle_contact():
    """Handle contact form submissions"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        required_fields = ['name', 'email', 'subject', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'error': f'{field} is required'}), 400
        
        # Save to database
        contact_id = save_contact_message(data)
        
        return jsonify({
            'success': True,
            'message': 'Contact message received',
            'id': contact_id
        })
    
    except Exception as e:
        logger.error(f"Error in handle_contact: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/ask-question', methods=['POST'])
def ask_question():
    """Handle document Q&A using RAG approach"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        question = data.get('question')
        file_name = data.get('fileName', '')
        context = data.get('context', '')
        summary_id = data.get('summaryId')
        
        if not question:
            return jsonify({'success': False, 'error': 'Question is required'}), 400
        
        # Generate answer using Gemini API with RAG approach
        answer = generate_rag_answer(question, context, file_name)
        
        # Save question and answer to database
        question_data = {
            'summary_id': summary_id,
            'file_name': file_name,
            'question': question,
            'answer': answer,
            'is_suggested': False
        }
        
        question_id = save_question_to_database(question_data)
        
        return jsonify({
            'success': True,
            'answer': answer,
            'question': question,
            'id': question_id
        })
    
    except Exception as e:
        logger.error(f"Error in ask_question: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate-questions', methods=['POST'])
def generate_questions():
    """Generate suggested questions based on document content"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        file_name = data.get('fileName', '')
        summary = data.get('summary', '')
        summary_id = data.get('summaryId')
        
        if not summary:
            return jsonify({'success': False, 'error': 'Summary is required'}), 400
        
        # Generate suggested questions using Gemini API
        questions = generate_suggested_questions(summary, file_name)
        
        # Save suggested questions to database (without answers initially)
        for question in questions:
            question_data = {
                'summary_id': summary_id,
                'file_name': file_name,
                'question': question,
                'answer': '',  # Empty initially
                'is_suggested': True
            }
            save_question_to_database(question_data)
        
        return jsonify({
            'success': True,
            'questions': questions
        })
    
    except Exception as e:
        logger.error(f"Error in generate_questions: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/questions/<file_name>', methods=['GET'])
def get_file_questions(file_name):
    """Get all questions for a specific file"""
    try:
        questions = get_questions_by_file(file_name)
        
        return jsonify({
            'success': True,
            'questions': questions
        })
    
    except Exception as e:
        logger.error(f"Error in get_file_questions: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def generate_suggested_questions(summary, file_name):
    """Generate suggested questions using Gemini API"""
    if not model:
        # Return mock questions if API key is not configured
        return [
            "What are the main key points discussed in this document?",
            "What are the primary recommendations or conclusions?",
            "Are there any specific statistics or data mentioned?",
            "What is the overall purpose of this document?",
            "Who is the target audience for this document?"
        ]

    try:
        prompt = f"""Based on the following document summary for "{file_name}", generate 5 thoughtful and relevant questions that a user might want to ask about the document. The questions should help users explore key insights, understand important details, and uncover valuable information from the document.

Document Summary:
{summary}

Please provide exactly 5 questions, each on a new line, without numbering or bullet points. Make them specific to the content and context of this document."""

        response = model.generate_content(prompt)
        questions_text = response.text.strip()
        
        # Split by lines and clean up
        questions = [q.strip() for q in questions_text.split('\n') if q.strip()]
        
        # Ensure we have exactly 5 questions
        if len(questions) < 5:
            questions.extend([
                "What are the main conclusions of this document?",
                "Are there any important recommendations mentioned?",
                "What context or background information is provided?"
            ])
        
        return questions[:5]
    except Exception as e:
        logger.error(f"Gemini API error in question generation: {e}")
        return [
            "What are the main topics covered in this document?",
            "What are the key findings or conclusions?",
            "Are there any recommendations provided?",
            "What methodology or approach is discussed?",
            "Who would benefit most from this information?"
        ]
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'gemini_configured': model is not None
    })
