/**
 * Date Helper Utilities
 *
 * Centralized date manipulation functions used across the application.
 * DRY principle: weekStart normalization is written once and reused
 * by timesheets, scheduler, and allocation logic.
 */

/**
 * Normalize a date to the Monday of its week (weekStart).
 * Timesheets always use Monday as the week boundary.
 *
 * @param {Date|string} date - Any date within the target week
 * @returns {Date} Monday 00:00:00 of that week
 */
const normalizeToMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Check if a date falls within a range (inclusive on both ends).
 *
 * @param {Date} date - Date to check
 * @param {Date} from - Range start
 * @param {Date} to - Range end
 * @returns {boolean}
 */
const isDateInRange = (date, from, to) => {
  const d = new Date(date).getTime();
  const f = new Date(from).getTime();
  const t = new Date(to).getTime();
  return d >= f && d <= t;
};

/**
 * Check if two date ranges overlap.
 * Used for allocation overlap detection.
 *
 * Two ranges [a1, a2] and [b1, b2] overlap if a1 <= b2 AND b1 <= a2
 *
 * @param {Date} from1 - First range start
 * @param {Date} to1 - First range end
 * @param {Date} from2 - Second range start
 * @param {Date} to2 - Second range end
 * @returns {boolean}
 */
const doDateRangesOverlap = (from1, to1, from2, to2) => {
  const a1 = new Date(from1).getTime();
  const a2 = new Date(to1).getTime();
  const b1 = new Date(from2).getTime();
  const b2 = new Date(to2).getTime();
  return a1 <= b2 && b1 <= a2;
};

/**
 * Get the start of the last completed week (Monday).
 * If today is Monday, returns the PREVIOUS Monday.
 * Used by the scheduler to determine which week to check for missed timesheets.
 *
 * @returns {Date} Monday 00:00:00 of the last completed week
 */
const getLastCompletedWeekStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  let daysBack;

  if (day === 1) {
    // Today is Monday — last completed week started 7 days ago
    daysBack = 7;
  } else if (day === 0) {
    // Today is Sunday — last completed week started 6 days ago
    daysBack = 6;
  } else {
    // Tuesday–Saturday — last completed week started (day - 1) + 7 days ago?
    // Actually: last Monday = go back (day - 1) days. But that week isn't "completed"
    // yet (current week). So go back one more week.
    daysBack = day - 1 + 7;
  }

  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysBack);
  return lastMonday;
};

/**
 * Format a Date object as DD-MM-YYYY string.
 * Matches the display format used across all console screens.
 *
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Parse a DD-MM-YYYY string into a Date object.
 *
 * @param {string} dateStr - Date string in DD-MM-YYYY format
 * @returns {Date|null} Parsed date or null if invalid
 */
const parseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map(Number);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const date = new Date(year, month - 1, day);

  // Verify the date is valid (handles edge cases like Feb 30)
  if (
    date.getDate() !== day ||
    date.getMonth() !== month - 1 ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
};

module.exports = {
  normalizeToMonday,
  isDateInRange,
  doDateRangesOverlap,
  getLastCompletedWeekStart,
  formatDate,
  parseDate,
};
