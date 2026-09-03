import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Default to Light Mode unless explicitly set to Dark in localStorage
const savedTheme = localStorage.getItem('fabriq_theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
} else {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
  localStorage.setItem('fabriq_theme', 'light');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
