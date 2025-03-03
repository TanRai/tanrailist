const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('build')); // For serving the React app

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST, // Your AWS RDS endpoint
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database and tables
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Create todos table if it doesn't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialized successfully');
    connection.release();
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

// Initialize database on server start
initDatabase();

// API Routes

// Get all todos
app.get('/api/todos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ message: 'Failed to fetch todos' });
  }
});

// Add a new todo
app.post('/api/todos', async (req, res) => {
  const { text, completed } = req.body;
  
  if (!text) {
    return res.status(400).json({ message: 'Todo text is required' });
  }
  
  try {
    const [result] = await pool.query(
      'INSERT INTO todos (text, completed) VALUES (?, ?)',
      [text, completed || false]
    );
    
    const [newTodo] = await pool.query(
      'SELECT * FROM todos WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newTodo[0]);
  } catch (error) {
    console.error('Error adding todo:', error);
    res.status(500).json({ message: 'Failed to add todo' });
  }
});

// Update a todo
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  
  try {
    let query = 'UPDATE todos SET ';
    const params = [];
    
    if (text !== undefined) {
      query += 'text = ?, ';
      params.push(text);
    }
    
    if (completed !== undefined) {
      query += 'completed = ?, ';
      params.push(completed);
    }
    
    // Remove trailing comma and space
    query = query.slice(0, -2);
    
    query += ' WHERE id = ?';
    params.push(id);
    
    const [result] = await pool.query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    
    const [updatedTodo] = await pool.query('SELECT * FROM todos WHERE id = ?', [id]);
    res.json(updatedTodo[0]);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ message: 'Failed to update todo' });
  }
});

// Delete a todo
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await pool.query('DELETE FROM todos WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Todo not found' });
    }
    
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ message: 'Failed to delete todo' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});