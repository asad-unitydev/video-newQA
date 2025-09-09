import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { videoApi, AnalysisResult, JobStatus } from '@/lib/api'
import VideoPlayer from '@/components/VideoPlayer'
import IssuesTable from '@/components/IssuesTable'
import MetricsView from '@/components/MetricsView'
import SummaryView from '@/components/SummaryView'

const ResultsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { 
    currentJobId, 
    setCurrentJob, 
    jobStatus, 
    setJobStatus, 
    analysisResult, 
    setAnalysisResult,
    isAnalyzing,
    setIsAnalyzing
  } = useAppStore()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load job data on mount
  useEffect(() => {
    if (!jobId) return

    const loadJobData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Set current job if not already set
        if (currentJobId !== jobId) {
          setCurrentJob(jobId)
        }

        // Get current status
        const status = await videoApi.getJobStatus(jobId)
        setJobStatus(status)

        // If job is complete, get results
        if (status.state === 'DONE') {
          const result = await videoApi.getJobResult(jobId)
          setAnalysisResult(result)
          setIsAnalyzing(false)
        } else if (status.state === 'RUNNING' || status.state === 'QUEUED') {
          setIsAnalyzing(true)
          
          // Start listening for updates
          const eventSource = videoApi.streamProgress(jobId, (updatedStatus) => {
            setJobStatus(updatedStatus)
            
            if (updatedStatus.state === 'DONE') {
              setIsAnalyzing(false)
              // Reload to get results
              loadJobData()
            } else if (updatedStatus.state === 'ERROR') {
              setIsAnalyzing(false)
              setError(updatedStatus.error || 'Analysis failed')
            }
          })

          return () => eventSource.close()
        } else if (status.state === 'ERROR') {
          setError(status.error || 'Analysis failed')
          setIsAnalyzing(false)
        }

      } catch (err) {
        console.error('Failed to load job data:', err)
        setError('Failed to load analysis results')
        setIsAnalyzing(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadJobData()
  }, [jobId, currentJobId, setCurrentJob, setJobStatus, setAnalysisResult, setIsAnalyzing])

  const handleDownloadReport = async (format: 'md' | 'pdf' | 'json') => {
    if (!jobId) return

    try {
      let blob: Blob
      let filename: string

      if (format === 'md') {
        blob = await videoApi.downloadMarkdownReport(jobId)
        filename = `${jobId}_report.md`
      } else if (format === 'pdf') {
        blob = await videoApi.downloadPdfReport(jobId)
        filename = `${jobId}_report.pdf`
      } else {
        // JSON format
        if (!analysisResult) return
        blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' })
        filename = `${jobId}_analysis.json`
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Download failed:', err)
      // TODO: Show error toast
    }
  }

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'DONE':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'RUNNING':
      case 'QUEUED':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (state: string) => {
    switch (state) {
      case 'DONE':
        return 'text-green-600 dark:text-green-400'
      case 'ERROR':
        return 'text-red-600 dark:text-red-400'
      case 'RUNNING':
      case 'QUEUED':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-yellow-600 dark:text-yellow-400'
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading analysis...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <span>Analysis Failed</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex space-x-3">
              <Button onClick={() => navigate('/upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Upload
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/upload')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">Analysis Results</h1>
            {analysisResult && (
              <p className="text-muted-foreground">{analysisResult.filename}</p>
            )}
          </div>
        </div>

        {analysisResult && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDownloadReport('json')}
            >
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDownloadReport('md')}
            >
              <Download className="h-4 w-4 mr-2" />
              Markdown
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDownloadReport('pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        )}
      </div>

      {/* Status Card */}
      {jobStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(jobStatus.state)}
                <div>
                  <p className={`font-medium ${getStatusColor(jobStatus.state)}`}>
                    {jobStatus.state.charAt(0) + jobStatus.state.slice(1).toLowerCase()}
                  </p>
                  {jobStatus.stage && (
                    <p className="text-sm text-muted-foreground">{jobStatus.stage}</p>
                  )}
                </div>
              </div>

              {(jobStatus.state === 'RUNNING' || jobStatus.state === 'QUEUED') && (
                <div className="flex-1 max-w-xs ml-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{jobStatus.progress}%</span>
                  </div>
                  <Progress value={jobStatus.progress} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysisResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <VideoPlayer 
              result={analysisResult}
              className="w-full"
            />
          </div>

          {/* Analysis Tabs */}
          <div className="space-y-6">
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="mt-4">
                <SummaryView summary={analysisResult.summary} />
              </TabsContent>

              <TabsContent value="audio" className="mt-4">
                <IssuesTable 
                  issues={analysisResult.audio_issues} 
                  title="Audio Issues"
                  emptyMessage="No audio issues detected"
                />
              </TabsContent>

              <TabsContent value="video" className="mt-4">
                <IssuesTable 
                  issues={analysisResult.video_issues} 
                  title="Video Issues"
                  emptyMessage="No video issues detected"
                />
              </TabsContent>

              <TabsContent value="metrics" className="mt-4">
                <MetricsView 
                  metadata={analysisResult.metadata}
                  metrics={analysisResult.metrics}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : isAnalyzing ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Analyzing Video</h3>
              <p className="text-muted-foreground mb-4">
                This may take several minutes depending on video length and complexity.
              </p>
              {jobStatus?.stage && (
                <p className="text-sm text-muted-foreground">
                  Current stage: {jobStatus.stage}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default ResultsPage
