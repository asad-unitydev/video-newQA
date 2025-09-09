import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VideoMetadata, VideoMetrics } from '@/lib/api'
import { formatFileSize } from '@/lib/utils'

interface MetricsViewProps {
  metadata: VideoMetadata
  metrics: VideoMetrics
}

interface MetricItemProps {
  label: string
  value: string | number
  unit?: string
  status?: 'good' | 'warning' | 'error'
  description?: string
}

const MetricItem: React.FC<MetricItemProps> = ({ label, value, unit, status, description }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-foreground'
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {value}{unit && ` ${unit}`}
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

const MetricsView: React.FC<MetricsViewProps> = ({ metadata, metrics }) => {
  // Determine status for various metrics
  const getLufsStatus = (lufs: number | string): 'good' | 'warning' | 'error' => {
    if (lufs === 'N/A' || typeof lufs !== 'number') return 'warning'
    if (lufs >= -28 && lufs <= -12) return 'good'
    return 'warning'
  }

  const getFpsStatus = (fps: number): 'good' | 'warning' | 'error' => {
    if (fps >= 23.98 && fps <= 60) return 'good'
    if (fps >= 15) return 'warning'
    return 'error'
  }

  const getResolutionStatus = (width: number, height: number): 'good' | 'warning' | 'error' => {
    const pixels = width * height
    if (pixels >= 1920 * 1080) return 'good' // HD or higher
    if (pixels >= 1280 * 720) return 'warning' // 720p
    return 'error' // Below 720p
  }

  return (
    <div className="space-y-6">
      {/* Video Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Video Specifications</CardTitle>
          <CardDescription>
            Technical properties of the video file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricItem
            label="Duration"
            value={metrics.duration_formatted}
            description="Total video length"
          />
          
          <MetricItem
            label="Resolution"
            value={metrics.resolution}
            status={getResolutionStatus(metadata.width, metadata.height)}
            description={`${metadata.width} × ${metadata.height} pixels`}
          />
          
          <MetricItem
            label="Frame Rate"
            value={metrics.fps.toFixed(2)}
            unit="FPS"
            status={getFpsStatus(metrics.fps)}
            description="Frames per second"
          />
          
          <MetricItem
            label="Aspect Ratio"
            value={metrics.aspect_ratio.toFixed(2)}
            unit=":1"
            description="Width to height ratio"
          />
          
          <MetricItem
            label="File Size"
            value={metrics.file_size_mb}
            unit="MB"
            description={`${formatFileSize(metadata.file_size)} total`}
          />
        </CardContent>
      </Card>

      {/* Codec Information */}
      <Card>
        <CardHeader>
          <CardTitle>Codec Information</CardTitle>
          <CardDescription>
            Encoding formats and compression details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetricItem
            label="Video Codec"
            value={metadata.video_codec || 'Unknown'}
            description="Video compression format"
          />
          
          <MetricItem
            label="Audio Codec"
            value={metadata.audio_codec || 'Unknown'}
            description="Audio compression format"
          />
          
          <MetricItem
            label="Has Audio"
            value={metadata.has_audio ? 'Yes' : 'No'}
            status={metadata.has_audio ? 'good' : 'warning'}
            description="Audio track presence"
          />
        </CardContent>
      </Card>

      {/* Audio Metrics */}
      {metadata.has_audio && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Metrics</CardTitle>
            <CardDescription>
              Audio quality and loudness measurements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricItem
              label="Sample Rate"
              value={metadata.sample_rate || 'Unknown'}
              unit="Hz"
              description="Audio sampling frequency"
            />
            
            <MetricItem
              label="Integrated LUFS"
              value={metrics.integrated_lufs || 'N/A'}
              unit={typeof metrics.integrated_lufs === 'number' ? 'LUFS' : ''}
              status={typeof metrics.integrated_lufs === 'number' ? getLufsStatus(metrics.integrated_lufs) : 'warning'}
              description="Loudness Units relative to Full Scale (target: -23 LUFS for broadcast)"
            />
            
            <MetricItem
              label="Dynamic Range"
              value={metrics.dynamic_range_db || 'N/A'}
              unit={typeof metrics.dynamic_range_db === 'number' ? 'dB' : ''}
              description="Difference between peak and RMS levels"
            />
          </CardContent>
        </Card>
      )}

      {/* Quality Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Assessment</CardTitle>
          <CardDescription>
            Overall quality indicators and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resolution Quality */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Resolution Quality</span>
            <Badge 
              variant="outline"
              className={
                getResolutionStatus(metadata.width, metadata.height) === 'good' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : getResolutionStatus(metadata.width, metadata.height) === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }
            >
              {getResolutionStatus(metadata.width, metadata.height) === 'good' ? 'HD+' :
               getResolutionStatus(metadata.width, metadata.height) === 'warning' ? '720p' : 'SD'}
            </Badge>
          </div>

          {/* Frame Rate Quality */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Frame Rate</span>
            <Badge 
              variant="outline"
              className={
                getFpsStatus(metrics.fps) === 'good' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : getFpsStatus(metrics.fps) === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }
            >
              {getFpsStatus(metrics.fps) === 'good' ? 'Optimal' :
               getFpsStatus(metrics.fps) === 'warning' ? 'Acceptable' : 'Poor'}
            </Badge>
          </div>

          {/* Audio Loudness Quality */}
          {typeof metrics.integrated_lufs === 'number' && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Audio Loudness</span>
              <Badge 
                variant="outline"
                className={
                  getLufsStatus(metrics.integrated_lufs) === 'good' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }
              >
                {getLufsStatus(metrics.integrated_lufs) === 'good' ? 'Compliant' : 'Needs Adjustment'}
              </Badge>
            </div>
          )}

          {/* File Size Efficiency */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Compression Efficiency</h4>
            <div className="text-xs text-muted-foreground">
              <p>
                File size: {metrics.file_size_mb} MB for {metrics.duration_formatted} of{' '}
                {metrics.resolution} video at {metrics.fps.toFixed(1)} FPS
              </p>
              <p className="mt-1">
                Bitrate: ~{((metrics.file_size_mb * 8) / (metadata.duration / 60)).toFixed(1)} Mbps
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MetricsView
