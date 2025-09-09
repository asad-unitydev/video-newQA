import { create } from 'zustand'
import { AnalysisResult, JobStatus } from '@/lib/api'

interface AppState {
  // Theme
  isDarkMode: boolean
  toggleDarkMode: () => void

  // Current job
  currentJobId: string | null
  jobStatus: JobStatus | null
  analysisResult: AnalysisResult | null
  
  // UI state
  isAnalyzing: boolean
  selectedTimestamp: string | null

  // Actions
  setCurrentJob: (jobId: string) => void
  setJobStatus: (status: JobStatus) => void
  setAnalysisResult: (result: AnalysisResult) => void
  setIsAnalyzing: (analyzing: boolean) => void
  setSelectedTimestamp: (timestamp: string | null) => void
  clearJob: () => void
}

export const useAppStore = create<AppState>((set) => ({
  // Theme
  isDarkMode: false,
  toggleDarkMode: () => 
    set((state) => {
      const newMode = !state.isDarkMode
      // Update document class for theme switching
      if (typeof document !== 'undefined') {
        if (newMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
      return { isDarkMode: newMode }
    }),

  // Current job
  currentJobId: null,
  jobStatus: null,
  analysisResult: null,
  
  // UI state
  isAnalyzing: false,
  selectedTimestamp: null,

  // Actions
  setCurrentJob: (jobId: string) => 
    set({ currentJobId: jobId }),
  
  setJobStatus: (status: JobStatus) => 
    set({ jobStatus: status }),
  
  setAnalysisResult: (result: AnalysisResult) => 
    set({ analysisResult: result }),
  
  setIsAnalyzing: (analyzing: boolean) => 
    set({ isAnalyzing: analyzing }),
  
  setSelectedTimestamp: (timestamp: string | null) => 
    set({ selectedTimestamp: timestamp }),
  
  clearJob: () => 
    set({ 
      currentJobId: null, 
      jobStatus: null, 
      analysisResult: null, 
      isAnalyzing: false,
      selectedTimestamp: null 
    }),
}))
