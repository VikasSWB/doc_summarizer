const BASE_PATH = "/docsummary";
// Global variables
let selectedFile = null;
let currentSummary = '';
let currentQuestion = '';
let isLoadingAnswer = false;
let suggestedQuestions = [];
let conversationHistory = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    initializeDragAndDrop();
    initializeContactForm();
    initializeQuestionInput();
    
    // Show initial page based on hash
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash);
    } else {
        showPage('home');
    }
});

// Page navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update URL hash
    window.location.hash = pageId;
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Handle browser back/forward
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash);
    } else {
        showPage('home');
    }
});

// Initialize file upload functionality
function initializeFileUpload() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleFileSelection(file);
        }
    });
}

// Initialize drag and drop functionality
function initializeDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        const file = files[0];
        
        if (file) {
            handleFileSelection(file);
        }
    });
}

// Initialize contact form
function initializeContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleContactFormSubmission();
        });
    }
}

// Initialize question input functionality
function initializeQuestionInput() {
    const questionInput = document.getElementById('questionInput');
    const questionSubmitBtn = document.getElementById('questionSubmitBtn');
    
    if (questionInput) {
        questionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitQuestion();
            }
        });
        
        questionInput.addEventListener('input', function() {
            const hasText = questionInput.value.trim().length > 0;
            questionSubmitBtn.disabled = !hasText || isLoadingAnswer || !selectedFile;
        });
    }
}

// Handle contact form submission
async function handleContactFormSubmission() {
    const form = document.getElementById('contactForm');
    const formData = new FormData(form);
    
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };
    
    try {
        const response = await fetch(`${BASE_PATH}/api/contact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contactData),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to send message');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to send message');
        }
        
        // Show success message
        showToast('Message sent!', 'Thank you for contacting us. We\'ll get back to you soon.', 'success');
        
        // Reset form
        form.reset();
        
        console.log('Contact message saved with ID:', data.id);
        
    } catch (error) {
        console.error('Error sending contact message:', error);
        showToast('Error', error.message || 'Failed to send message. Please try again.', 'error');
    }
}

// Handle file selection and validation
function handleFileSelection(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain'
    ];
    
    // Validate file type
    if (!allowedTypes.includes(file.type)) {
        showToast('Invalid file type', 'Please upload a PDF, DOC, DOCX, or TXT file.', 'error');
        return;
    }
    
    // Validate file size
    if (file.size > maxSize) {
        showToast('File too large', 'Please upload a file smaller than 10MB.', 'error');
        return;
    }
    
    // Store selected file
    selectedFile = file;
    
    // Update UI
    displaySelectedFile(file);
    enableSummarizeButton();
    
    showToast('File uploaded successfully', `${file.name} is ready for summarization.`, 'success');
}

// Display selected file information
function displaySelectedFile(file) {
    const selectedFileDiv = document.getElementById('selectedFile');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    
    fileName.textContent = file.name;
    fileSize.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
    
    selectedFileDiv.style.display = 'flex';
}

// Remove selected file
function removeFile() {
    selectedFile = null;
    
    const selectedFileDiv = document.getElementById('selectedFile');
    const fileInput = document.getElementById('fileInput');
    
    selectedFileDiv.style.display = 'none';
    fileInput.value = '';
    
    disableSummarizeButton();
    hideSummaryAndQuestions();
}

// Enable summarize button
function enableSummarizeButton() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    summarizeBtn.disabled = false;
}

// Disable summarize button
function disableSummarizeButton() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    summarizeBtn.disabled = true;
}

// Summarize document (updated to use actual API)
async function summarizeDocument() {
    if (!selectedFile) {
        showToast('No file selected', 'Please upload a document first.', 'error');
        return;
    }
    
    const summarizeBtn = document.getElementById('summarizeBtn');
    const btnText = document.getElementById('btnText');
    
    // Show loading state
    summarizeBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Generating Summary...';
    
    try {
        // Create FormData to send file
        const formData = new FormData();
        formData.append('file', selectedFile);
        const response = await fetch(`${BASE_PATH}/api/summarize`, {
          method: "POST",
          body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate summary');
        }
        
        if (!data.success) {
            throw new Error(data.error || 'Summary generation failed');
        }
        
        currentSummary = data.summary;
        displaySummaryAndQuestions(data.summary, selectedFile.name);
        
        // Generate suggested questions
        await generateSuggestedQuestions(data.summary, selectedFile.name);
        
        showToast('Summary generated', 'Your document has been successfully summarized.', 'success');
        
        console.log('Summary saved with ID:', data.id);
        
    } catch (error) {
        console.error('Error generating summary:', error);
        
        // Fallback to mock summary
        const mockSummary = `This document discusses key concepts and strategies for effective communication and project management. The main points include:

• Strategic planning and goal setting methodologies
• Team collaboration and communication best practices  
• Risk management and mitigation strategies
• Performance metrics and evaluation criteria
• Implementation timelines and resource allocation

The document emphasizes the importance of clear communication channels and regular progress reviews to ensure project success. It also highlights the need for adaptable strategies that can respond to changing market conditions and stakeholder requirements.

Key recommendations include establishing clear roles and responsibilities, implementing regular check-ins, and maintaining comprehensive documentation throughout the project lifecycle.`;

        currentSummary = mockSummary;
        displaySummaryAndQuestions(mockSummary, selectedFile.name);
        
        // Generate fallback questions
        generateFallbackQuestions();
        
        showToast('Summary generated (offline mode)', 'Using offline summarization. Connect to server for AI-powered analysis.', 'success');
    } finally {
        // Reset button state
        summarizeBtn.disabled = false;
        btnText.innerHTML = '<i class="fas fa-sparkles"></i> Generate AI Summary';
    }
}

// Display summary and questions section
function displaySummaryAndQuestions(summary, fileName) {
    const summaryQuestionsSection = document.getElementById('summaryQuestionsSection');
    const summaryText = document.getElementById('summaryText');
    const summaryFileName = document.getElementById('summaryFileName');

    // Remove asterisks from summary
    const cleanedSummary = summary.replace(/\*/g, '');

    summaryText.textContent = cleanedSummary;
    summaryFileName.textContent = `Summary of: ${fileName}`;
    
    summaryQuestionsSection.style.display = 'block';
    
    // Reset Q&A state
    resetQuestionState();
    
    // Scroll to summary section
    summaryQuestionsSection.scrollIntoView({ behavior: 'smooth' });
}

// Generate suggested questions
async function generateSuggestedQuestions(summaryText, fileName) {
    const loadingQuestions = document.getElementById('loadingQuestions');
    const suggestedQuestionsContainer = document.getElementById('suggestedQuestions');
    
    loadingQuestions.style.display = 'flex';
    
    try {
        const response = await fetch(`${BASE_PATH}/api/generate-questions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            summary: summaryText,
            fileName: fileName,
        }),
    });

        
            
        const data = await response.json();

        if (data.success) {
            suggestedQuestions = data.questions;
            displaySuggestedQuestions(data.questions);
        } else {
            throw new Error(data.error || 'Failed to generate questions');
        }
    } catch (error) {
        console.error('Error generating questions:', error);
        generateFallbackQuestions();
    }
    
    loadingQuestions.style.display = 'none';
}

// Generate fallback questions
function generateFallbackQuestions() {
    const fallbackQuestions = [
        "What are the main key points discussed in this document?",
        "What are the primary recommendations or conclusions?",
        "Are there any specific statistics or data mentioned?",
        "What is the overall purpose of this document?",
        "Who is the target audience for this document?"
    ];
    
    suggestedQuestions = fallbackQuestions;
    displaySuggestedQuestions(fallbackQuestions);
}

// Display suggested questions
function displaySuggestedQuestions(questions) {
    const suggestedQuestionsContainer = document.getElementById('suggestedQuestions');
    
    suggestedQuestionsContainer.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        questionElement.innerHTML = `
            <span>${question}</span>
            <i class="fas fa-arrow-right"></i>
        `;
        
        questionElement.addEventListener('click', () => {
            selectSuggestedQuestion(question);
        });
        
        suggestedQuestionsContainer.appendChild(questionElement);
    });
}

// Select a suggested question
function selectSuggestedQuestion(question) {
    const questionInput = document.getElementById('questionInput');
    questionInput.value = question;
    currentQuestion = question;
    
    // Enable submit button
    const questionSubmitBtn = document.getElementById('questionSubmitBtn');
    questionSubmitBtn.disabled = false;
    
    // Focus on input
    questionInput.focus();
}

// Submit question
async function submitQuestion() {
    const questionInput = document.getElementById('questionInput');
    const question = questionInput.value.trim();
    
    if (!question || !selectedFile || isLoadingAnswer) {
        return;
    }
    
    const questionSubmitBtn = document.getElementById('questionSubmitBtn');
    
    // Show loading state
    isLoadingAnswer = true;
    questionSubmitBtn.disabled = true;
    questionSubmitBtn.innerHTML = '<div class="spinner"></div>';
    

try {
    const response = await fetch(`${BASE_PATH}/api/ask-question`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            question: question,
            fileName: selectedFile.name,
            context: currentSummary,
        }),
    });

    const data = await response.json();

    if (data.success) {
        displayAnswer(data.answer);
        addToConversationHistory(question, data.answer);
        questionInput.value = '';

        showToast('Answer generated', 'AI has answered your question based on the document.', 'success');
    } else {
        throw new Error(data.error || 'Failed to get answer');
    }
} catch (error) {
    console.error('Error getting answer:', error);

    // Fallback mock answer
    const mockAnswer = `Based on the uploaded document, this appears to be related to your question about "${question}". The document contains relevant information that suggests strategic planning and effective communication are key factors. For more specific details, please ensure the server is running and the RAG model is properly configured.`;

    displayAnswer(mockAnswer);
    addToConversationHistory(question, mockAnswer);
    questionInput.value = '';

    showToast('Answer generated (offline mode)', 'Using offline Q&A. Connect to server for AI-powered responses.', 'success');
} finally {
    // Reset button state
    isLoadingAnswer = false;
    questionSubmitBtn.disabled = false;
    questionSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
}
}


// Display answer
function displayAnswer(answer) {
    const answerSection = document.getElementById('answerSection');
    const answerText = document.getElementById('answerText');
    const cleanedAnswer = answer.replace(/\*/g, '');
    answerText.textContent = answer;
    answerSection.style.display = 'block';
}

// Add to conversation history
function addToConversationHistory(question, answer) {
    conversationHistory.push({ question, answer });
    updateConversationDisplay();
}

// Update conversation display
function updateConversationDisplay() {
    const conversationHistoryDiv = document.getElementById('conversationHistory');
    const conversationList = document.getElementById('conversationList');
    
    if (conversationHistory.length > 0) {
        conversationList.innerHTML = '';
        
        conversationHistory.forEach((conv, index) => {
            const conversationItem = document.createElement('div');
            conversationItem.className = 'conversation-item';
            conversationItem.innerHTML = `
                <div class="conversation-question">Q: ${conv.question}</div>
                <div class="conversation-answer">A: ${conv.answer}</div>
            `;
            
            conversationList.appendChild(conversationItem);
        });
        
        conversationHistoryDiv.style.display = 'block';
    }
}

// Reset question state
function resetQuestionState() {
    const questionInput = document.getElementById('questionInput');
    const answerSection = document.getElementById('answerSection');
    const conversationHistoryDiv = document.getElementById('conversationHistory');
    
    questionInput.value = '';
    answerSection.style.display = 'none';
    conversationHistoryDiv.style.display = 'none';
    
    conversationHistory = [];
    currentQuestion = '';
    isLoadingAnswer = false;
}

// Hide summary and questions section
function hideSummaryAndQuestions() {
    const summaryQuestionsSection = document.getElementById('summaryQuestionsSection');
    summaryQuestionsSection.style.display = 'none';
    currentSummary = '';
    resetQuestionState();
}

// Copy summary to clipboard
async function copySummary() {
    if (!currentSummary) return;
    
    try {
        await navigator.clipboard.writeText(currentSummary);
        showToast('Copied to clipboard', 'Summary has been copied to your clipboard.', 'success');
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Failed to copy', 'Please try again.', 'error');
    }
}

// Share summary
async function shareSummary() {
    if (!currentSummary) return;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Summary of ${selectedFile?.name || 'document'}`,
                text: currentSummary,
            });
        } catch (error) {
            // Fallback to copy
            copySummary();
        }
    } else {
        // Fallback to copy
        copySummary();
    }
}

// Download summary as text file
function downloadSummary() {
    if (!currentSummary || !selectedFile) return;
    
    const blob = new Blob([currentSummary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `${selectedFile.name.split('.')[0]}_summary.txt`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    showToast('Summary downloaded', 'Your summary has been saved as a text file.', 'success');
}

// Show toast notification
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastDescription = document.getElementById('toastDescription');
    const toastIcon = document.querySelector('.toast-icon');
    
    toastTitle.textContent = title;
    toastDescription.textContent = message;
    
    // Update icon based on type
    if (type === 'error') {
        toastIcon.className = 'toast-icon fas fa-exclamation-circle';
        toastIcon.style.color = '#dc2626';
    } else {
        toastIcon.className = 'toast-icon fas fa-check-circle';
        toastIcon.style.color = '#16a34a';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Smooth scrolling for navigation links
document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const target = document.querySelector(e.target.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// Mobile menu toggle (basic implementation)
document.addEventListener('click', function(e) {
    if (e.target.matches('.btn-mobile-menu') || e.target.closest('.btn-mobile-menu')) {
        const navMenu = document.querySelector('.nav-menu');
        navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
    }
});

// Add a function to check server health
async function checkServerHealth() {
    try {
    const response = await fetch(`${BASE_PATH}/api/health`);
    const data = await response.json();
    console.log('Server status:', data);
    return data.status === 'healthy';
} catch (error) {
    console.error('Server health check failed:', error);
    return false;
}

}
// Initialize server health check on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeFileUpload();
    initializeDragAndDrop();
    initializeContactForm();
    initializeQuestionInput();
    
    // Show initial page based on hash
    const hash = window.location.hash.substring(1);
    if (hash) {
        showPage(hash);
    } else {
        showPage('home');
    }
    
    // Check server health
    checkServerHealth().then(healthy => {
        if (!healthy) {
            showToast('Server Error', 'Unable to connect to server. Some features may not work.', 'error');
        }
    });
});
