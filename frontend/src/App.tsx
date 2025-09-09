import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Layout from '@/components/Layout'
import UploadPage from '@/pages/UploadPage'
import ResultsPage from '@/pages/ResultsPage'

function App() {
  const isDarkMode = useAppStore((state) => state.isDarkMode)

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const savedTheme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
      document.documentElement.classList.add('dark')
      useAppStore.getState().toggleDarkMode()
    }
  }, [])

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/results/:jobId" element={<ResultsPage />} />
          <Route path="*" element={<Navigate to="/upload" replace />} />
        </Routes>
      </Layout>
    </div>
  )
}

export default App
