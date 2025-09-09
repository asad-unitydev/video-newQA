import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Upload, FileVideo, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { videoApi } from '@/lib/api'
import { formatFileSize, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska']
const MAX_FILE_SIZE = 1024 * 1024 * 1024 // 1GB

interface FilePreview {
  file: File
  duration?: number
  error?: string
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate()
  const { setCurrentJob, setIsAnalyzing, setJobStatus } = useAppStore()
  
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FilePreview | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please select a video file (MP4, MOV, AVI, WebM, MKV).'
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large. Maximum size is 1GB.'
    }
    
    return null
  }, [])

  const getVideoDuration = useCallback((file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(undefined)
      }
      
      video.src = URL.createObjectURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(async (file: File) => {
    const error = validateFile(file)
    
    if (error) {
      setSelectedFile({ file, error })
      return
    }

    // Try to get video duration for preview
    const duration = await getVideoDuration(file)
    setSelectedFile({ file, duration })
  }, [validateFile, getVideoDuration])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleStartAnalysis = useCallback(async () => {
    if (!selectedFile || selectedFile.error) return

    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      // Simulate upload progress (since axios doesn't provide real progress for our use case)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await videoApi.createJob(selectedFile.file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Set up job tracking
      setCurrentJob(response.job_id)
      setIsAnalyzing(true)
      
      // Start listening for progress updates
      const eventSource = videoApi.streamProgress(response.job_id, (status) => {
        setJobStatus(status)
        
        if (status.state === 'DONE' || status.state === 'ERROR') {
          setIsAnalyzing(false)
        }
      })

      // Navigate to results page
      navigate(`/results/${response.job_id}`)
      
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setUploadProgress(0)
      // TODO: Show error toast
    }
  }, [selectedFile, setCurrentJob, setIsAnalyzing, setJobStatus, navigate])

  const clearFile = useCallback(() => {
    setSelectedFile(null)
    setUploadProgress(0)
    setIsUploading(false)
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Video Quality Analysis</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Upload your video to get a comprehensive quality analysis including audio issues, 
          visual problems, and technical metrics.
        </p>
      </div>

      {/* Upload Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
          <CardDescription>
            Select a video file to analyze. Supported formats: MP4, MOV, AVI, WebM, MKV (max 1GB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drop Zone */}
          {!selectedFile && (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragOver ? 'Drop your video here' : 'Drag and drop your video here'}
                </p>
                <p className="text-sm text-muted-foreground">or click to browse files</p>
              </div>
              
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* File Preview */}
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileVideo className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.file.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{formatFileSize(selectedFile.file.size)}</span>
                      {selectedFile.duration && (
                        <span>{formatDuration(selectedFile.duration)}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {selectedFile.error ? (
                    <Badge variant="destructive" className="flex items-center space-x-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Invalid</span>
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>Valid</span>
                    </Badge>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedFile.error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{selectedFile.error}</p>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            {selectedFile && (
              <Button
                variant="outline"
                onClick={clearFile}
                disabled={isUploading}
              >
                Clear
              </Button>
            )}
            
            <Button
              onClick={handleStartAnalysis}
              disabled={!selectedFile || !!selectedFile.error || isUploading}
              className="min-w-32"
            >
              {isUploading ? 'Uploading...' : 'Start Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audio Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Loudness levels (LUFS)</li>
              <li>• Clipping detection</li>
              <li>• Silence analysis</li>
              <li>• Voice glitch detection</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Video Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Black frame detection</li>
              <li>• Frozen frame analysis</li>
              <li>• Resolution metrics</li>
              <li>• Frame rate analysis</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Executive summary</li>
              <li>• Detailed issue breakdown</li>
              <li>• Markdown export</li>
              <li>• PDF reports</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default UploadPage
