import React, { useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import { AnalysisResult, VideoIssue } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import { timestampToSeconds, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  result: AnalysisResult
  className?: string
}

interface IssueMarker {
  issue: VideoIssue
  position: number // 0-100 percentage
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ result, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  
  const { selectedTimestamp, setSelectedTimestamp } = useAppStore()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  // Create issue markers for timeline
  const issueMarkers: IssueMarker[] = React.useMemo(() => {
    const allIssues = [...result.audio_issues, ...result.video_issues]
    
    return allIssues.map(issue => ({
      issue,
      position: (timestampToSeconds(issue.timestamp) / result.metadata.duration) * 100
    }))
  }, [result])

  // Handle video events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Handle timestamp selection
  useEffect(() => {
    if (selectedTimestamp && videoRef.current) {
      const seconds = timestampToSeconds(selectedTimestamp)
      videoRef.current.currentTime = seconds
      setSelectedTimestamp(null) // Clear selection after seeking
    }
  }, [selectedTimestamp, setSelectedTimestamp])

  const togglePlay = () => {
    if (!videoRef.current) return
    
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || !videoRef.current) return
    
    const rect = timelineRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration
    
    videoRef.current.currentTime = newTime
  }

  const handleMarkerClick = (marker: IssueMarker, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (videoRef.current) {
      const seconds = timestampToSeconds(marker.issue.timestamp)
      videoRef.current.currentTime = seconds
    }
  }

  const toggleFullscreen = () => {
    if (!videoRef.current) return
    
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      videoRef.current.requestFullscreen()
    }
  }

  // Enable video playback now that backend serves actual video files
  const demoMode = false
  const videoSrc = `/api/jobs/${result.job_id}/video`

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Video Preview</span>
          <Badge variant={result.summary.status === 'PASS' ? 'secondary' : 'destructive'}>
            {result.summary.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Element */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            controls
            onError={() => console.log('Video loading error')}
          >
            {/* Always include source now that backend serves video */}
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Placeholder overlay - only shown in demo mode */}
          {demoMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
              <div className="text-center">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Video Preview</p>
                <p className="text-sm opacity-75">
                  {result.filename} - {formatDuration(result.metadata.duration)}
                </p>
                <p className="text-xs mt-2 opacity-50">
                  Video file not available in demo mode
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Timeline with Issue Markers */}
        <div className="space-y-2">
          <div 
            ref={timelineRef}
            className="relative h-6 bg-muted rounded cursor-pointer"
            onClick={handleTimelineClick}
          >
            {/* Progress bar */}
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            
            {/* Issue markers */}
            {issueMarkers.map((marker, index) => (
              <div
                key={index}
                className={cn(
                  "absolute top-0 w-2 h-full cursor-pointer rounded transition-all hover:scale-110",
                  marker.issue.severity === 'high' ? 'bg-red-500' :
                  marker.issue.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500'
                )}
                style={{ left: `${marker.position}%` }}
                onClick={(e) => handleMarkerClick(marker, e)}
                title={`${marker.issue.type} - ${marker.issue.timestamp}`}
              />
            ))}
            
            {/* Current time indicator */}
            <div 
              className="absolute top-0 w-1 h-full bg-white shadow-lg"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20"
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {/* Issue Legend */}
        {issueMarkers.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Timeline Issues</h4>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center space-x-1 text-xs">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>High severity</span>
              </div>
              <div className="flex items-center space-x-1 text-xs">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>Medium severity</span>
              </div>
              <div className="flex items-center space-x-1 text-xs">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Low severity</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Click on markers to jump to issues
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default VideoPlayer
