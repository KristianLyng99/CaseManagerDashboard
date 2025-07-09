# Saksbehandler Verktøy - Date and Case Calculator

## Overview

This is a Norwegian case handler (saksbehandler) tool built as a full-stack web application for DNB liv. The application provides date calculation and case management functionality with intelligent data parsing and calculation features. It's designed as a single-page application with a React frontend and Express backend, configured for easy deployment on Replit.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks with TanStack Query for server state
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Development**: tsx for TypeScript execution in development
- **Production**: esbuild for bundling

### Data Storage Strategy
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Database**: Neon Database (serverless PostgreSQL)
- **Schema Management**: Drizzle Kit for migrations
- **Development Storage**: In-memory storage for rapid prototyping

## Key Components

### Frontend Components
1. **Home Page** (`client/src/pages/home.tsx`): Main calculator interface with date input fields and calculation results
2. **UI Components**: Complete set of accessible components from shadcn/ui including forms, buttons, cards, and toast notifications
3. **Utility Functions**: Date parsing, formatting, and calculation helpers

### Backend Components
1. **Express Server** (`server/index.ts`): Main server setup with middleware and error handling
2. **Storage Interface** (`server/storage.ts`): Abstracted storage layer with in-memory implementation
3. **Routes** (`server/routes.ts`): API endpoint definitions (currently minimal)
4. **Vite Integration** (`server/vite.ts`): Development server setup with HMR support

### Database Schema
- **Users Table**: Basic user management with username/password fields
- **Migration Support**: Drizzle migrations in `/migrations` directory
- **Type Safety**: Generated types from schema definitions

## Data Flow

1. **User Input**: Date inputs in DDMMYYYY or DD.MM.YYYY format
2. **Client-Side Processing**: Intelligent parsing and validation of date inputs
3. **Calculation Engine**: Date arithmetic for duration calculations and benefit period calculations
4. **Result Display**: Formatted output with copy-to-clipboard functionality
5. **Toast Notifications**: User feedback for actions like copying results

## External Dependencies

### Core Dependencies
- **Database**: `@neondatabase/serverless` for PostgreSQL connectivity
- **ORM**: `drizzle-orm` and `drizzle-zod` for database operations and validation
- **UI Library**: Multiple `@radix-ui` packages for accessible components
- **Query Management**: `@tanstack/react-query` for server state management
- **Date Handling**: `date-fns` for date manipulation

### Development Dependencies
- **TypeScript**: Full TypeScript support across frontend and backend
- **Vite**: Development server with HMR and optimized builds
- **ESBuild**: Production bundling for backend
- **Replit Integration**: Custom plugins for Replit environment

## Deployment Strategy

### Development Environment
- **Command**: `npm run dev` starts both frontend and backend in development mode
- **Hot Reload**: Vite provides instant feedback for frontend changes
- **TypeScript**: Real-time type checking and compilation

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: ESBuild bundles Node.js application to `dist/index.js`
- **Command**: `npm run build` creates production-ready application

### Database Management
- **Migrations**: `npm run db:push` applies schema changes to database
- **Environment**: Requires `DATABASE_URL` environment variable for PostgreSQL connection

### Replit Specific Features
- **Runtime Error Overlay**: Development error handling with `@replit/vite-plugin-runtime-error-modal`
- **Cartographer Integration**: Code mapping for debugging in Replit environment
- **Static Serving**: Fallback to static file serving in production

## Changelog
- January 09, 2025. Implemented ajourholddato salary correction system:
  - **Added Ajourholddato column detection** in Excel data parsing to identify salary update dates
  - **Implemented correction logic** that compares ajourholddato dates to identify incorrect salary entries
  - **Automatic salary overwriting** when newer entries have earlier ajourholddato dates than older entries
  - **Business rule implementation**: If entry A has later date but earlier ajourholddato than entry B, entry A's salary is corrected to match entry B's salary
  - **Enhanced debugging** with detailed logging showing correction process and affected entries
  - **Data integrity preservation** stores original salary values before correction for audit purposes
  - System now handles cases where companies report salary changes after the fact, ensuring karens assessment uses correct salary data
- January 09, 2025. Added G-regulation salary detection for normert grunnlagstype:
  - **Enhanced karens assessment** with G-regulation logic for cases where grunnlagstype is "normert" and salary increase violation exists
  - **Threshold violation detection** using actual salary (faktisk lønn) to find periods where salary was below 85% or 92.5% thresholds
  - **Automatic salary identification** for G-regulation: finds normert salary from 1 day before threshold violation end date
  - **Purple UI section** displays G-regulation information with violation end date and correct salary for G-regulation calculation
  - **Business logic compliance** ensures proper salary selection for G-regulation in complex normert grunnlagstype scenarios
  - System now handles the complete flow: detect salary increase → check for threshold violations → find correct G-regulation salary
- January 09, 2025. Added manual calculation method toggle functionality:
  - **Added manual override buttons** for calculation method selection (Auto/Faktisk/Normert)
  - **Auto mode** uses automatic grunnlagstype detection from sick date entry
  - **Faktisk mode** forces use of Lønn/Stillingsprosent columns for all calculations
  - **Normert mode** forces use of LønnN/StillingsprosentN columns for all calculations
  - **Visual indicators** show when manual override is active with orange "Manuell overstyring" badge
  - **Consistent application** across all components (visualizer, salary lists, threshold calculations)
  - User can now easily test both calculation methods without changing underlying data
- January 09, 2025. Implemented intelligent grunnlagstype detection for Norwegian salary calculations:
  - **Added GrunnlagstypeIF and GrunnlagstypeUP column detection** in Excel data parsing
  - **Intelligent salary/percentage column selection** based on "nomert" values in grunnlagstype columns
  - **Business rule implementation**: When GrunnlagstypeIF OR GrunnlagstypeUP contains "nomert" on sick date, system uses LønnN/StillingsprosentN for all 2-year karens calculations
  - **Clear UI indication** showing which calculation method is being used (nominal vs actual)
  - **Enhanced debugging** with grunnlagstype values visible in console logs
  - **Consistent calculation logic** across all salary assessments including visualization and threshold checks
  - User can now see "Beregningsmetode: LønnN / StillingsprosentN" or "Beregningsmetode: Lønn / Stillingsprosent" in salary assessment results
- January 09, 2025. Streamlined interface and fixed critical calculation accuracy:
  - **Completely removed textbox interface** - Excel grid is now the sole data input method
  - **Fixed 100% salary calculation precision issue** where 345,972 / 0.7631 was incorrectly calculated as 455,226 instead of correct 453,377
  - **Resolved inconsistency** between decimal format (0-1) and percentage format (0-100) in calculations
  - **Standardized all calculations** to use consistent `salary100` value from parsed data
  - **Improved precision handling** by keeping full precision for internal calculations, only rounding for display
  - **Cleaned up redundant code** and ensured all salary calculations use the same methodology
  - Workflow is now: paste data into grid → calculations automatically use grid data → no toggles or transfers needed
- July 09, 2025. Implemented Excel-like grid interface for seamless data input:
  - Added interactive spreadsheet-style grid with direct Excel paste functionality
  - Grid automatically reads clipboard data and populates cells with "📋 Lim inn fra Excel" button
  - System prioritizes grid data over textarea for calculations - no intermediate transfer steps needed
  - Direct cell editing capabilities with real-time data processing
  - Simplified workflow: copy Excel data → paste to grid → calculations read directly from grid
  - Removed unnecessary file upload and transfer complexity for streamlined user experience
- July 09, 2025. Fixed salary calculation accuracy in Excel data parsing:
  - Improved column detection to prioritize actual salary (Lønn) over nominal salary (LønnN)
  - Fixed percentage column selection to use actual percentage (Stillingsprosent) instead of nominal (StillingsprosentN)
  - Resolved calculation error where 213,744 kr / 0.4923 was incorrectly calculated as 358,631 kr instead of correct 434,174 kr
  - Enhanced debugging output with clear 🔍 markers for Excel parsing troubleshooting
  - System now correctly identifies and uses proper columns from structured Excel data
- July 08, 2025. Enhanced salary import with Excel support and benefits detection:
  - Renamed "Lønn og karens" section to "Import Lønndata" 
  - Added intelligent Excel data parser for tab-separated values
  - System automatically detects Excel format vs legacy DSOP format
  - **Updated to use actual salary (Lønn) for karens calculations instead of nominal salary (LønnN)**
  - Excel parser now identifies both salary columns: actual salary (Lønn) and nominal salary (LønnN)
  - Prioritizes actual salary for karens assessment, with nominal salary as fallback
  - Improved user guidance with instructions for copying Excel data
  - Enhanced threshold violation detection to account for actual duration between salary periods
  - Fixed tooltip in chart visualization to show actual dates alongside months before sick date
  - **Added new benefits (ytelser) detection functionality**:
    - Detects benefit columns in Excel data (Ytelse_IF, Ytelse_BTUP, Ytelse_UP, Ytelse_UPBT, Ytelse_BT)
    - Tracks when benefits go from 0 to >0 (new benefit assignment) during 2-year period before sick date
    - Shows green checkmark for "ingen nye ytelser tilknyttet innen 2 år før syk" when no new benefits detected
    - Displays orange warning with details when new benefits are found
    - Ignores benefit amount changes between non-zero values (only detects new benefit assignments)
- July 07, 2025. Added salary visualization chart feature:
  - Implemented interactive salary chart using Recharts library
  - Chart displays salary progression over 2-year period with months before sick date on X-axis
  - Added reference lines: red vertical line at 1-year mark, green horizontal line at 85% of sick date salary, orange horizontal line at 92.5%
  - Chart includes tooltips showing salary amounts and time periods
  - "Visualiser" button provides visual comparison of salary thresholds for karens assessment
- July 07, 2025. Fixed critical foreldelse filtering timing issue:
  - Resolved race condition where foreldelse filtering only worked on second button press
  - Fixed state synchronization issue by adding setTimeout delay to ensure state updates complete
  - Moved toast notification to occur after foreldelse analysis completes
  - Foreldelse filtering now correctly limits uføregrad calculation to 2 meldekort before foreldelse date on first press
  - System now processes 20 meldekort instead of all 140 when foreldelse is detected
- July 05, 2025. Enhanced salary processing with:
  - Frequent salary changes detection (6+ changes per year) with visual warnings
  - Nominal salary calculation with forward-fill logic and day-weighted averaging (missing months use most recent previous salary, weighted by actual days in each month)
  - Nominal position percentage calculation using same forward-fill and day-weighted logic as salary
  - Correct 12-month calculation starting from sick date month going backwards
  - Toggle functionality between nominal and actual salary with dynamic percentage recalculation
  - Improved 0% position handling (shows 0 kr salary with N/A percentage)
  - Three-state salary box colors: red (2-year violation), yellow (other violations), green (OK)
  - Upgraded salary assessment (karens) to check all salaries up to 3 months before sick date with time-based percentage thresholds (2+ years: 15%, 1+ years: 7.5%, 6+ months: 5%, 3-6 months: 2.5%)
- July 01, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.