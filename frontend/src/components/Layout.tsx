import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Moon, Sun, Video, Upload, BarChart3 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const { isDarkMode, toggleDarkMode, currentJobId } = useAppStore()

  const navigation = [
    {
      name: 'Upload & Analyze',
      href: '/upload',
      icon: Upload,
      current: location.pathname === '/upload',
    },
    {
      name: 'Results',
      href: currentJobId ? `/results/${currentJobId}` : '#',
      icon: BarChart3,
      current: location.pathname.startsWith('/results'),
      disabled: !currentJobId,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/upload" className="flex items-center space-x-2">
              <Video className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">AI Video QA</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.current
                        ? 'bg-primary text-primary-foreground'
                        : item.disabled
                        ? 'text-muted-foreground cursor-not-allowed'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    onClick={(e) => item.disabled && e.preventDefault()}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden border-t">
          <div className="px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    item.current
                      ? 'bg-primary text-primary-foreground'
                      : item.disabled
                      ? 'text-muted-foreground cursor-not-allowed'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={(e) => item.disabled && e.preventDefault()}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>AI Video QA System - Analyze video quality with advanced AI</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
