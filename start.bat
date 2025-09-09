@echo off
setlocal enabledelayedexpansion

:: AI Video QA System - Windows Startup Script
:: This script provides easy commands to run the application on Windows

set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

:: Function to print colored output
goto :main

:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

:check_docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not running. Please start Docker and try again."
    exit /b 1
)
goto :eof

:check_docker_compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit /b 1
)
goto :eof

:show_help
echo AI Video QA System - Windows Startup Script
echo.
echo Usage: %~nx0 [COMMAND]
echo.
echo Commands:
echo   start         Start the application in production mode
echo   dev           Start the application in development mode
echo   stop          Stop all services
echo   restart       Restart all services
echo   logs          Show logs from all services
echo   status        Show status of all services
echo   clean         Stop and remove all containers, volumes, and images
echo   setup         Initial setup and build
echo   health        Check health of all services
echo   help          Show this help message
echo.
echo Examples:
echo   %~nx0 start      # Start in production mode
echo   %~nx0 dev        # Start in development mode with hot reload
echo   %~nx0 logs       # View logs from all services
goto :eof

:start_production
call :print_status "Starting AI Video QA System in production mode..."
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

docker-compose up -d
if %errorlevel% neq 0 (
    call :print_error "Failed to start services"
    exit /b 1
)

call :print_success "Application started successfully!"
call :print_status "Frontend: http://localhost:3000"
call :print_status "Backend API: http://localhost:5000"
call :print_status "Health Check: http://localhost:5000/api/health"
echo.
call :print_status "Use '%~nx0 logs' to view logs"
call :print_status "Use '%~nx0 stop' to stop the application"
goto :eof

:start_development
call :print_status "Starting AI Video QA System in development mode..."
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

docker-compose -f docker-compose.dev.yml up -d
if %errorlevel% neq 0 (
    call :print_error "Failed to start development services"
    exit /b 1
)

call :print_success "Development environment started successfully!"
call :print_status "Frontend: http://localhost:3000"
call :print_status "Backend API: http://localhost:5000"
call :print_status "Health Check: http://localhost:5000/api/health"
echo.
call :print_warning "Development mode includes hot reload and debug logging"
call :print_status "Use '%~nx0 logs' to view logs"
call :print_status "Use '%~nx0 stop' to stop the application"
goto :eof

:stop_services
call :print_status "Stopping AI Video QA System..."
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

docker-compose down
docker-compose -f docker-compose.dev.yml down

call :print_success "Application stopped successfully!"
goto :eof

:restart_services
call :print_status "Restarting AI Video QA System..."
call :stop_services
timeout /t 2 /nobreak >nul
call :start_production
goto :eof

:show_logs
call :print_status "Showing logs from all services (Ctrl+C to exit)..."
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

docker-compose ps -q >nul 2>&1
if %errorlevel% equ 0 (
    docker-compose logs -f
) else (
    docker-compose -f docker-compose.dev.yml ps -q >nul 2>&1
    if %errorlevel% equ 0 (
        docker-compose -f docker-compose.dev.yml logs -f
    ) else (
        call :print_warning "No running services found"
    )
)
goto :eof

:show_status
call :print_status "Service Status:"
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

echo.
echo Production services:
docker-compose ps

echo.
echo Development services:
docker-compose -f docker-compose.dev.yml ps
goto :eof

:clean_all
call :print_warning "This will stop and remove all containers, volumes, and images."
set /p "confirm=Are you sure? (y/N): "
if /i "!confirm!" neq "y" (
    call :print_status "Cleanup cancelled."
    goto :eof
)

call :print_status "Cleaning up..."
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

docker-compose down -v --rmi all --remove-orphans
docker-compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans

docker image prune -f

call :print_success "Cleanup completed!"
goto :eof

:setup_application
call :print_status "Setting up AI Video QA System..."
call :check_docker
if %errorlevel% neq 0 exit /b 1
call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

call :print_status "Building Docker images..."
docker-compose build
docker-compose -f docker-compose.dev.yml build

if not exist "backend\uploads" mkdir "backend\uploads"

call :print_success "Setup completed successfully!"
call :print_status "You can now run '%~nx0 start' or '%~nx0 dev'"
goto :eof

:check_health
call :print_status "Checking service health..."
call :check_docker
if %errorlevel% neq 0 exit /b 1

docker-compose ps -q >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo Production services health:
    docker-compose ps
    
    echo.
    call :print_status "Testing endpoints..."
    
    curl -s http://localhost:3000 >nul 2>&1
    if %errorlevel% equ 0 (
        call :print_success "Frontend is healthy (http://localhost:3000)"
    ) else (
        call :print_error "Frontend is not responding"
    )
    
    curl -s http://localhost:5000/api/health >nul 2>&1
    if %errorlevel% equ 0 (
        call :print_success "Backend is healthy (http://localhost:5000/api/health)"
    ) else (
        call :print_error "Backend is not responding"
    )
) else (
    docker-compose -f docker-compose.dev.yml ps -q >nul 2>&1
    if %errorlevel% equ 0 (
        echo.
        echo Development services health:
        docker-compose -f docker-compose.dev.yml ps
    ) else (
        call :print_warning "No services are currently running"
        call :print_status "Use '%~nx0 start' or '%~nx0 dev' to start the application"
    )
)
goto :eof

:main
set "command=%~1"
if "%command%"=="" set "command=help"

if "%command%"=="start" goto :start_production
if "%command%"=="dev" goto :start_development
if "%command%"=="stop" goto :stop_services
if "%command%"=="restart" goto :restart_services
if "%command%"=="logs" goto :show_logs
if "%command%"=="status" goto :show_status
if "%command%"=="clean" goto :clean_all
if "%command%"=="setup" goto :setup_application
if "%command%"=="health" goto :check_health
if "%command%"=="help" goto :show_help
if "%command%"=="--help" goto :show_help
if "%command%"=="-h" goto :show_help

call :print_error "Unknown command: %command%"
echo.
call :show_help
exit /b 1
