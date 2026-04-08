import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--app-cursor', 'url("assets/cursors/key-main-aligned.png") 28 24, auto')
  document.documentElement.style.setProperty('--app-hover-cursor', 'url("assets/cursors/key-hover-aligned.png") 13 12, pointer')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
