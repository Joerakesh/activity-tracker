
import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Widget from './Widget'
import './assets/main.css'

const isWidget =
  new URLSearchParams(window.location.search).get('widget') === '1'

function Root() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    html.classList.remove('is-scrolling')
    body.classList.remove('is-scrolling')

    if (isWidget) {
      html.classList.add('widget-document')
      body.classList.add('widget-document')
      html.classList.remove('dashboard-document')
      body.classList.remove('dashboard-document')

      return
    }

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

  return isWidget ? <Widget /> : <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
