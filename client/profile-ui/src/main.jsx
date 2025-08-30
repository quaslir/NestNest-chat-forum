import React from 'react';
import ReactDOM from 'react-dom/client';
import ProfileEditor from './ProfileEditor';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
const root = document.getElementById('profile-root');
if(root) {
  ReactDOM.createRoot(root).render(<ProfileEditor />);
}