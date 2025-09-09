#!/bin/bash

# AI Video QA System - Startup Script
# This script provides easy commands to run the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1; then
        print_error "Docker Compose is not installed. Please install Docker Compose and try again."
        exit 1
    fi
}

# Function to show help
show_help() {
    echo "AI Video QA System - Startup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start         Start the application in production mode"
    echo "  dev           Start the application in development mode"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  logs          Show logs from all services"
    echo "  status        Show status of all services"
    echo "  clean         Stop and remove all containers, volumes, and images"
    echo "  setup         Initial setup and build"
    echo "  health        Check health of all services"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start      # Start in production mode"
    echo "  $0 dev        # Start in development mode with hot reload"
    echo "  $0 logs       # View logs from all services"
}

# Function to start production
start_production() {
    print_status "Starting AI Video QA System in production mode..."
    check_docker
    check_docker_compose
    
    docker-compose up -d
    
    print_success "Application started successfully!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:5000"
    print_status "Health Check: http://localhost:5000/api/health"
    print_status ""
    print_status "Use '$0 logs' to view logs"
    print_status "Use '$0 stop' to stop the application"
}

# Function to start development
start_development() {
    print_status "Starting AI Video QA System in development mode..."
    check_docker
    check_docker_compose
    
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "Development environment started successfully!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:5000"
    print_status "Health Check: http://localhost:5000/api/health"
    print_status ""
    print_warning "Development mode includes hot reload and debug logging"
    print_status "Use '$0 logs' to view logs"
    print_status "Use '$0 stop' to stop the application"
}

# Function to stop services
stop_services() {
    print_status "Stopping AI Video QA System..."
    check_docker
    check_docker_compose
    
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    
    print_success "Application stopped successfully!"
}

# Function to restart services
restart_services() {
    print_status "Restarting AI Video QA System..."
    stop_services
    sleep 2
    start_production
}

# Function to show logs
show_logs() {
    print_status "Showing logs from all services (Ctrl+C to exit)..."
    check_docker
    check_docker_compose
    
    if docker-compose ps -q > /dev/null 2>&1; then
        docker-compose logs -f
    elif docker-compose -f docker-compose.dev.yml ps -q > /dev/null 2>&1; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        print_warning "No running services found"
    fi
}

# Function to show status
show_status() {
    print_status "Service Status:"
    check_docker
    check_docker_compose
    
    echo ""
    echo "Production services:"
    docker-compose ps
    
    echo ""
    echo "Development services:"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to clean everything
clean_all() {
    print_warning "This will stop and remove all containers, volumes, and images."
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        check_docker
        check_docker_compose
        
        docker-compose down -v --rmi all --remove-orphans
        docker-compose -f docker-compose.dev.yml down -v --rmi all --remove-orphans
        
        # Remove any dangling images
        docker image prune -f
        
        print_success "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Function to setup
setup_application() {
    print_status "Setting up AI Video QA System..."
    check_docker
    check_docker_compose
    
    # Build images
    print_status "Building Docker images..."
    docker-compose build
    docker-compose -f docker-compose.dev.yml build
    
    # Create necessary directories
    mkdir -p backend/uploads
    
    print_success "Setup completed successfully!"
    print_status "You can now run '$0 start' or '$0 dev'"
}

# Function to check health
check_health() {
    print_status "Checking service health..."
    check_docker
    
    # Check if services are running
    if docker-compose ps -q > /dev/null 2>&1; then
        echo ""
        echo "Production services health:"
        docker-compose ps
        
        # Check individual service health
        echo ""
        print_status "Testing endpoints..."
        
        # Frontend health
        if curl -s http://localhost:3000 > /dev/null; then
            print_success "Frontend is healthy (http://localhost:3000)"
        else
            print_error "Frontend is not responding"
        fi
        
        # Backend health
        if curl -s http://localhost:5000/api/health > /dev/null; then
            print_success "Backend is healthy (http://localhost:5000/api/health)"
        else
            print_error "Backend is not responding"
        fi
        
    elif docker-compose -f docker-compose.dev.yml ps -q > /dev/null 2>&1; then
        echo ""
        echo "Development services health:"
        docker-compose -f docker-compose.dev.yml ps
        
    else
        print_warning "No services are currently running"
        print_status "Use '$0 start' or '$0 dev' to start the application"
    fi
}

# Main script logic
case "${1:-help}" in
    start)
        start_production
        ;;
    dev)
        start_development
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    setup)
        setup_application
        ;;
    health)
        check_health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
