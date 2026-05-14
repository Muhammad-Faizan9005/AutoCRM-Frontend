# CRM UI Revamp — Agent Prompt
> Version 2 — includes Light/Dark theming, full library stack, icon system, and animation library integration.

---

## Overview & Goal

You are tasked with completely revamping the UI of a CRM (Customer Relationship Management) system. The current UI is plain black and white with no visual hierarchy, no color theming, and no animations. Your job is to transform it into a **professional, polished, and visually refined** product-grade interface — the kind that feels like it belongs to a tier-1 SaaS product (think Linear, Notion, or Vercel's dashboard aesthetic).

Do NOT make cosmetic patches. This is a **full UI overhaul**: design tokens, layout, components, animations, role-based views, light/dark theme system, and all.

---

## System Architecture to Keep in Mind

The CRM has:

- **Three user roles**, each with different access:
  - **Admin** — Full access to the entire system
  - **Manager** — Access restricted to their own team's data
  - **Sales Representative** — Access to the CRM dashboard only (their own leads, contacts, tasks, notes)

- **Core modules/pages:**
  - Dashboard (overview, KPIs, recent activity)
  - Leads
  - Contacts
  - Organizations
  - Notes
  - Tasks

All UI decisions must respect these roles. Role-specific views should feel intentionally scoped — a Sales Rep's dashboard should feel focused and task-oriented, while the Admin view should feel expansive and data-rich.

---

## Technology & Library Stack

Use the following **publicly available, production-grade libraries**. Do not reinvent what these handle. Install all of them before writing any component code.

### UI Component Foundation

| Library | Purpose | Install |
|---|---|---|
| **shadcn/ui** | Base component primitives (buttons, inputs, dialogs, dropdowns, tabs, tooltips, etc.) — unstyled but well-structured, fully customizable via Tailwind | `npx shadcn-ui@latest init` |
| **Tailwind CSS v3** | Utility-first styling engine, used alongside shadcn/ui | `npm install tailwindcss` |
| **Radix UI** | Accessible headless primitives (comes with shadcn/ui — use directly for accordion, popover, select, etc.) | Bundled with shadcn |

> **Rule:** shadcn/ui components are the **standard** for all form inputs, buttons, dialogs, dropdowns, tooltips, and badges. Do not build these from scratch. Customize their CSS variables to match the token system below.

### Charts & Data Visualization

| Library | Purpose | Install |
|---|---|---|
| **Recharts** | Primary chart library — line, bar, area, pie/donut charts, responsive containers | `npm install recharts` |
| **Tremor** | High-level dashboard components — stat cards, sparklines, progress bars, donut charts | `npm install @tremor/react` |

> Use **Tremor** for KPI stat cards and summary widgets. Use **Recharts** for detailed pipeline charts, activity trends, and performance graphs. Both support dark mode via className overrides tied to your CSS tokens.

### Icons

| Library | Purpose | Install |
|---|---|---|
| **Lucide React** | Primary icon set — 1000+ consistent outline icons, tree-shakeable React components | `npm install lucide-react` |
| **Phosphor Icons** | Secondary / decorative icons — duotone weight for empty states and illustration contexts | `npm install @phosphor-icons/react` |

> **Rule:** Use **Lucide** for all navigation, action, and UI icons (sidebar nav, buttons, table actions, form field icons). Use **Phosphor Duotone** weight only for empty state hero icons and decorative illustration contexts. Never mix both styles in the same component.

> **Icon sizing standard:**
> - Sidebar navigation: `size={16}`
> - Button icons: `size={15}`
> - Table action buttons: `size={14}`
> - Empty state hero: `size={48}` (Phosphor Duotone)
> - KPI card icons: `size={20}`
> - Notifications / bell: `size={18}`

### Animation

| Library | Purpose | Install |
|---|---|---|
| **Framer Motion** | Primary animation library — page transitions, mount/unmount, drag interactions, complex gestures | `npm install framer-motion` |
| **AutoAnimate** | Zero-config automatic list animations — wraps any list/table parent for smooth add/remove/reorder | `npm install @formkit/auto-animate` |
| **tailwindcss-animate** | CSS-only animation utilities — skeleton shimmer, badge ping, simple hover effects | `npm install tailwindcss-animate` |

> **Rule:** Use **Framer Motion** for complex, intentional animations (page transitions, modals, drawers, Kanban drag, count-up). Use **AutoAnimate** for any list that dynamically gains or loses items (task list, contacts table body, notes grid). Use **tailwindcss-animate** for lightweight CSS-only effects (skeleton pulse, ping dot on notifications).

### Theme Management

| Library | Purpose | Install |
|---|---|---|
| **next-themes** | Light/dark/system theme management with zero flash on load | `npm install next-themes` |

> If not using Next.js, replicate using `localStorage` + `data-theme` attribute on `<html>`. The CSS variable pattern below is identical.

### Drag and Drop (Kanban)

| Library | Purpose | Install |
|---|---|---|
| **@dnd-kit/core + @dnd-kit/sortable** | Modern, accessible drag-and-drop for Kanban board and sortable task lists | `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` |

### Utility Libraries

| Library | Purpose | Install |
|---|---|---|
| **date-fns** | Date formatting for timestamps, due dates, activity feeds | `npm install date-fns` |
| **clsx + tailwind-merge** | Conditional className merging — required for shadcn/ui pattern | `npm install clsx tailwind-merge` |

---

## Light / Dark Theme System

This is a **first-class requirement**, not an afterthought. Both themes must be fully designed and production-ready. The **dark theme is the primary default**. The light theme must feel equally polished — not just an inverted version of dark.

### Theme Architecture

All colors live as CSS custom properties scoped to `[data-theme="dark"]` and `[data-theme="light"]` on the `<html>` element. Every single component must consume these tokens — no hardcoded color values anywhere in the codebase.

```css
/* ─── DARK THEME (default) ─────────────────────────── */
[data-theme="dark"],
:root {
  --color-bg-base:        #0F1117;
  --color-bg-surface:     #16181F;
  --color-bg-elevated:    #1E2029;
  --color-bg-hover:       #252830;

  --color-border:         #2A2D38;
  --color-border-strong:  #3A3E50;

  --color-accent:         #5B8DEF;
  --color-accent-dim:     #3A5FA8;
  --color-accent-subtle:  rgba(91, 141, 239, 0.12);
  --color-accent-text:    #93B4F5;

  --color-text-primary:   #E8EAF0;
  --color-text-secondary: #8B8FA8;
  --color-text-tertiary:  #555870;
  --color-text-inverse:   #0F1117;

  --color-success:        #4A9E7F;
  --color-success-subtle: rgba(74, 158, 127, 0.12);
  --color-warning:        #B8924A;
  --color-warning-subtle: rgba(184, 146, 74, 0.12);
  --color-danger:         #C0516A;
  --color-danger-subtle:  rgba(192, 81, 106, 0.12);

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.5);
  --shadow-xl:  0 16px 48px rgba(0,0,0,0.6);

  color-scheme: dark;
}

/* ─── LIGHT THEME ───────────────────────────────────── */
[data-theme="light"] {
  --color-bg-base:        #F4F5F9;
  --color-bg-surface:     #FFFFFF;
  --color-bg-elevated:    #FFFFFF;
  --color-bg-hover:       #EEF0F6;

  --color-border:         #E2E4ED;
  --color-border-strong:  #C8CBDA;

  --color-accent:         #4A7DE0;
  --color-accent-dim:     #3260C0;
  --color-accent-subtle:  rgba(74, 125, 224, 0.10);
  --color-accent-text:    #3260C0;

  --color-text-primary:   #1A1D2E;
  --color-text-secondary: #5A5E78;
  --color-text-tertiary:  #9499B2;
  --color-text-inverse:   #FFFFFF;

  --color-success:        #2E8B6A;
  --color-success-subtle: rgba(46, 139, 106, 0.10);
  --color-warning:        #9A6E20;
  --color-warning-subtle: rgba(154, 110, 32, 0.10);
  --color-danger:         #B03050;
  --color-danger-subtle:  rgba(176, 48, 80, 0.10);

  --shadow-sm:  0 1px 3px rgba(0,0,0,0.07);
  --shadow-md:  0 4px 16px rgba(0,0,0,0.08);
  --shadow-lg:  0 8px 32px rgba(0,0,0,0.10);
  --shadow-xl:  0 16px 48px rgba(0,0,0,0.12);

  color-scheme: light;
}
```

### Mapping shadcn/ui Variables to Tokens

In `globals.css`, map shadcn's expected variable names to your token system so all shadcn components automatically adopt the correct theme:

```css
:root, [data-theme="dark"] {
  --background:        var(--color-bg-base);
  --foreground:        var(--color-text-primary);
  --card:              var(--color-bg-surface);
  --card-foreground:   var(--color-text-primary);
  --border:            var(--color-border);
  --input:             var(--color-bg-elevated);
  --primary:           var(--color-accent);
  --primary-foreground: var(--color-text-inverse);
  --muted:             var(--color-bg-hover);
  --muted-foreground:  var(--color-text-secondary);
  --accent:            var(--color-accent-subtle);
  --accent-foreground: var(--color-accent-text);
  --destructive:       var(--color-danger);
  --ring:              var(--color-accent);
  --radius:            0.5rem;
}

[data-theme="light"] {
  --background:        var(--color-bg-base);
  --foreground:        var(--color-text-primary);
  --card:              var(--color-bg-surface);
  --border:            var(--color-border);
  --input:             var(--color-bg-elevated);
  --primary:           var(--color-accent);
  --primary-foreground: var(--color-text-inverse);
  --muted:             var(--color-bg-hover);
  --muted-foreground:  var(--color-text-secondary);
  --destructive:       var(--color-danger);
  --ring:              var(--color-accent);
}
```

### Tailwind Dark Mode Config

```js
// tailwind.config.js
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [require('tailwindcss-animate')],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      }
    }
  }
}
```

### ThemeProvider Setup

```tsx
// app/providers.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

### ThemeToggle Component

Place in the top navbar, right side:

```tsx
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="p-2 rounded-md hover:bg-[var(--color-bg-hover)] transition-colors"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0,   scale: 1   }}
          exit={{    opacity: 0, rotate:  30, scale: 0.8 }}
          transition={{ duration: 0.18 }}
        >
          {theme === 'dark'
            ? <Sun  size={16} color="var(--color-text-secondary)" />
            : <Moon size={16} color="var(--color-text-secondary)" />
          }
        </motion.div>
      </AnimatePresence>
    </button>
  )
}
```

### Making Recharts Theme-Aware

```tsx
import { useTheme } from 'next-themes'

function useChartColors() {
  const { theme } = useTheme()
  return {
    grid:        theme === 'dark' ? '#2A2D38' : '#E2E4ED',
    text:        theme === 'dark' ? '#8B8FA8' : '#5A5E78',
    accent:      theme === 'dark' ? '#5B8DEF' : '#4A7DE0',
    areaFill:    theme === 'dark' ? 'rgba(91,141,239,0.15)' : 'rgba(74,125,224,0.10)',
    tooltipBg:   'var(--color-bg-elevated)',
    tooltipBorder: 'var(--color-border)',
  }
}
```
Pass `chartColors.grid` to `<CartesianGrid stroke>`, `chartColors.text` to `<XAxis stroke>` and `<YAxis stroke>`, and set `<Tooltip contentStyle>` using the tooltip values.

---

## Design Philosophy

### Tone
**Refined Utilitarian** — clean, purposeful, calm. Every element earns its place.

### Keywords
Professional · Subtle · Trustworthy · Focused · Modern · Calm

### What to AVOID
- ❌ Bright, saturated colors (no neon green, no orange CTAs, no red as branding)
- ❌ Flashy gradients or rainbow effects
- ❌ Inter, Roboto, Arial, system-ui — use Sora + DM Sans as specified
- ❌ Generic purple-gradient-on-white "startup" aesthetic
- ❌ Excessive card shadows or glass-morphism overuse
- ❌ Animations disconnected from user actions
- ❌ Building buttons, inputs, dialogs, or dropdowns from scratch instead of using shadcn/ui

---

## Typography

```html
<!-- In <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

```css
--font-display: 'Sora', sans-serif;   /* Headings, page titles, KPI numbers */
--font-body:    'DM Sans', sans-serif; /* All body text, labels, UI copy */

--text-xs:    11px;  /* Badge labels, table header uppercase */
--text-sm:    13px;  /* Secondary labels, captions */
--text-base:  14px;  /* Body text, table cells */
--text-md:    15px;  /* Slightly emphasized body */
--text-lg:    18px;  /* Section headings */
--text-xl:    22px;  /* Page sub-titles */
--text-2xl:   28px;  /* KPI numbers */
--text-3xl:   36px;  /* Page titles (dashboard greeting) */

--weight-regular:  400;
--weight-medium:   500;
--weight-semibold: 600;
--weight-bold:     700;
```

---

## Layout & Structure

### Global Shell
```
┌────────────────────────────────────────────────────────┐
│  Sidebar (240px fixed, collapsible to 64px)            │
│  │  Logo                                               │
│  │  ──────────────                                     │
│  │  Nav items (Lucide icons)                           │
│  │  ──────────────                                     │
│  │  Theme toggle (bottom)                              │
│  │  User avatar + Role badge                           │
│                                                        │
│  Main Content Area                                     │
│  │  Top Navbar (56px)                                  │
│  │   Left: Page title                                  │
│  │   Center: Search bar (shadcn Input, expands)        │
│  │   Right: ThemeToggle + Bell (Lucide) + Avatar       │
│  │                                                     │
│  │  Page Content (scrollable, max-width 1280px)        │
└────────────────────────────────────────────────────────┘
```

### Sidebar Specs
- Background: `var(--color-bg-surface)`
- Active item: `border-left: 3px solid var(--color-accent)` + `background: var(--color-accent-subtle)`
- Collapse: Framer Motion `layout` + `animate={{ width: collapsed ? 64 : 240 }}`
- When collapsed: icon only, no labels, tooltip on hover (shadcn `<Tooltip>`)
- Role badge (bottom, near avatar):
  - Admin: `var(--color-accent)` background
  - Manager: `var(--color-success)` background
  - Sales Rep: `var(--color-bg-hover)` background, `var(--color-text-secondary)` text

### Main Content
- Padding: `24px 32px`
- Max width: `1280px`, centered
- 12-column CSS grid, `gap: 20px`

---

## shadcn/ui Components — Full List

Install and use these — do not build equivalents from scratch:

```bash
npx shadcn-ui add button input select dialog sheet badge avatar skeleton tabs
npx shadcn-ui add tooltip dropdown-menu checkbox switch command separator popover calendar
```

| Component | Used for |
|---|---|
| `<Button>` | All buttons across every page |
| `<Input>` | All text inputs in forms and search |
| `<Select>` | All dropdowns / select fields |
| `<Dialog>` | Confirmation modals, create/edit forms |
| `<Sheet>` | Side drawers (contact detail, lead detail) |
| `<Badge>` | Status pills (Open, Closed, Pending), role badges |
| `<Avatar>` | User avatars, contact initials circles |
| `<Skeleton>` | Loading states for all data-fetching views |
| `<Tabs>` | Contact/lead detail drawer tab navigation |
| `<Tooltip>` | Icon-only button labels, truncated text |
| `<DropdownMenu>` | Table row action menus (3-dot), nav menus |
| `<Checkbox>` | Task completion, table row multi-select |
| `<Switch>` | Settings toggles |
| `<Command>` | Global search / command palette (Cmd+K) |
| `<Popover>` | Filter panels, date pickers |
| `<Calendar>` | Task due date picker (inside Popover) |
| `<Separator>` | Dividers in sidebar, panels, detail views |

---

## Dashboard Charts

### KPI Stat Cards — Tremor

```tsx
import { Card, Metric, Text, BadgeDelta, Flex, Icon } from '@tremor/react'
import { Users } from 'lucide-react'

<Card className="bg-[var(--color-bg-surface)] border-[var(--color-border)]">
  <Flex>
    <div>
      <Text className="text-[var(--color-text-secondary)]">Total Leads</Text>
      <Metric className="text-[var(--color-text-primary)] font-display">
        <CountUp value={248} />
      </Metric>
    </div>
    <Flex flexDirection="col" alignItems="end">
      <Icon icon={Users} size="md" color="blue" className="bg-[var(--color-accent-subtle)]" />
      <BadgeDelta deltaType="increase" className="mt-2">12%</BadgeDelta>
    </Flex>
  </Flex>
</Card>
```

### Activity Trend — Recharts AreaChart

```tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const colors = useChartColors()

<ResponsiveContainer width="100%" height={200}>
  <AreaChart data={activityData}>
    <defs>
      <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={colors.accent} stopOpacity={0.3} />
        <stop offset="100%" stopColor={colors.accent} stopOpacity={0}   />
      </linearGradient>
    </defs>
    <CartesianGrid stroke={colors.grid} strokeDasharray="3 3" vertical={false} />
    <XAxis dataKey="date" stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} />
    <YAxis stroke={colors.text} fontSize={12} tickLine={false} axisLine={false} />
    <Area type="monotone" dataKey="value" stroke={colors.accent} fill="url(#areaFill)" strokeWidth={2} />
    <Tooltip
      contentStyle={{
        background: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        borderRadius: 8,
        color: 'var(--color-text-primary)',
        fontSize: 13,
      }}
    />
  </AreaChart>
</ResponsiveContainer>
```

### Lead Pipeline — Recharts horizontal BarChart

```tsx
<BarChart data={pipelineData} layout="vertical">
  <XAxis type="number" stroke={colors.text} fontSize={12} />
  <YAxis type="category" dataKey="stage" stroke={colors.text} fontSize={12} width={90} />
  <Bar dataKey="count" fill={colors.accent} radius={[0, 4, 4, 0]} />
  <Tooltip contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8 }} />
</BarChart>
```

### Task Completion — Tremor DonutChart

```tsx
import { DonutChart, Legend } from '@tremor/react'
<DonutChart data={taskData} category="value" index="name" colors={["blue", "slate"]} />
<Legend categories={["Completed", "Pending"]} colors={["blue", "slate"]} />
```

---

## Animation Implementation

### Framer Motion — Page Transitions

Wrap every page's root element. Use `<AnimatePresence mode="wait">` in your router:

```tsx
const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.18 } }
}

export default function Page() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* content */}
    </motion.div>
  )
}
```

### Framer Motion — Staggered Table Rows

```tsx
const container = { animate: { transition: { staggerChildren: 0.025 } } }
const row = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18 } }
}

<motion.tbody variants={container} initial="initial" animate="animate">
  {rows.map(r => <motion.tr key={r.id} variants={row}>...</motion.tr>)}
</motion.tbody>
```

### Framer Motion — Sidebar Collapse

```tsx
<motion.aside
  layout
  animate={{ width: collapsed ? 64 : 240 }}
  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
>
  <AnimatePresence>
    {!collapsed && (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.1 } }}
        exit={{   opacity: 0, transition: { duration: 0.05 } }}
      >
        {label}
      </motion.span>
    )}
  </AnimatePresence>
</motion.aside>
```

### Framer Motion — Sidebar Nav Stagger on Mount

```tsx
const navContainer = { animate: { transition: { staggerChildren: 0.04 } } }
const navItem = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } }
}
<motion.nav variants={navContainer} initial="initial" animate="animate">
  {navItems.map(item => <motion.div key={item.path} variants={navItem}>...</motion.div>)}
</motion.nav>
```

### Framer Motion — KPI Count-Up Numbers

```tsx
import { useSpring, useTransform, motion } from 'framer-motion'
import { useEffect } from 'react'

function CountUp({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 60, damping: 20 })
  const display = useTransform(spring, v => Math.round(v).toLocaleString())
  useEffect(() => { spring.set(value) }, [value])
  return <motion.span>{display}</motion.span>
}
```

### Framer Motion — Modal (shadcn Dialog overlay + content)

shadcn's Dialog uses Radix `data-state` attributes. Animate via CSS:

```css
@keyframes dialogOverlayIn  { from { opacity: 0; }              to { opacity: 1; } }
@keyframes dialogOverlayOut { from { opacity: 1; }              to { opacity: 0; } }
@keyframes dialogContentIn  { from { opacity: 0; transform: scale(0.97) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes dialogContentOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.97); } }

[data-state="open"]  > .dialog-overlay { animation: dialogOverlayIn  200ms ease forwards; }
[data-state="closed"]> .dialog-overlay { animation: dialogOverlayOut 160ms ease forwards; }
[data-state="open"]  > .dialog-content { animation: dialogContentIn  280ms cubic-bezier(0.4,0,0.2,1) forwards; }
[data-state="closed"]> .dialog-content { animation: dialogContentOut 200ms cubic-bezier(0.4,0,1,1) forwards; }
```

### Framer Motion — Drawer (shadcn Sheet)

```css
@keyframes sheetSlideIn  { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes sheetSlideOut { from { transform: translateX(0); }    to { transform: translateX(100%); } }

[data-state="open"]  .sheet-content { animation: sheetSlideIn  300ms cubic-bezier(0.4,0,0.2,1) forwards; }
[data-state="closed"].sheet-content { animation: sheetSlideOut 220ms cubic-bezier(0.4,0,1,1) forwards; }
```

### Framer Motion — Task Checkbox Checkmark Draw-In

```tsx
<svg viewBox="0 0 24 24" width={15} height={15}>
  <motion.path
    d="M4 12 L9 17 L20 6"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: checked ? 1 : 0 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
  />
</svg>
```

Task text on completion: `transition: color 200ms, text-decoration 200ms` → `color: var(--color-text-tertiary)` + `text-decoration: line-through`.

### AutoAnimate — Dynamic Lists

```tsx
import { useAutoAnimate } from '@formkit/auto-animate/react'

// Tasks list
function TaskGroup({ tasks }) {
  const [listRef] = useAutoAnimate()
  return <ul ref={listRef}>{tasks.map(t => <TaskItem key={t.id} task={t} />)}</ul>
}

// Contacts table
function ContactsTable({ contacts }) {
  const [tbodyRef] = useAutoAnimate()
  return <tbody ref={tbodyRef}>{contacts.map(c => <ContactRow key={c.id} contact={c} />)}</tbody>
}

// Notes grid
function NotesGrid({ notes }) {
  const [gridRef] = useAutoAnimate()
  return <div ref={gridRef} className="notes-grid">{notes.map(n => <NoteCard key={n.id} note={n} />)}</div>
}
```

Apply `useAutoAnimate` to: task list per group, contacts `<tbody>`, notes grid container, notification list.

### dnd-kit — Kanban Board Card Lift

```tsx
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function KanbanCard({ id, lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging && {
      scale: '1.03',
      boxShadow: 'var(--shadow-xl)',
      zIndex: 999,
      cursor: 'grabbing',
      opacity: 0.95,
    })
  }
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>...</div>
}
```

Drop target columns: pulse `var(--color-accent-subtle)` background on `isOver` state.

### CSS / tailwindcss-animate — Notification Bell Ring

```css
@keyframes bellRing {
  0%, 100% { transform: rotate(0deg); }
  15%       { transform: rotate(8deg); }
  30%       { transform: rotate(-8deg); }
  45%       { transform: rotate(5deg); }
  60%       { transform: rotate(-5deg); }
}
.bell-animate { animation: bellRing 0.5s ease; }
```

Add the class via JS when a new notification arrives, remove it after `500ms`.

### CSS / tailwindcss-animate — Skeleton Shimmer

```tsx
// shadcn <Skeleton> uses animate-pulse by default
// For a shimmer effect, extend in globals.css:
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg,
    var(--color-bg-elevated) 25%,
    var(--color-bg-hover)    50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

In Framer Motion components:
```tsx
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
<motion.div transition={{ duration: prefersReduced ? 0 : 0.28 }} />
```

---

## Page-Specific Design

### Dashboard (role-scoped)

- **Row 1:** 4 Tremor KPI stat cards — full width, CountUp numbers, BadgeDelta trend
- **Row 2:** Recharts AreaChart (activity trend, 60%) + Tremor DonutChart (task completion, 40%)
- **Row 3:** Recharts horizontal BarChart (lead pipeline) — full width
- **Row 4:** Recent contacts/leads mini-table

Role scoping:
- **Admin:** All 4 rows + team performance table + system totals
- **Manager:** All 4 rows with team-scoped data + team leaderboard widget
- **Sales Rep:** Row 1 (personal KPIs only) + Row 2 (personal activity) + today's task list

### Leads Page

- Header: `<h1>` + shadcn `<Button variant="default">` "Add Lead" + Lucide `Plus` icon
- View toggle: Lucide `LayoutList` / `Columns2` icon buttons (shadcn `<Button variant="outline">` group)
- **Table view:** sortable columns, row hover shows Lucide `Eye`, `Pencil`, `Trash2` action buttons (shadcn `<Button variant="ghost">` + `<Tooltip>`)
- **Kanban view:** dnd-kit columns, Framer Motion card lift, AutoAnimate for card add/remove
- "Add Lead" → shadcn `<Dialog>` with shadcn `<Input>`, `<Select>`, `<Button>` form

### Contacts Page

- Table: shadcn `<Avatar>` with initials fallback (accent-background), name, email, phone, org, last activity timestamp (date-fns `formatDistanceToNow`)
- Row click → shadcn `<Sheet>` (right side drawer, 480px)
- Inside drawer: shadcn `<Tabs>` → Overview / Notes / Tasks / Activity
- AutoAnimate on `<tbody>`

### Organizations Page

- Card grid (not table) — CSS `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- Each card: Lucide `Building2` placeholder, org name, `<Badge>` for industry, contact count, deal value
- Card bottom: expandable section (Radix `<Collapsible>`, Framer Motion `layout` for height animation) showing linked contacts as mini-avatars

### Notes Page

- CSS `column-count: 3` masonry grid
- Each note card: Lucide `StickyNote` top-right, title, snippet (2 lines, ellipsis), `<Avatar>` + `formatDistanceToNow` footer
- Left border: `4px solid` — category-coded: accent / success / warning
- FAB (Floating Action Button): fixed bottom-right, shadcn `<Button>` circular, Lucide `Plus`, Framer Motion `whileHover={{ scale: 1.05 }}`
- AutoAnimate on grid wrapper

### Tasks Page

- Groups: "Today" / "This Week" / "Later" / "Completed" — each collapsible with Radix `<Collapsible>` + Framer Motion height animation
- Each task row: shadcn `<Checkbox>` + task title + shadcn `<Avatar>` (assignee, 24px) + date-fns `format` due date `<Badge>` + priority dot
- Priority dot: `8px` circle — high `var(--color-danger)` at 60% opacity, medium `var(--color-warning)` at 60%, low `var(--color-text-tertiary)` at 40%
- AutoAnimate on each group's list
- Framer Motion checkmark SVG draw-in on check, task text strikethrough + color fade `200ms`

---

## Empty States

Every list/table must have a designed empty state — not just "No data":

```
Leads:         Phosphor <FunnelSimple weight="duotone"> 48px, "No leads yet", "Add your first lead to track your pipeline"
Contacts:      Phosphor <AddressBook  weight="duotone"> 48px, "No contacts",   "Import or add contacts manually"
Organizations: Phosphor <Buildings    weight="duotone"> 48px, "No organizations", "Link orgs to your contacts"
Notes:         Phosphor <Note         weight="duotone"> 48px, "Nothing noted yet", "Capture important details with a note"
Tasks (today): Phosphor <CheckSquare  weight="duotone"> 48px, "All clear!", "No tasks scheduled for today"
```

Animate entry with Framer Motion:
```tsx
<motion.div
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }} // spring-like
>
```

---

## Role-Based Visual Differentiation

| Element | Admin | Manager | Sales Rep |
|---|---|---|---|
| Role badge | `ADMIN` — accent blue | `MANAGER` — success teal | `SALES` — muted grey |
| Sidebar nav items | All 6 + Settings | 5 modules (no Settings) | Dashboard + Tasks only |
| Dashboard density | Full — all charts + team data | Medium — team-scoped charts | Minimal — personal only |
| Table row actions | Full CRUD (Eye + Pencil + Trash2) | Edit + View (Eye + Pencil) | View only (Eye) |
| Global command palette | All entities + admin commands | All entities | Personal tasks + contacts |

---

## Accessibility

- Focus ring on all interactive elements: `box-shadow: 0 0 0 3px var(--color-accent-subtle)`
- All shadcn/Radix components: ARIA attributes (`aria-expanded`, `aria-selected`, `role`) handled automatically
- All Lucide icon-only buttons: `aria-label` attribute required
- Keyboard navigation: tab, enter, escape, arrow keys — fully supported via Radix primitives
- Color contrast: verify WCAG AA minimums for both themes using a contrast checker
- `prefers-reduced-motion`: disable all animations as specified above

---

## Implementation Order

Execute strictly in this order:

1. **Install all libraries** — shadcn init, Tailwind + tailwindcss-animate, Framer Motion, Recharts, Tremor, Lucide React, Phosphor Icons, AutoAnimate, dnd-kit, next-themes, date-fns, clsx + tailwind-merge
2. **Create `globals.css`** — full dark + light CSS token sets, shadcn variable mappings, base reset, scrollbar styling
3. **Configure `tailwind.config.js`** — dark mode class, tailwindcss-animate plugin, custom font families
4. **Set up ThemeProvider** (next-themes) wrapping app root
5. **Install shadcn components** one by one (see list above)
6. **Rebuild layout shell** — Sidebar (Framer Motion collapsible) + TopNav (ThemeToggle, search, bell, avatar) + main wrapper
7. **Build dashboard charts** — Tremor KPI cards with CountUp → Recharts AreaChart → Recharts BarChart → Tremor DonutChart — all theme-aware
8. **Build pages in order** — Dashboard → Leads → Contacts → Organizations → Notes → Tasks
9. **Add Framer Motion animations** — page transitions → stagger lists → modals → drawer → sidebar stagger → count-up
10. **Add AutoAnimate** to all dynamic lists
11. **Build Kanban** (dnd-kit) on Leads page with card lift animation
12. **Build empty states** with Phosphor icons and Framer Motion entry animation
13. **Add skeleton loaders** (shadcn `<Skeleton>`) to every data-fetching view
14. **Add global command palette** (shadcn `<Command>`, Cmd+K shortcut)
15. **Theme audit** — toggle through every single page in both light and dark; verify zero hardcoded colors remain
16. **Role audit** — switch between Admin / Manager / Sales Rep and verify correct nav items, dashboard widgets, and table actions
17. **Accessibility pass** — focus rings, aria-labels, keyboard navigation, contrast ratios
18. **Reduced motion pass** — enable `prefers-reduced-motion: reduce` in OS settings and verify all animations are disabled

---

## Deliverable Checklist

### Foundation
- [ ] All libraries installed and configured
- [ ] `globals.css` with dark + light token sets complete
- [ ] `tailwind.config.js` — dark mode, tailwindcss-animate, Sora + DM Sans fonts
- [ ] shadcn CSS variables mapped to token system
- [ ] ThemeProvider set up, zero flash on load
- [ ] Google Fonts (Sora + DM Sans) loaded

### Theme System
- [ ] Dark theme verified on every page
- [ ] Light theme verified on every page
- [ ] ThemeToggle in navbar with Framer Motion icon swap animation
- [ ] Recharts colors respond to theme via `useChartColors()` hook
- [ ] Tremor components respond to theme via Tailwind dark: overrides
- [ ] shadcn/ui components respond to theme via CSS variable mapping

### Layout Shell
- [ ] Sidebar (240px → 64px, Framer Motion, Lucide icons, role badge, collapse button)
- [ ] Top navbar (ThemeToggle, shadcn search Input, Lucide Bell + Avatar)
- [ ] Responsive behavior on smaller screens

### shadcn/ui Components
- [ ] Button (default, outline, ghost, destructive variants)
- [ ] Input, Select, Checkbox, Switch
- [ ] Dialog (modals) + Sheet (drawers)
- [ ] Badge (status pills, role badges)
- [ ] Avatar (with initials fallback)
- [ ] Skeleton (all loading states)
- [ ] Tabs (drawer tab navigation)
- [ ] Tooltip (all icon-only buttons)
- [ ] DropdownMenu (table row actions)
- [ ] Command (global Cmd+K palette)
- [ ] Popover + Calendar (date pickers)
- [ ] Separator (sidebar, panels)

### Icons
- [ ] Lucide React — all navigation, action, UI icons with correct sizing
- [ ] Phosphor Duotone — all empty state hero icons (48px)
- [ ] No icon style mixing within the same component

### Charts
- [ ] Tremor KPI stat cards + CountUp animation
- [ ] Recharts AreaChart (activity trend) — theme-aware
- [ ] Recharts BarChart horizontal (lead pipeline) — theme-aware
- [ ] Tremor DonutChart (task completion)
- [ ] All chart tooltips styled with token colors

### Animations
- [ ] Page transitions (Framer Motion AnimatePresence)
- [ ] Sidebar collapse (Framer Motion layout)
- [ ] Sidebar nav stagger on mount (Framer Motion)
- [ ] Staggered table/list rows (Framer Motion)
- [ ] Modal open/close (CSS keyframes on Radix data-state)
- [ ] Drawer slide-in/out (CSS keyframes)
- [ ] KPI count-up numbers (Framer Motion useSpring)
- [ ] ThemeToggle icon swap (Framer Motion AnimatePresence)
- [ ] Notification bell ring (CSS keyframes via class)
- [ ] Task checkbox checkmark draw-in (Framer Motion pathLength)
- [ ] Task completion strikethrough + color fade
- [ ] AutoAnimate — tasks list per group
- [ ] AutoAnimate — contacts table tbody
- [ ] AutoAnimate — notes grid container
- [ ] Kanban card lift on drag (dnd-kit + transform)
- [ ] Empty state fade+rise entry (Framer Motion spring)
- [ ] Skeleton shimmer (tailwindcss-animate)
- [ ] `prefers-reduced-motion` disables all animations

### Pages
- [ ] Dashboard (Admin / Manager / Sales Rep role variants)
- [ ] Leads (table view + Kanban view)
- [ ] Contacts (table + Sheet drawer + Tabs)
- [ ] Organizations (card grid + collapsible linked contacts)
- [ ] Notes (masonry card grid + FAB + Dialog)
- [ ] Tasks (grouped list + checkbox animations + AutoAnimate)

### Quality
- [ ] Zero hardcoded color values — 100% CSS tokens
- [ ] Both themes tested on every page and component
- [ ] All three roles tested (nav items, data scope, table actions)
- [ ] Empty states on all list/table views
- [ ] Skeleton loaders on all data-fetching views
- [ ] All icon-only buttons have `aria-label`
- [ ] WCAG AA contrast verified in both themes
- [ ] Keyboard navigation works on all interactive elements
- [ ] `prefers-reduced-motion` tested
