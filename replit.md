# Running Leaderboard Platform

## Overview
A comprehensive running leaderboard platform that aggregates and displays local marathon and half-marathon results with advanced data management and user engagement features.

Built with:
- Frontend: React + TypeScript + Tailwind CSS + shadcn/ui components
- Backend: Express.js + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Storage: Persistent database storage with comprehensive data models
- API Integration: RunSignup and RaceRoster provider support

## Project Architecture

### Core Features
1. **Main Leaderboard** - Displays fastest times with collapsible filtering (distance, gender, age group, search)
2. **Runner Profiles** - Complete race history, personal records, statistics
3. **Race Details** - Comprehensive race information and results
4. **Data Import System** - CSV and URL import with sophisticated runner matching
5. **Race Series Management** - Multi-event competitions with points-based scoring (Admin-only)

### Technical Implementation

#### Data Models
- **Runners**: Core athlete profiles with matching confidence scores
- **Races**: Event details including weather, elevation, course type
- **Results**: Individual race performances with rankings and notes
- **Race Series**: Multi-event competitions with configurable scoring
- **Runner Matching**: Fuzzy matching system with confidence scoring (95%+ auto-match, 85-94% high confidence, 60-84% needs review)

#### Storage System
- PostgreSQL database with Drizzle ORM for persistent data storage
- Complete CRUD operations with relational integrity
- Advanced query capabilities for leaderboards and analytics
- Database tables: runners, races, results, race_series, race_series_races, runner_matches

#### API Structure
- RESTful endpoints for all data operations
- Comprehensive error handling with detailed logging
- Integration endpoints for external race data providers

## Recent Changes

### July 20, 2025 - Database Management & Race Deletion System
✓ Added comprehensive race deletion functionality with cascade delete for results
✓ Created RaceManager component with race listing, details, and delete capabilities
✓ Implemented DELETE /api/races/:id API endpoint with proper error handling
✓ Integrated race management into admin panel "Race Management" tab
✓ Added database clearing functionality for testing purposes
✓ Fixed TypeScript errors in storage layer causing leaderboard API failures
✓ Enhanced leaderboard query with proper error handling and logging
✓ Resolved real-time progress tracking endpoint routing issues
✓ Updated all database operations to handle nullable fields properly  
✓ Fixed critical leaderboard interval parsing error by filtering invalid finish times (DQ, DNF)
✓ Added comprehensive race information display with participant counts and metadata
✓ Cleaned production database by removing test data (Test Race) for production deployment

### July 19, 2025 - RunSignup Optimization & Real-Time Progress Tracking
✓ Fixed critical RunSignup pagination bug by correcting parameter from "num" to "results_per_page" 
✓ Optimized import performance by removing individual runner logging during large imports (1200+ runners)
✓ Implemented real-time import progress tracking with background processing system
✓ Created ImportProgress.tsx component showing live runner count, status, and completion percentage
✓ Added progress API endpoints (/api/import/progress/:importId) for real-time status monitoring
✓ Enhanced user experience with immediate response and background import processing
✓ Added comprehensive error handling for failed imports with detailed progress feedback
✓ Implemented automatic progress cleanup after 5 minutes to prevent memory leaks
✓ Updated admin interface to display real-time progress during large race imports
✓ Maintained comprehensive code documentation and development logging throughout optimization

### July 18, 2025 - Runner Review System & Race Series Management Fixes
✓ Fixed race series management error - added missing `addedAt` field to resolve 500 errors when adding races
✓ Implemented comprehensive runner review system with API endpoints for manual verification
✓ Created /runner-review page with tabbed interface for pending results and runner matches
✓ Added runner review tab to admin dashboard with direct navigation link
✓ Implemented approve/reject functionality for runner matches requiring manual verification
✓ Enhanced pagination attempts for RunSignup imports (pagination logic improved but still investigating API limits)
✓ Added remove race functionality to series management (already existed in UI with proper API endpoints)
✓ All race series operations now working correctly including add/remove races from series

### July 2, 2025 - Private Series & RunSignup Event Selection
✓ Implemented private race series functionality with manual admin approval
✓ Added race_series_participants table for controlled access to private series
✓ Updated series leaderboard calculation to filter by approved participants
✓ Enhanced RunSignup integration with proper event selection workflow
✓ Added API endpoint to fetch available past events for a race
✓ Updated import UI to require event selection for better data accuracy
✓ Fixed RunSignup API to handle multiple events per race properly
✓ Fixed pace calculation by improving distance normalization and event-specific race data
✓ Resolved "infinity" pace display by ensuring proper distance_miles values
✓ Added 10 Mile distance support with proper normalization and conversion
✓ Redesigned home page with distance-specific leaderboards showing top 5/25 times
✓ Combined pace and time columns for cleaner display
✓ Created dedicated /leaderboard page for full results with filters
✓ Implemented tab controls for distance selection on homepage to reduce visual clutter
✓ Added interactive race count indicator with modal showing all races and participant stats
✓ Enhanced races API endpoint to include participant counts for better race information

### July 1, 2025 - Database Migration to PostgreSQL
✓ Migrated from in-memory storage to persistent PostgreSQL database
✓ Implemented complete DatabaseStorage class with Drizzle ORM
✓ Created all database tables: runners, races, results, race_series, race_series_races, runner_matches
✓ Configured proper database relations and foreign key constraints
✓ Updated runner matching system to log match decisions for audit trail
✓ Maintained full API compatibility during storage layer transition

### June 29, 2025 - Race Series Feature Complete & RunSignup URL Import
✓ Built complete race series management system as admin-only feature
✓ Created configurable scoring system with points-based calculations
✓ Implemented race size bonuses in point calculations (larger races = more points)
✓ Added series creation form with race selection and validation
✓ Developed comprehensive series leaderboard with standings and stats
✓ Fixed API request format issues in frontend components
✓ Added sample race series data for testing
✓ Integrated with existing import and runner matching systems
✓ Added race management interface with "Manage Races" buttons
✓ Built comprehensive race selection and removal functionality
✓ Implemented RunSignup URL parsing and race name detection
✓ Added intelligent error handling for JavaScript-loaded results pages

### Key Race Series Features
- **Series Creation**: Custom rules (minimum races, scoring system, date ranges)
- **Race Management**: Add/remove races from series with sequence numbers
- **Leaderboard Calculation**: Automatic points calculation based on placement and race size
- **Standings Display**: Total points, average performance, race completion stats
- **Admin Interface**: Tabbed dashboard with series management tools

## User Preferences
- Race series feature should remain admin-only for now (may expand to other users later)
- Focus on points-based scoring system as primary method
- Minimum 2 races participation required for series standings
- Prioritize data integrity - always use authentic race data when possible

## Technical Notes
- Runner matching uses Levenshtein distance for name similarity with comprehensive confidence scoring
- Race points calculated based on placement and field size with configurable bonuses
- Series standings require minimum race participation (default: 2 races)
- All timestamps stored as ISO strings for consistent handling across timezones
- Frontend uses TanStack Query for efficient state management and caching
- Development logging system with environment-based controls (only shows in development mode)
- Comprehensive error handling with detailed debugging information and audit trails
- RunSignup API pagination now working correctly with "results_per_page" parameter (fixed critical bug)
- Real-time import progress tracking system with background processing for large races
- Database performance optimized with strategic indexes on frequently queried fields
- Runner matching audit log maintains complete history for data integrity verification
- Import performance optimized for races with 1000+ participants through batched progress updates

## Development Status
✅ Core leaderboard functionality
✅ Runner profile system
✅ Race detail views
✅ Data import with runner matching
✅ Race series management (Admin)
⏳ Individual race management tools
⏳ Runner profile management tools
⏳ Advanced analytics and reporting