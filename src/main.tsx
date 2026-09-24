import React from 'react';
import ReactDOM from 'react-dom/client';
import { BudgetProvider } from './context/BudgetContext';
import { ToastProvider } from './context/ToastContext';
import { BudgetAppContent } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <BudgetProvider>
        <BudgetAppContent />
      </BudgetProvider>
    </ToastProvider>
  </React.StrictMode>
);
