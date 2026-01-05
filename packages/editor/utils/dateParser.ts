/**
 * Natural language date parser for @ mentions
 * Supports formats like: today, tomorrow, yesterday, next week, 3 days, etc.
 */

export interface DateSuggestion {
  label: string;
  date: string; // ISO format YYYY-MM-DD
  description?: string;
  keywords: string[]; // For fuzzy matching
}

/**
 * Calculate date offset from today
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date as "Tue, Dec 30 2025" (matches daily note format)
 */
function formatDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
}

/**
 * Convert date to relative label if it's today/tomorrow/yesterday
 */
function getRelativeLabel(date: Date): string {
  const today = new Date();
  const todayStr = toISODate(today);
  const tomorrowStr = toISODate(addDays(today, 1));
  const yesterdayStr = toISODate(addDays(today, -1));
  const dateStr = toISODate(date);
  
  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  if (dateStr === yesterdayStr) return 'Yesterday';
  
  return formatDate(date);
}

/**
 * Get all available date suggestions
 * Only Today, Tomorrow, Yesterday are relative - everything else shows absolute dates
 */
export function getAllDateSuggestions(): DateSuggestion[] {
  const today = new Date();
  
  return [
    {
      label: 'Today',
      date: toISODate(today),
      // No description - keep it clean
      keywords: ['today'],
    },
    {
      label: 'Tomorrow',
      date: toISODate(addDays(today, 1)),
      // No description - keep it clean
      keywords: ['tomorrow'],
    },
    {
      label: 'Yesterday',
      date: toISODate(addDays(today, -1)),
      // No description - keep it clean
      keywords: ['yesterday'],
    },
    {
      label: formatDate(addDays(today, 7)), // Show absolute date
      date: toISODate(addDays(today, 7)),
      keywords: ['next week', 'nextweek', '1week', '7days'],
    },
    {
      label: formatDate(addDays(today, -7)), // Show absolute date
      date: toISODate(addDays(today, -7)),
      keywords: ['last week', 'lastweek', 'prev week', 'prevweek'],
    },
    {
      label: formatDate(addDays(today, 3)), // Show absolute date
      date: toISODate(addDays(today, 3)),
      keywords: ['3days', '3 days', 'three days'],
    },
    {
      label: formatDate(addDays(today, 7)), // Show absolute date
      date: toISODate(addDays(today, 7)),
      keywords: ['1week', '1 week', 'one week'],
    },
    {
      label: formatDate(addDays(today, 14)), // Show absolute date
      date: toISODate(addDays(today, 14)),
      keywords: ['2weeks', '2 weeks', 'two weeks', '14days'],
    },
    {
      label: formatDate(addDays(today, 30)), // Show absolute date
      date: toISODate(addDays(today, 30)),
      keywords: ['1month', '1 month', 'one month', '30days'],
    },
    {
      label: formatDate(addDays(today, -3)), // Show absolute date
      date: toISODate(addDays(today, -3)),
      keywords: ['3daysago', '3 days ago', 'three days ago'],
    },
  ];
}

/**
 * Parse numeric day (e.g., "23" → next 23rd in future)
 */
function parseNumericDay(query: string): DateSuggestion | null {
  const normalizedQuery = query.trim();
  const dayMatch = normalizedQuery.match(/^(\d{1,2})$/);
  
  if (!dayMatch) return null;
  
  const day = parseInt(dayMatch[1]);
  if (day < 1 || day > 31) return null;
  
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Try current month first
  let targetDate = new Date(currentYear, currentMonth, day);
  
  // If date is in the past or invalid, try next month
  if (targetDate <= today || targetDate.getDate() !== day) {
    targetDate = new Date(currentYear, currentMonth + 1, day);
    
    // If still invalid (e.g., Feb 31), try month after
    if (targetDate.getDate() !== day) {
      targetDate = new Date(currentYear, currentMonth + 2, day);
    }
  }
  
  const label = getRelativeLabel(targetDate); // Convert to relative if today/tomorrow/yesterday
  
  return {
    label: label,
    date: toISODate(targetDate),
    keywords: [normalizedQuery],
  };
}

/**
 * Parse month name (e.g., "Jan" → January 1, next occurrence)
 */
function parseMonth(query: string): DateSuggestion | null {
  const normalizedQuery = query.toLowerCase().trim();
  
  const months = [
    { full: 'january', short: 'jan', index: 0 },
    { full: 'february', short: 'feb', index: 1 },
    { full: 'march', short: 'mar', index: 2 },
    { full: 'april', short: 'apr', index: 3 },
    { full: 'may', short: 'may', index: 4 },
    { full: 'june', short: 'jun', index: 5 },
    { full: 'july', short: 'jul', index: 6 },
    { full: 'august', short: 'aug', index: 7 },
    { full: 'september', short: 'sep', index: 8 },
    { full: 'october', short: 'oct', index: 9 },
    { full: 'november', short: 'nov', index: 10 },
    { full: 'december', short: 'dec', index: 11 },
  ];
  
  const matchedMonth = months.find(
    m => m.full.startsWith(normalizedQuery) || m.short.startsWith(normalizedQuery)
  );
  
  if (!matchedMonth) return null;
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // If month is in the past or current month has passed day 1, use next year
  let targetYear = currentYear;
  if (matchedMonth.index < currentMonth || 
      (matchedMonth.index === currentMonth && today.getDate() > 1)) {
    targetYear = currentYear + 1;
  }
  
  const targetDate = new Date(targetYear, matchedMonth.index, 1);
  const label = getRelativeLabel(targetDate); // Convert to relative if today/tomorrow/yesterday
  
  return {
    label: label,
    date: toISODate(targetDate),
    keywords: [normalizedQuery],
  };
}

/**
 * Parse specific date with month and optionally year (e.g., "23 dec 2024", "dec 23")
 */
function parseSpecificDate(query: string): DateSuggestion | null {
  const normalizedQuery = query.toLowerCase().trim();
  
  const months = [
    { full: 'january', short: 'jan', index: 0 },
    { full: 'february', short: 'feb', index: 1 },
    { full: 'march', short: 'mar', index: 2 },
    { full: 'april', short: 'apr', index: 3 },
    { full: 'may', short: 'may', index: 4 },
    { full: 'june', short: 'jun', index: 5 },
    { full: 'july', short: 'jul', index: 6 },
    { full: 'august', short: 'aug', index: 7 },
    { full: 'september', short: 'sep', index: 8 },
    { full: 'october', short: 'oct', index: 9 },
    { full: 'november', short: 'nov', index: 10 },
    { full: 'december', short: 'dec', index: 11 },
  ];
  
  // Try patterns: "23 dec 2024", "dec 23 2024", "23 dec", "dec 23"
  const patterns = [
    /(\d{1,2})\s+(\w+)\s+(\d{4})/, // 23 dec 2024
    /(\w+)\s+(\d{1,2})\s+(\d{4})/, // dec 23 2024
    /(\d{1,2})\s+(\w+)$/,          // 23 dec
    /(\w+)\s+(\d{1,2})$/,          // dec 23
  ];
  
  for (const pattern of patterns) {
    const match = normalizedQuery.match(pattern);
    if (!match) continue;
    
    let day: number;
    let monthStr: string;
    let year: number | null = null;
    
    if (match.length === 4) {
      // Has year
      if (pattern.source.startsWith('(\\d')) {
        // Day first: 23 dec 2024
        day = parseInt(match[1]);
        monthStr = match[2];
        year = parseInt(match[3]);
      } else {
        // Month first: dec 23 2024
        monthStr = match[1];
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
    } else {
      // No year
      if (pattern.source.startsWith('(\\d')) {
        // Day first: 23 dec
        day = parseInt(match[1]);
        monthStr = match[2];
      } else {
        // Month first: dec 23
        monthStr = match[1];
        day = parseInt(match[2]);
      }
    }
    
    const matchedMonth = months.find(
      m => m.full.startsWith(monthStr) || m.short.startsWith(monthStr)
    );
    
    if (!matchedMonth || day < 1 || day > 31) continue;
    
    const today = new Date();
    const targetYear = year || today.getFullYear();
    const targetDate = new Date(targetYear, matchedMonth.index, day);
    
    // Validate date (e.g., Feb 31 is invalid)
    if (targetDate.getDate() !== day) continue;
    
    const label = getRelativeLabel(targetDate); // Convert to relative if today/tomorrow/yesterday
    
    return {
      label: label,
      date: toISODate(targetDate),
      keywords: [normalizedQuery],
    };
  }
  
  return null;
}

/**
 * Filter date suggestions based on query
 * Returns ONLY ONE best match
 */
export function filterDateSuggestions(query: string): DateSuggestion[] {
  if (!query || query.trim() === '') {
    // No query - show ONLY "Today"
    const today = new Date();
    return [{
      label: 'Today',
      date: toISODate(today),
      // No description - keep it clean
      keywords: ['today'],
    }];
  }
  
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
  
  // Try parsing as numeric day (e.g., "23" → next 23rd)
  const numericDate = parseNumericDay(query);
  if (numericDate) return [numericDate];
  
  // Try parsing as month (e.g., "Jan" → Jan 1, next year if needed)
  const monthDate = parseMonth(query);
  if (monthDate) return [monthDate];
  
  // Try parsing as specific date (e.g., "23 dec 2024")
  const specificDate = parseSpecificDate(query);
  if (specificDate) return [specificDate];
  
  // Try dynamic date parsing (e.g., "5days", "2weeksago")
  const dynamic = parseDynamicDate(query);
  if (dynamic) return [dynamic];
  
  // Try natural language matching
  const allSuggestions = getAllDateSuggestions();
  
  // Score each suggestion
  let bestMatch: { suggestion: DateSuggestion; score: number } | null = null;
  
  for (const suggestion of allSuggestions) {
    let score = 0;
    
    // Check each keyword
    for (const keyword of suggestion.keywords) {
      const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '');
      
      // Exact match (highest priority)
      if (normalizedKeyword === normalizedQuery) {
        score = 1000;
        break;
      }
      
      // Starts with query
      if (normalizedKeyword.startsWith(normalizedQuery)) {
        score = Math.max(score, 500);
      }
      
      // Contains query
      if (normalizedKeyword.includes(normalizedQuery)) {
        score = Math.max(score, 250);
      }
      
      // Fuzzy match - check if query chars appear in order
      if (fuzzyMatch(normalizedQuery, normalizedKeyword)) {
        score = Math.max(score, 100);
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { suggestion, score };
    }
  }
  
  // Return best match or empty array
  return bestMatch ? [bestMatch.suggestion] : [];
}

/**
 * Simple fuzzy matching - checks if all chars in query appear in order in target
 */
function fuzzyMatch(query: string, target: string): boolean {
  let queryIndex = 0;
  
  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      queryIndex++;
    }
  }
  
  return queryIndex === query.length;
}

/**
 * Parse dynamic date offsets like "3days", "2weeks", "5daysago"
 */
export function parseDynamicDate(query: string): DateSuggestion | null {
  const normalizedQuery = query.toLowerCase().replace(/\s+/g, '');
  
  // Match patterns like: 3days, 2weeks, 5daysago, 1weekago
  const forwardMatch = normalizedQuery.match(/^(\d+)(day|days|week|weeks)$/);
  const backwardMatch = normalizedQuery.match(/^(\d+)(day|days|week|weeks)ago$/);
  
  if (forwardMatch) {
    const [, num, unit] = forwardMatch;
    const days = unit.startsWith('week') ? parseInt(num) * 7 : parseInt(num);
    const targetDate = addDays(new Date(), days);
    const label = getRelativeLabel(targetDate); // Convert to relative if today/tomorrow/yesterday
    
    return {
      label: label,
      date: toISODate(targetDate),
      keywords: [normalizedQuery],
    };
  }
  
  if (backwardMatch) {
    const [, num, unit] = backwardMatch;
    const days = unit.startsWith('week') ? parseInt(num) * 7 : parseInt(num);
    const targetDate = addDays(new Date(), -days);
    const label = getRelativeLabel(targetDate); // Convert to relative if today/tomorrow/yesterday
    
    return {
      label: label,
      date: toISODate(targetDate),
      keywords: [normalizedQuery],
    };
  }
  
  return null;
}

