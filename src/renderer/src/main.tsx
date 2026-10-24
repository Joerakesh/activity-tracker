
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'

function Root() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    html.classList.remove('is-scrolling')
    body.classList.remove('is-scrolling')

    html.classList.add('dashboard-document')
    body.classList.add('dashboard-document')

    let timeout: ReturnType<typeof setTimeout> | undefined

    const showScrollbar = () => {
      html.classList.add('is-scrolling')
      body.classList.add('is-scrolling')

      if (timeout) clearTimeout(timeout)

      timeout = setTimeout(() => {
        html.classList.remove('is-scrolling')
        body.classList.remove('is-scrolling')
      }, 900)
    }

    window.addEventListener('scroll', showScrollbar, { passive: true })

    return () => {
      window.removeEventListener('scroll', showScrollbar)
      if (timeout) clearTimeout(timeout)
      html.classList.remove('is-scrolling')
      body.classList.remove('is-scrolling')
    }
  }, [])

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
