# Kanban Board Design Guidelines

## Design Approach: Modern Productivity Tool
**Primary Inspiration**: Linear's minimalist aesthetic + Trello's proven Kanban patterns
**System Foundation**: Material Design principles for consistent interaction patterns
**Rationale**: Utility-focused productivity tool requiring clarity, efficiency, and visual hierarchy for task management

## Core Design Principles
1. **Clarity Over Decoration**: Every visual element serves a functional purpose
2. **Efficiency First**: Minimize clicks, maximize information density without clutter
3. **Smooth Interactions**: Fluid drag-and-drop with clear visual feedback
4. **Performance**: Optimized for Raspberry Pi 3 - minimal animations, efficient rendering

## Color Palette

**Dark Mode (Primary)**
- Background: 215 25% 12% (deep slate)
- Surface: 215 20% 16% (elevated cards)
- Surface Elevated: 215 18% 20% (hover states)
- Text Primary: 0 0% 95%
- Text Secondary: 215 10% 65%
- Borders: 215 15% 25%

**Light Mode**
- Background: 210 20% 98%
- Surface: 0 0% 100%
- Text Primary: 215 20% 15%
- Text Secondary: 215 15% 45%
- Borders: 215 15% 90%

**Accent Colors**
- Primary Action: 215 85% 55% (blue - for CTAs, active states)
- Success: 145 65% 45% (green - "Готово" column indicator)
- Warning: 30 80% 55% (amber - "В процессе" indicator)
- Info: 200 75% 50% (cyan - "К выполнению" indicator)

**Tag/Label Colors** (8 options for task categorization)
- Red: 0 70% 60%, Orange: 25 85% 60%, Yellow: 45 90% 55%, Green: 145 65% 50%
- Blue: 215 80% 60%, Purple: 270 70% 65%, Pink: 330 75% 65%, Gray: 215 10% 50%

## Typography
**Font Stack**: 'Inter' (Google Fonts) for all text
- Display/Headers: 600 weight, tight letter-spacing
- Body: 400 weight, comfortable line-height (1.6)
- UI Elements: 500 weight for buttons, labels

**Scale**
- Page Title: text-2xl md:text-3xl (24-30px)
- Column Headers: text-lg font-semibold (18px)
- Card Titles: text-base font-medium (16px)
- Card Descriptions: text-sm (14px)
- Metadata: text-xs (12px)

## Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12 (p-2, gap-4, m-6, py-8, px-12)
- Consistent 4px/8px rhythm throughout
- Card padding: p-4
- Column spacing: gap-6
- Page margins: px-6 md:px-12

**Board Layout**
- Horizontal scrolling container for columns
- Fixed column width: w-80 (320px)
- Column min-height: min-h-screen to maintain visual balance
- Card gap within columns: gap-3

## Component Library

### Authentication Pages
- Centered card layout (max-w-md mx-auto)
- Replit Auth buttons with provider logos
- Clean form inputs with subtle borders
- Welcome message with app branding

### Navigation Bar
- Fixed top, backdrop-blur-md for glassmorphism effect
- Logo/App name (left), User menu (right)
- Height: h-16
- Border bottom: border-b with theme-appropriate color

### Board View (Main Interface)
**Column Structure**
- Header: Column title + task count badge + add button
- Scrollable card container with custom scrollbar styling
- Visual column indicator (colored top border matching accent colors)

**Task Cards**
- Elevated surface with subtle shadow (shadow-sm hover:shadow-md)
- Rounded corners: rounded-lg
- Card structure top-to-bottom:
  1. Title (text-base font-medium, 2-line clamp)
  2. Description (text-sm text-muted, 3-line clamp, expandable on click)
  3. Tags (horizontal scrolling pills, gap-2)
  4. Footer metadata (text-xs: created date, edit/delete icons)
- Drag handle: Subtle grip icon on hover
- Drag state: opacity-50 + scale-105 transform

**Tag Pills**
- Small rounded badges: px-2 py-1 text-xs rounded-full
- Colored background at 20% opacity with matching text
- Max 3 visible + "+N more" indicator

### Modals/Dialogs
- Centered overlay with backdrop-blur
- Modal container: max-w-lg, rounded-xl, shadow-2xl
- Form fields with floating labels
- Color picker for tag selection (grid of color swatches)

### Drag & Drop Visual Feedback
- Active drag: Card scales to 1.02, subtle shadow increase
- Drop zones: Dashed border (border-2 border-dashed) when dragging over
- Valid drop: border-primary glow effect
- Smooth transitions: transition-all duration-200

## Interaction Patterns
**Card Creation**: Click "+" in column header → inline form appears → Create/Cancel actions
**Card Editing**: Click card → modal with full details → Save/Delete actions  
**Card Movement**: Drag card → visual feedback → drop in column → smooth position animation
**Tag Management**: Click tag in edit mode → color picker modal → select/create tags

## Performance Optimizations
- Virtual scrolling for columns with 100+ cards
- Lazy load card descriptions (show on expand)
- Debounced auto-save (500ms after edit)
- Minimal shadows and blur effects
- CSS transforms over position changes for animations

## Responsive Behavior
**Mobile (< 768px)**
- Single column view with tab navigation between columns
- Swipe gestures for column switching
- Full-screen card edit modals
- Bottom navigation for quick column access

**Desktop (≥ 768px)**
- Horizontal scrolling board view
- Sidebar for filters/settings
- Keyboard shortcuts (n: new card, e: edit, del: delete)

## Images
No hero images required - this is a productivity tool focused on task management interface. All visual interest comes from:
- Clean card designs with color-coded tags
- Smooth drag-and-drop interactions
- Subtle elevation and hover states
- User avatar in navigation (from Replit Auth)