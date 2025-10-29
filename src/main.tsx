import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { validateEnv } from './config'; // Import validateEnv

// Call validateEnv early in the application lifecycle
validateEnv();

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  import.meta.env.DEV ? (
    <App />
  ) : (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);