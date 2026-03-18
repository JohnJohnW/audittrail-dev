# Vigil Design System

This document outlines the design guidelines and patterns used throughout the application to ensure visual consistency.

## Color Palette

### Primary Brand Color (Accent)

The accent color is orange, used for primary actions, highlights, and emphasis.

| Token          | Value     | Usage                            |
| -------------- | --------- | -------------------------------- |
| `accent`       | `#ff6b35` | Primary actions, links, emphasis |
| `accent-light` | `#fff4f0` | Backgrounds, subtle highlights   |
| `accent-hover` | `#e55a2b` | Hover states                     |
| `accent-muted` | `#ffb299` | Secondary emphasis, charts       |

**Tailwind usage:**

```html
<button class="bg-accent text-white hover:bg-accent-hover">Action</button>
<div class="bg-accent-light">Subtle background</div>
```

### Gray Scale

Used for text, borders, and neutral backgrounds.

| Class             | Usage                          |
| ----------------- | ------------------------------ |
| `text-gray-900`   | Primary text, headings         |
| `text-gray-600`   | Secondary text, body           |
| `text-gray-500`   | Tertiary text, descriptions    |
| `text-gray-400`   | Captions, timestamps           |
| `border-gray-200` | Card borders, dividers         |
| `bg-gray-50`      | Page backgrounds               |
| `bg-gray-100`     | Input backgrounds, muted areas |

### Status Colors

**Important:** Status colors should ONLY be used for explicit status indicators (badges, alerts). Do NOT use them to differentiate similar elements or for decoration.

| Status  | Background     | Text              | Usage                           |
| ------- | -------------- | ----------------- | ------------------------------- |
| Success | `bg-green-50`  | `text-green-700`  | Completed actions, valid states |
| Warning | `bg-yellow-50` | `text-yellow-700` | Caution, pending states         |
| Error   | `bg-red-50`    | `text-red-700`    | Errors, failed states           |

**Correct usage:**

```tsx
// Badge for status
<Badge variant="success">Completed</Badge>

// Alert for feedback
<div class="bg-green-50 border-green-200 text-green-700">Success message</div>
```

**Incorrect usage:**

```tsx
// DON'T use different colors for similar stat cards
<StatCard color="blue" />   // Wrong
<StatCard color="green" />  // Wrong
<StatCard color="purple" /> // Wrong

// DO use consistent accent color
<StatCard />  // All stats use accent color
```

## Charts and Data Visualization

All charts use a monochromatic orange palette derived from the accent color:

```typescript
import { chart, chartStyles } from '@/lib/design-tokens';

// Bar/Line colors
chart.primary   // #ff6b35 - Main data series
chart.secondary // #ffb299 - Secondary data series
chart.tertiary  // #ffd4c4 - Tertiary data
chart.gray      // #9ca3af - Comparison/baseline

// Use chartStyles for consistent styling
<BarChart>
  <CartesianGrid {...chartStyles.grid} />
  <XAxis tick={chartStyles.axis.tick} />
  <Tooltip contentStyle={chartStyles.tooltip.contentStyle} />
  <Bar fill={chart.primary} radius={chartStyles.bar.radius} />
</BarChart>
```

## Typography

| Style         | Class                                              | Usage                  |
| ------------- | -------------------------------------------------- | ---------------------- |
| Page Title    | `text-xl sm:text-2xl font-semibold tracking-tight` | Main page headings     |
| Section Title | `text-lg font-semibold`                            | Card headers, sections |
| Body          | `text-sm sm:text-base text-gray-600`               | Main content           |
| Small         | `text-xs sm:text-sm text-gray-500`                 | Secondary info         |
| Caption       | `text-xs text-gray-400`                            | Timestamps, metadata   |

## Spacing

| Context      | Class                  | Value              |
| ------------ | ---------------------- | ------------------ |
| Page padding | `px-4 sm:px-6 lg:px-8` | 16px / 24px / 32px |
| Section gap  | `mb-6 sm:mb-8`         | 24px / 32px        |
| Card padding | `p-4 sm:p-6`           | 16px / 24px        |
| Grid gap     | `gap-3 sm:gap-4`       | 12px / 16px        |

## Components

### StatCard

Use for displaying metrics. All stat cards use the accent color for values.

```tsx
import { StatCard, StatCardGrid } from "@/components/ui/StatCard";

<StatCardGrid columns={{ default: 2, lg: 4 }}>
  <StatCard value={42} label="Total Items" />
  <StatCard value="85%" label="Coverage" />
  <StatCard value="Pro" label="Plan" highlight />
</StatCardGrid>;
```

**Guidelines:**

- Use `StatCardGrid` wrapper for equal-height cards
- All values display in accent color
- Use `highlight` prop sparingly for call-to-action cards

### Card

Container for grouped content.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

<Card variant="elevated">
  <CardHeader>
    <CardTitle>Section Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>;
```

### Button

```tsx
<Button variant="accent">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
```

### Badge

For status indicators only.

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
```

## Design Principles

1. **Consistency over decoration**: Use the accent color consistently rather than rainbow colors
2. **Status colors are semantic**: Only use green/yellow/red for actual status indicators
3. **Professional appearance**: Avoid childish multi-color schemes
4. **Responsive by default**: All components should work on mobile
5. **Equal heights**: Grid items should have consistent heights

## File Structure

```
lib/
  design-tokens.ts    # Centralized design values
components/ui/
  StatCard.tsx        # Stat display component
  Card.tsx            # Card container
  Button.tsx          # Button component
  Badge.tsx           # Status badge
  Input.tsx           # Form inputs
```

## Adding New Components

When creating new components:

1. Import colors from `@/lib/design-tokens`
2. Follow existing patterns for responsive classes
3. Use accent color for primary emphasis
4. Document usage in this file
