import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Widget from './Widget'
import './assets/main.css'

const isWidget = new URLSearchParams(window.location.search).get('widget') === '1'

if (isWidget) {
  // The compact widget has its own fixed-size layout and intentionally does not scroll.
  document.documentElement.classList.add('widget-document')
  document.body.classList.add('widget-document')
} else {
  // Make the dashboard document itself the vertical scroll container.
  document.documentElement.classList.add('dashboard-document')
  document.body.classList.add('dashboard-document')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isWidget ? <Widget /> : <App />}
  </React.StrictMode>
)
