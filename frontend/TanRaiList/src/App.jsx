import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch todos on component mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      const data = await response.json();
      setTodos(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching todos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    
    setIsAdding(true);
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newTodo, completed: false }),
      });

      if (!response.ok) {
        throw new Error('Failed to add todo');
      }

      const addedTodo = await response.json();
      setTodos([addedTodo, ...todos]);
      setNewTodo('');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error adding todo:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTodo = async (id) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === id);
      
      // Optimistic UI update
      setTodos(
        todos.map(todo =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
      
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          completed: !todoToUpdate.completed 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
        // Revert optimistic update if there's an error
        setTodos(
          todos.map(todo =>
            todo.id === id ? { ...todo, completed: todo.completed } : todo
          )
        );
      }
    } catch (err) {
      setError(err.message);
      console.error('Error updating todo:', err);
    }
  };

  const deleteTodo = async (id) => {
    // Optimistic UI update
    const previousTodos = [...todos];
    setTodos(todos.filter(todo => todo.id !== id));
    
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete todo');
        // Revert optimistic update if there's an error
        setTodos(previousTodos);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error deleting todo:', err);
      // Revert optimistic update if there's an error
      setTodos(previousTodos);
    }
  };

  // Helper to get relative time for a timestamp
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Difference in seconds
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} day(s) ago`;
  };

  return (
    <div className="app-container">
      <h1>My Tasks</h1>
      
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={addTodo} className="todo-form">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new task..."
          className="todo-input"
          disabled={isAdding}
        />
        <button 
          type="submit" 
          className="add-button"
          disabled={isAdding || !newTodo.trim()}
        >
          {isAdding ? 'Adding...' : 'Add Task'}
        </button>
      </form>
      
      {isLoading ? (
        <div className="loading">Loading your tasks...</div>
      ) : (
        <ul className="todo-list">
          {todos.length === 0 ? (
            <li className="empty-message">No tasks yet. Add one above!</li>
          ) : (
            todos.map(todo => (
              <li 
                key={todo.id} 
                className={`todo-item ${todo.completed ? 'completed' : ''}`}
              >
                <span 
                  className="todo-text"
                  onClick={() => toggleTodo(todo.id)}
                >
                  {todo.text}
                  {todo.created_at && (
                    <small style={{ 
                      display: 'block', 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)',
                      marginTop: '0.25rem'
                    }}>
                      {getRelativeTime(todo.created_at)}
                    </small>
                  )}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="delete-button"
                  aria-label="Delete todo"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default App;