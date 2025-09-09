import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExternalLink } from 'lucide-react'
import { VideoIssue } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import { getSeverityBadgeColor } from '@/lib/utils'

interface IssuesTableProps {
  issues: VideoIssue[]
  title: string
  emptyMessage: string
}

const IssuesTable: React.FC<IssuesTableProps> = ({ issues, title, emptyMessage }) => {
  const { setSelectedTimestamp } = useAppStore()

  const handleJumpToTimestamp = (timestamp: string) => {
    setSelectedTimestamp(timestamp)
  }

  const formatIssueType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDuration = (duration: number) => {
    if (duration === 0) return 'N/A'
    return `${duration.toFixed(3)}s`
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <div className="text-4xl mb-2">✓</div>
              <p>{emptyMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {issues.length} issue{issues.length !== 1 ? 's' : ''} detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {['high', 'medium', 'low'].map(severity => {
              const count = issues.filter(issue => issue.severity === severity).length
              if (count === 0) return null
              
              return (
                <Badge 
                  key={severity} 
                  className={getSeverityBadgeColor(severity)}
                  variant="outline"
                >
                  {count} {severity}
                </Badge>
              )
            })}
          </div>

          {/* Issues table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {issue.timestamp}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatIssueType(issue.type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={getSeverityBadgeColor(issue.severity)}
                        variant="outline"
                      >
                        {issue.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDuration(issue.duration)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm mb-1">{issue.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {issue.suggested_fix}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleJumpToTimestamp(issue.timestamp)}
                        className="h-8 px-2"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Jump
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Issue type breakdown */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Issue Types</h4>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(
                issues.reduce((acc, issue) => {
                  const type = formatIssueType(issue.type)
                  acc[type] = (acc[type] || 0) + 1
                  return acc
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span>{type}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default IssuesTable
