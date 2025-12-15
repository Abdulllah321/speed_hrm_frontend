# Calendar Integration Guide

This document outlines the calendar component integration from `big-calendar` to `frontend/components/ui/calendar`.

## ✅ Completed

### Core Files
- ✅ `types.ts` - Calendar type definitions
- ✅ `interfaces.ts` - Calendar interfaces (IUser, IEvent, ICalendarCell)
- ✅ `helpers.ts` - Calendar helper functions
- ✅ `schemas.ts` - Zod schemas for event forms
- ✅ `mocks.ts` - Mock data for testing
- ✅ `requests.ts` - API request functions
- ✅ `contexts/calendar-context.tsx` - Calendar context provider
- ✅ `hooks/use-update-event.ts` - Event update hook

### Supporting Components
- ✅ `hooks/use-disclosure.ts` - Disclosure hook
- ✅ `components/ui/avatar-group.tsx` - Avatar group component

### Header Components
- ✅ `components/header/today-button.tsx`
- ✅ `components/header/date-navigator.tsx`
- ✅ `components/header/user-select.tsx`
- ✅ `components/header/calendar-header.tsx`

### Dialog Components
- ✅ `components/dialogs/add-event-dialog.tsx` (simplified - uses native HTML inputs instead of TimeInput/SingleDayPicker)
- ✅ `components/dialogs/edit-event-dialog.tsx` (simplified - uses native HTML inputs)
- ✅ `components/dialogs/event-details-dialog.tsx`

### DND Components
- ✅ `components/dnd/dnd-provider.tsx`

### Main Components
- ✅ `components/client-container.tsx`
- ✅ `index.tsx` - Main calendar export

## ⚠️ Still Need to Copy

### View Components (Critical)
1. **Week and Day View:**
   - `components/week-and-day-view/calendar-day-view.tsx`
   - `components/week-and-day-view/calendar-week-view.tsx`
   - `components/week-and-day-view/calendar-time-line.tsx`
   - `components/week-and-day-view/event-block.tsx`
   - `components/week-and-day-view/day-view-multi-day-events-row.tsx`
   - `components/week-and-day-view/week-view-multi-day-events-row.tsx`

2. **Month View:**
   - `components/month-view/calendar-month-view.tsx`
   - `components/month-view/day-cell.tsx`
   - `components/month-view/event-bullet.tsx`
   - `components/month-view/month-event-badge.tsx`

3. **Year View:**
   - `components/year-view/calendar-year-view.tsx`
   - `components/year-view/year-view-month.tsx`
   - `components/year-view/year-view-day-cell.tsx`

4. **Agenda View:**
   - `components/agenda-view/calendar-agenda-view.tsx`
   - `components/agenda-view/agenda-day-group.tsx`
   - `components/agenda-view/agenda-event-card.tsx`

### DND Components (Critical)
- `components/dnd/custom-drag-layer.tsx`
- `components/dnd/draggable-event.tsx`
- `components/dnd/droppable-day-cell.tsx`
- `components/dnd/droppable-time-block.tsx`

### Settings Components (Optional)
- `components/change-badge-variant-input.tsx`
- `components/change-visible-hours-input.tsx`
- `components/change-working-hours-input.tsx`

## 📦 Dependencies

### Required (Install if missing)
```bash
npm install react-dnd react-dnd-html5-backend
```

### Optional (for better date/time pickers)
If you want to use the original TimeInput and SingleDayPicker components:
```bash
npm install react-aria-components
```

Then copy:
- `big-calendar/src/components/ui/time-input.tsx` → `frontend/components/ui/time-input.tsx`
- `big-calendar/src/components/ui/single-day-picker.tsx` → `frontend/components/ui/single-day-picker.tsx`
- `big-calendar/src/components/ui/single-calendar.tsx` → `frontend/components/ui/single-calendar.tsx`

## 🔧 Import Path Updates

All imports from `@/calendar/*` need to be updated to relative paths or `@/components/ui/calendar/*`.

Example:
- `@/calendar/contexts/calendar-context` → `../../contexts/calendar-context` (relative) or `@/components/ui/calendar/contexts/calendar-context` (absolute)

## 📝 Usage Example

```tsx
import { Calendar } from "@/components/ui/calendar";
import { getEvents, getUsers } from "@/components/ui/calendar/requests";

export default async function CalendarPage() {
  const [events, users] = await Promise.all([getEvents(), getUsers()]);

  return (
    <CalendarProvider users={users} events={events}>
      <ClientContainer view="month" />
    </CalendarProvider>
  );
}
```

Or use the wrapper component:
```tsx
import { Calendar } from "@/components/ui/calendar";
import { getEvents, getUsers } from "@/components/ui/calendar/requests";

export default async function CalendarPage() {
  const [events, users] = await Promise.all([getEvents(), getUsers()]);

  return <Calendar view="month" users={users} events={events} />;
}
```

## 🚀 Next Steps

1. Copy all remaining view components from `big-calendar/src/calendar/components/` to `frontend/components/ui/calendar/components/`
2. Update all import paths in copied files
3. Copy remaining DND components
4. Test each view (day, week, month, year, agenda)
5. Optionally install `react-aria-components` and copy TimeInput/SingleDayPicker for better UX

## 📍 File Locations

**Source:** `big-calendar/src/calendar/`
**Destination:** `frontend/components/ui/calendar/`

