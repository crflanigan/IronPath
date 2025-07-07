# IronPup - Progressive Web App Workout Tracker

## Overview

IronPup is a modern Progressive Web App (PWA) designed to replicate and enhance the YMCA workout experience. Built with React and TypeScript, it provides a mobile-first, offline-capable workout tracking solution with calendar-based scheduling, detailed exercise logging, and comprehensive progress tracking.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components for consistent design
- **State Management**: React hooks with @tanstack/react-query for server state
- **Routing**: Wouter for lightweight client-side routing
- **PWA Features**: Service worker for offline capability and caching

### Backend Architecture
- **Server**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Cloud Database**: Neon Database for PostgreSQL hosting
- **Storage Strategy**: Hybrid approach with localStorage for offline and PostgreSQL for persistence
- **API Design**: RESTful endpoints with /api prefix

## Key Components

### Data Models
- **Workouts**: Complete workout sessions with exercises, abs, and cardio
- **Exercises**: Individual strength training exercises with sets, reps, and weights
- **Sets**: Weight, reps, rest time, and completion status
- **User Preferences**: Personalized settings and workout history

### Core Features
- **Calendar View**: Visual workout scheduling with rotation through 5 workout types
- **Exercise Tracking**: Detailed logging of sets, reps, weights, and rest periods
- **Progress Monitoring**: Historical data and performance analytics
- **Offline Support**: Local storage with sync capabilities
- **PWA Installation**: Native app-like experience on mobile devices

### UI Components
- **Calendar Grid**: Monthly view with workout indicators
- **Exercise Forms**: Interactive forms for logging workout data
- **Progress Charts**: Visual representation of workout history
- **Theme System**: Light/dark mode support with system preference detection

## Data Flow

1. **Workout Creation**: Templates generate new workouts based on rotation schedule
2. **Exercise Logging**: Real-time updates to localStorage for offline capability
3. **Data Persistence**: Automatic sync to PostgreSQL when online
4. **Progress Tracking**: Historical analysis from stored workout data
5. **Calendar Display**: Aggregated view of completed and scheduled workouts

## External Dependencies

### Core Dependencies
- **React Ecosystem**: React, React DOM, React Router (wouter)
- **UI Libraries**: Radix UI primitives, Tailwind CSS, class-variance-authority
- **State Management**: @tanstack/react-query for server state
- **Database**: Drizzle ORM with @neondatabase/serverless
- **Forms**: React Hook Form with Zod validation
- **Date Handling**: date-fns for date manipulation

### Development Tools
- **TypeScript**: Full type safety across the application
- **Vite**: Development server and build tool
- **ESBuild**: Fast bundling for production
- **PostCSS**: CSS processing with Tailwind

## Deployment Strategy

### Development Environment
- **Local Development**: Vite dev server with hot module replacement
- **Database**: Neon Database for consistent development/production environment
- **Environment Variables**: DATABASE_URL for database connection

### Production Build
- **Frontend**: Vite build with optimized assets
- **Backend**: ESBuild bundle for Node.js deployment
- **Static Assets**: Served from Express with proper caching headers
- **PWA Assets**: Service worker and manifest for offline functionality

### Architecture Decisions

**Database Choice**: PostgreSQL was selected for its robust JSON support (for exercise data) and excellent TypeScript integration through Drizzle ORM. The hybrid storage approach ensures offline capability while maintaining data persistence.

**State Management**: React Query handles server state efficiently with caching and synchronization, while local component state manages UI interactions. This reduces complexity while ensuring good performance.

**UI Framework**: Tailwind CSS with shadcn/ui provides consistent, accessible components with full customization capability. The design system supports both light and dark themes with CSS variables.

**PWA Implementation**: Service worker strategy focuses on caching static assets and providing offline functionality for the core workout tracking features, essential for gym usage where connectivity may be limited.

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 05, 2025. Initial setup
