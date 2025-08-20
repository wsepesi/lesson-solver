# Design System Overhaul Plan

## Vision
Move from default shadcn styling to a more sophisticated, minimal design with navy accents and squared corners. Focus on simplicity and ease of navigation through scheduling steps, with calendars as the focal point.

## Design Principles
1. **Minimal but sophisticated** - Clean lines, purposeful whitespace
2. **Navigation clarity** - Clear visual hierarchy for scheduling workflow
3. **Calendar-centric** - Calendars should be the visual focal point
4. **Squared aesthetic** - Move away from rounded corners for a more professional look
5. **Subtle color usage** - Navy as primary accent, restraint elsewhere

## Color Palette

### Primary Colors
- **Navy**: `#1e3a5f` - Primary brand color for headers, CTAs, active states
- **Deep Navy**: `#0f2540` - Hover states, emphasis
- **Light Navy**: `#2c4d70` - Secondary actions, borders

### Neutral Colors
- **Pure White**: `#ffffff` - Backgrounds, cards
- **Off White**: `#fafbfc` - Secondary backgrounds
- **Light Gray**: `#f3f4f6` - Borders, dividers
- **Medium Gray**: `#9ca3af` - Muted text, placeholders
- **Dark Gray**: `#374151` - Secondary text
- **Near Black**: `#111827` - Primary text

### Semantic Colors
- **Success**: `#059669` - Confirmed schedules, success states
- **Warning**: `#d97706` - Conflicts, warnings
- **Error**: `#dc2626` - Errors, critical issues
- **Info**: `#2563eb` - Information, hints

### Calendar-Specific Colors
- **Available**: `#e0f2fe` - Light blue tint
- **Selected**: `#1e3a5f` - Navy
- **Unavailable**: `#f3f4f6` - Light gray
- **Conflict**: `#fef2f2` - Light red tint

## Typography

### Font Stack
```css
--font-heading: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;
```

### Font Weights
- **Light**: 300 - Subtle labels
- **Regular**: 400 - Body text
- **Medium**: 500 - Subheadings, buttons
- **Semibold**: 600 - Headings, emphasis
- **Bold**: 700 - Page titles, critical CTAs

### Type Scale
```css
--text-xs: 0.75rem;    /* 12px - Captions, labels */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Lead text */
--text-xl: 1.25rem;    /* 20px - Section headings */
--text-2xl: 1.5rem;    /* 24px - Page headings */
--text-3xl: 1.875rem;  /* 30px - Hero text */
```

## Component Styling

### Global Changes
- **Border radius**: Change from default `radius: 0.5rem` to `radius: 0` (squared corners)
- **Shadows**: Reduce shadow intensity, use only for elevated elements
- **Borders**: Thinner borders (1px), lighter colors
- **Spacing**: More generous padding in cards and forms

### Buttons
```css
/* Primary */
- Background: navy (#1e3a5f)
- Text: white
- Border: none
- Radius: 0
- Padding: 0.625rem 1.25rem
- Font-weight: 500
- Hover: darken background to deep navy

/* Secondary */
- Background: white
- Text: navy
- Border: 1px solid light navy
- Hover: light navy background with opacity

/* Ghost */
- Background: transparent
- Text: dark gray
- Border: none
- Hover: light gray background
```

### Forms
- Input borders: 1px solid light gray
- Focus state: navy border with subtle shadow
- Labels: smaller, uppercase, letter-spacing
- Remove all border radius
- Increase padding for better touch targets

### Cards
- Background: white
- Border: 1px solid light gray
- No border radius
- Subtle shadow only on hover
- Generous padding (1.5rem)

### Calendars (Focal Point)
- Grid lines: very light gray
- Time labels: small, muted
- Day headers: navy, semibold
- Selected cells: navy background with white text
- Available cells: light blue tint
- Hover state: navy border, slight scale
- Today indicator: navy dot or border

### Navigation
- Top nav: white background with bottom border
- Active states: navy text with bottom border indicator
- Breadcrumbs: light gray separators
- Side nav (if applicable): light background with navy active state

### Dialogs/Modals
- Squared corners
- Minimal shadow
- White background
- Navy header text
- Light gray close button

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. Update Tailwind config with new color palette
2. Configure global CSS variables
3. Install and configure Inter font
4. Update shadcn theme configuration
5. Create base component overrides

### Phase 2: Core Components (Week 2)
1. Update Button component with new variants
2. Restyle Form components (inputs, labels, etc.)
3. Update Card component styling
4. Implement new Dialog/Modal styles
5. Update navigation components

### Phase 3: Calendar Focus (Week 3)
1. Redesign calendar grid system
2. Implement new color coding for availability
3. Enhance calendar interaction states
4. Add subtle animations for selections
5. Optimize mobile calendar view

### Phase 4: Workflow Polish (Week 4)
1. Review and refine scheduling flow
2. Add progress indicators with navy accent
3. Improve form validation styling
4. Add subtle transitions between steps
5. Ensure consistent spacing throughout

### Phase 5: Testing & Refinement
1. Cross-browser testing
2. Accessibility audit (ensure sufficient contrast)
3. Mobile responsiveness check
4. User testing for navigation clarity
5. Performance optimization

## Technical Implementation

### Tailwind Config Updates
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1e3a5f',
          dark: '#0f2540',
          light: '#2c4d70',
        },
        gray: {
          50: '#fafbfc',
          100: '#f3f4f6',
          // ... etc
        }
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    }
  }
}
```

### CSS Variable Overrides
```css
:root {
  --radius: 0;
  --primary: 207 47% 25%; /* Navy in HSL */
  --primary-foreground: 0 0% 100%;
  --border: 210 14% 89%;
  /* ... additional overrides */
}
```

### Component Library Updates
- Extend shadcn components rather than replacing
- Create variant classes for squared corners
- Override default props where needed
- Maintain backwards compatibility during transition

## Accessibility Considerations
- Ensure navy (#1e3a5f) meets WCAG AA contrast requirements
- Maintain focus indicators with sufficient contrast
- Test with screen readers
- Preserve keyboard navigation functionality
- Add appropriate ARIA labels for calendar interactions

## Migration Strategy
1. Create feature flag for new design system
2. Implement changes in parallel without breaking existing UI
3. Test thoroughly in staging environment
4. Gradual rollout with ability to rollback
5. Update documentation with new design guidelines

## Success Metrics
- Reduced time to complete scheduling workflow
- Improved calendar interaction accuracy
- Positive user feedback on visual clarity
- Maintained or improved accessibility scores
- No increase in page load times

## Inspiration & References
- Linear.app - squared corners, minimal design
- Notion - clean typography, subtle colors
- Cal.com - calendar-focused interface
- Vercel Dashboard - sophisticated minimalism