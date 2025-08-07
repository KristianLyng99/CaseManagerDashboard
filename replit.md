# Saksbehandler Verktøy - Date and Case Calculator

## Overview
This project is a full-stack web application designed for DNB Liv, providing date calculation and case management functionalities for Norwegian case handlers. It features intelligent data parsing, calculation, and visualization tools, aimed at streamlining complex financial and case-related assessments. The application targets the specific needs of saksbehandlere, offering capabilities like benefit period calculations, salary assessment for karenstid, and automated detection of financial thresholds and benefit assignments. Its business vision is to improve efficiency and accuracy in case handling, reducing manual errors and providing clear, actionable insights for case workers.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is built as a single-page application with a React frontend and an Express.js backend.

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for client-side routing.
- **UI Components**: Radix UI primitives with shadcn/ui for a consistent and accessible user interface.
- **Styling**: Tailwind CSS with CSS variables for flexible theming.
- **State Management**: React hooks with TanStack Query for server state management.
- **Build Tool**: Vite for optimized development and production builds.
- **Features**: Interactive Excel-like grid for data input, date parsing and calculation, result display with copy-to-clipboard, toast notifications, and an interactive salary visualization chart with threshold indicators.

### Backend Architecture
- **Framework**: Express.js with TypeScript.
- **Runtime**: Node.js with ESM modules.
- **Development**: `tsx` for TypeScript execution.
- **Production**: `esbuild` for bundling.
- **Data Storage**: Drizzle ORM configured for Neon (serverless PostgreSQL) for production, with in-memory storage for development prototyping. Drizzle Kit manages database migrations.
- **Core Logic**: Abstracted storage layer, API endpoint definitions, and integrated Vite development server.
- **Key Features**: Intelligent Excel data parsing, `ajourholddato` salary correction system, G-regulation salary detection, intelligent `grunnlagstype` detection for salary calculations, and robust handling of various salary assessment scenarios including `karens` period analysis.

### System Design Choices
- **UI/UX**: Focus on a streamlined workflow with direct Excel paste functionality into a grid interface, eliminating text area inputs and file uploads. Visual feedback is provided through salary chart visualizations, color-coded status indicators, and clear toggles for calculation methods.
- **Technical Implementations**: Emphasis on type safety (TypeScript), efficient build processes (Vite, esbuild), and clear separation of concerns (frontend/backend, data storage abstraction).
- **Feature Specifications**:
    - Date and duration calculations.
    - Automated `uføregrad` calculation based on `meldekort` data.
    - Salary assessment (`karens`) including 2-year lookback, threshold violation detection (85%, 92.5%), and handling of salary changes, including G-regulation.
    - Detection of new benefit assignments.
    - Manual override for calculation methods (Auto/Faktisk/Normert).
    - Robust error handling and user feedback mechanisms.

## External Dependencies
- **Database Connectivity**: `@neondatabase/serverless`
- **ORM & Validation**: `drizzle-orm`, `drizzle-zod`
- **UI Libraries**: `@radix-ui` (multiple packages), `shadcn/ui`
- **Query Management**: `@tanstack/react-query`
- **Date Manipulation**: `date-fns`
- **Charting**: `recharts`
- **Development Tools**: TypeScript, Vite, ESBuild, `@replit/vite-plugin-runtime-error-modal`