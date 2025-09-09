import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { AnalysisSummary } from '@/lib/api'

interface SummaryViewProps {
  summary: AnalysisSummary
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary }) => {
  const getStatusIcon = () => {
    switch (summary.status) {
      case 'PASS':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'FAIL':
        return <XCircle className="h-6 w-6 text-red-600" />
      default:
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
    }
  }

  const getStatusColor = () => {
    switch (summary.status) {
      case 'PASS':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'FAIL':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    }
  }

  const getStatusDescription = () => {
    switch (summary.status) {
      case 'PASS':
        return 'Video meets quality standards'
      case 'FAIL':
        return 'Video has quality issues that need attention'
      default:
        return 'Analysis incomplete or inconclusive'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getStatusIcon()}
          <span>Executive Summary</span>
        </CardTitle>
        <CardDescription>
          Overall analysis results and key findings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div>
            <Badge className={getStatusColor()} variant="outline">
              {summary.status}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              {getStatusDescription()}
            </p>
          </div>
        </div>

        {/* Issue Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {summary.total_issues}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Issues
            </div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {summary.high_severity_issues}
            </div>
            <div className="text-sm text-muted-foreground">
              High Severity
            </div>
          </div>
        </div>

        {/* Summary Points */}
        <div>
          <h4 className="text-sm font-medium mb-3">Key Findings</h4>
          <div className="space-y-2">
            {summary.points.map((point, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm text-foreground">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Next Steps</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {summary.status === 'PASS' ? (
              <div className="space-y-1">
                <p>✓ Video quality meets standards</p>
                <p>✓ Ready for distribution or publication</p>
                <p>• Consider periodic quality checks for consistency</p>
              </div>
            ) : (
              <div className="space-y-1">
                {summary.high_severity_issues > 0 && (
                  <p>• Address high-severity issues immediately</p>
                )}
                <p>• Review detailed issue reports in Audio and Video tabs</p>
                <p>• Apply suggested fixes before final distribution</p>
                {summary.total_issues > 5 && (
                  <p>• Consider re-encoding with optimized settings</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quality Score Visualization */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Quality Assessment</h4>
          
          <div className="space-y-3">
            {/* Overall Score */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Overall Quality</span>
                <span className={summary.status === 'PASS' ? 'text-green-600' : 'text-red-600'}>
                  {summary.status === 'PASS' ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    summary.status === 'PASS' 
                      ? 'bg-green-600' 
                      : summary.high_severity_issues === 0 
                        ? 'bg-yellow-500' 
                        : 'bg-red-600'
                  }`}
                  style={{ 
                    width: summary.status === 'PASS' 
                      ? '85%' 
                      : summary.high_severity_issues === 0 
                        ? '60%' 
                        : '30%' 
                  }}
                />
              </div>
            </div>

            {/* Issue Severity Breakdown */}
            {summary.total_issues > 0 && (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="text-green-600 font-medium">
                    {summary.total_issues - summary.high_severity_issues}
                  </div>
                  <div className="text-muted-foreground">Low/Medium</div>
                </div>
                <div className="text-center">
                  <div className="text-red-600 font-medium">
                    {summary.high_severity_issues}
                  </div>
                  <div className="text-muted-foreground">High Severity</div>
                </div>
                <div className="text-center">
                  <div className="text-primary font-medium">
                    {((summary.total_issues - summary.high_severity_issues) / Math.max(summary.total_issues, 1) * 100).toFixed(0)}%
                  </div>
                  <div className="text-muted-foreground">Acceptable</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SummaryView
