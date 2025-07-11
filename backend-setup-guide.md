
# Backend Setup Guide for DocSummarizer

## 1. API Endpoints Setup

Create the following API endpoints in your backend server:

### POST /api/summarize
Handle document summarization using Gemini API

```javascript
// Example Node.js/Express endpoint
app.post('/api/summarize', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const fileContent = await extractTextFromFile(file);
        
        // Call Gemini API
        const summary = await callGeminiAPI(fileContent, file.originalname);
        
        // Save to database
        const summaryRecord = await saveSummaryToDatabase({
            summary,
            fileName: file.originalname,
            fileSize: file.size,
            createdAt: new Date()
        });
        
        res.json({ 
            success: true, 
            summary,
            id: summaryRecord.id 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
```

### POST /api/contact
Handle contact form submissions

```javascript
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Save to database
        const contactRecord = await saveContactMessage({
            name,
            email,
            subject,
            message,
            status: 'new',
            createdAt: new Date()
        });
        
        // Optionally send email notification
        await sendEmailNotification(contactRecord);
        
        res.json({ 
            success: true, 
            message: 'Contact message received' 
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});
```

## 2. MySQL Database Schema

Create the following tables:

### summaries table
```sql
CREATE TABLE summaries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    original_content LONGTEXT,
    summary LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### contact_messages table
```sql
CREATE TABLE contact_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message LONGTEXT NOT NULL,
    status ENUM('new', 'in_progress', 'resolved') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### users table (if implementing authentication)
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    plan ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
    documents_used INT DEFAULT 0,
    documents_limit INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 3. Gemini API Integration

### Install required packages:
```bash
npm install @google/generative-ai
```

### Example Gemini API implementation:
```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callGeminiAPI(fileContent, fileName) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `Please provide a comprehensive summary of the following document titled "${fileName}":

${fileContent}

Please include:
- Main topics and key points
- Important conclusions or recommendations
- Any significant data or statistics mentioned
- Overall purpose and context of the document

Format the summary in a clear, bullet-pointed structure.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to generate summary');
    }
}
```

## 4. File Processing Utilities

### Install file processing packages:
```bash
npm install multer pdf-parse mammoth
```

### Example file text extraction:
```javascript
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

async function extractTextFromFile(file) {
    const filePath = file.path;
    const fileType = file.mimetype;
    
    try {
        switch (fileType) {
            case 'application/pdf':
                const pdfBuffer = fs.readFileSync(filePath);
                const pdfData = await pdfParse(pdfBuffer);
                return pdfData.text;
                
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                const docxResult = await mammoth.extractRawText({ path: filePath });
                return docxResult.value;
                
            case 'application/msword':
                // Handle .doc files (requires additional libraries)
                throw new Error('DOC files not supported yet');
                
            case 'text/plain':
                return fs.readFileSync(filePath, 'utf8');
                
            default:
                throw new Error('Unsupported file type');
        }
    } finally {
        // Clean up uploaded file
        fs.unlinkSync(filePath);
    }
}
```

## 5. Environment Variables

Create a `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key_here
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=docsummarizer
PORT=3000
```

## 6. Server Setup Example

```javascript
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve your HTML/CSS/JS files

// Database connection
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// Add your API routes here
// ... (include the endpoints from above)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## 7. Frontend JavaScript Updates

Update your `script.js` file to use the actual API endpoints by uncommenting and modifying the fetch calls in the placeholder functions.

## 8. Getting Started

1. Set up a Node.js server with Express
2. Install all required dependencies
3. Create the MySQL database and tables
4. Get a Gemini API key from Google AI Studio
5. Configure your environment variables
6. Update the frontend JavaScript to call your actual API endpoints
7. Test the file upload and summarization functionality

This setup will give you a fully functional document summarizer with AI-powered analysis and database storage.
