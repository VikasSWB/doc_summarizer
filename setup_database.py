
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
}

DB_NAME = os.getenv('DB_NAME', 'docsummarizer')

def create_database():
    """Create the database if it doesn't exist"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        print(f"Database '{DB_NAME}' created successfully")
        
    except Error as e:
        print(f"Error creating database: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def create_tables():
    """Create the necessary tables"""
    try:
        # Connect to the specific database
        config_with_db = {**DB_CONFIG, 'database': DB_NAME}
        connection = mysql.connector.connect(**config_with_db)
        cursor = connection.cursor()
        
        # Create summaries table
        summaries_table = """
        CREATE TABLE IF NOT EXISTS summaries (
            id INT PRIMARY KEY AUTO_INCREMENT,
            file_name VARCHAR(255) NOT NULL,
            file_size INT NOT NULL,
            original_content LONGTEXT,
            summary LONGTEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """
        
        cursor.execute(summaries_table)
        print("Summaries table created successfully")
        
        # Create contact_messages table
        contact_table = """
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message LONGTEXT NOT NULL,
            status ENUM('new', 'in_progress', 'resolved') DEFAULT 'new',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
        """
        
        cursor.execute(contact_table)
        print("Contact messages table created successfully")
        
        # Create questions table
        questions_table = """
        CREATE TABLE IF NOT EXISTS questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            summary_id INT,
            file_name VARCHAR(255) NOT NULL,
            question TEXT NOT NULL,
            answer LONGTEXT NOT NULL,
            is_suggested BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (summary_id) REFERENCES summaries(id) ON DELETE CASCADE
        )
        """
        
        cursor.execute(questions_table)
        print("Questions table created successfully")
        
        connection.commit()
        
    except Error as e:
        print(f"Error creating tables: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

if __name__ == "__main__":
    print("Setting up database...")
    create_database()
    create_tables()
    print("Database setup complete!")
