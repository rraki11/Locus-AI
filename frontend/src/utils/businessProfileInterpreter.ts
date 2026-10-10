/**
 * LOCUS AI — Business Profile Interpreter & Currency Utilities
 * 
 * Provides deterministic, rule-based interpretation of free-text business descriptions
 * without fabricating financial facts or claiming unintegrated LLM usage.
 */

export type BusinessFormat =
  | 'stall'
  | 'kiosk'
  | 'home-based'
  | 'small shop'
  | 'commercial premises';

export type BusinessPriority =
  | 'low rent'
  | 'customer demand'
  | 'manageable competition'
  | 'accessibility'
  | 'visibility';

export interface InterpretedBusinessProfile {
  businessType: string;
  categoryKey: string;
  budgetValue: number | null;
  budgetFormatted: string;
  targetCustomer: string;
  preferredSurroundings: string;
  preferredFormat?: BusinessFormat;
  priorities: BusinessPriority[];
  interpretationNotes: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'NEEDS_CLARIFICATION';
}

/**
 * Standard formats available for business configuration
 */
export const AVAILABLE_BUSINESS_FORMATS: { id: BusinessFormat; label: string; description: string }[] = [
  { id: 'stall', label: 'Stall / Cart', description: 'Low overhead, flexible sidewalk/market footprint' },
  { id: 'kiosk', label: 'Kiosk / Booth', description: 'Compact semi-permanent fixture (transit hubs, colleges)' },
  { id: 'small shop', label: 'Small Shop / Counter', description: 'Dedicated physical unit (100–400 sq ft)' },
  { id: 'home-based', label: 'Home-based / Delivery Hub', description: 'Zero high-street retail rent, delivery/pick-up focus' },
  { id: 'commercial premises', label: 'Full Commercial Premises', description: 'Dedicated high-street retail or dining space (>400 sq ft)' },
];

/**
 * Selectable primary strategic priorities
 */
export const AVAILABLE_BUSINESS_PRIORITIES: { id: BusinessPriority; label: string }[] = [
  { id: 'low rent', label: 'Low Rent / Affordability' },
  { id: 'customer demand', label: 'High Customer Demand' },
  { id: 'manageable competition', label: 'Manageable Competition' },
  { id: 'accessibility', label: 'Transit / Accessibility' },
  { id: 'visibility', label: 'Street Frontage / Visibility' },
];

/**
 * Parses numeric INR amounts from text or raw input.
 * Handles Indian numbering system abbreviations:
 * - ₹30,000 / 30000 / 30k / 30 thousand
 * - ₹15L / 15 Lakh / 15,00,000
 * - ₹1.5 Cr / 1.5 Crore
 */
export function parseInrBudget(raw: string | number | null | undefined): {
  numericValue: number | null;
  formatted: string;
  isValid: boolean;
  validationError?: string;
} {
  if (raw === null || raw === undefined) {
    return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget is required' };
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || isNaN(raw)) {
      return { numericValue: null, formatted: '', isValid: false, validationError: 'Invalid numeric value' };
    }
    if (raw <= 0) {
      return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget must be greater than zero' };
    }
    if (raw > 500000000) { // ₹50 Crore upper bound for sanity
      return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget exceeds maximum analysis limit (₹50 Cr)' };
    }
    return { numericValue: raw, formatted: formatInrCurrency(raw), isValid: true };
  }

  const str = String(raw).trim();
  if (!str) {
    return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget is required' };
  }

  // Check for negative signs
  if (str.includes('-')) {
    return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget cannot be negative' };
  }

  // Regex patterns for Indian denominations
  const croreMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:cr|crore|crores)/i);
  if (croreMatch) {
    const val = parseFloat(croreMatch[1]) * 10000000;
    return validateParsedAmount(val);
  }

  const lakhMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:l|lac|lakh|lakhs)/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]) * 100000;
    return validateParsedAmount(val);
  }

  const thousandMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:k|thousand|thousands)/i);
  if (thousandMatch) {
    const val = parseFloat(thousandMatch[1]) * 1000;
    return validateParsedAmount(val);
  }

  // Pure digits and commas (e.g. ₹30,000 or 50000)
  const cleanDigits = str.replace(/[₹,Rs.\s]/gi, '');
  const parsed = parseFloat(cleanDigits);

  if (isNaN(parsed) || !Number.isFinite(parsed)) {
    return { numericValue: null, formatted: '', isValid: false, validationError: 'Please enter a valid numeric budget in ₹' };
  }

  return validateParsedAmount(parsed);
}

function validateParsedAmount(val: number): {
  numericValue: number | null;
  formatted: string;
  isValid: boolean;
  validationError?: string;
} {
  if (val <= 0) {
    return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget must be greater than zero' };
  }
  if (val < 1000) {
    return { numericValue: val, formatted: formatInrCurrency(val), isValid: true, validationError: 'Budget is very small (< ₹1,000); verify total capital' };
  }
  if (val > 500000000) {
    return { numericValue: null, formatted: '', isValid: false, validationError: 'Budget exceeds maximum analysis limit (₹50 Cr)' };
  }
  return { numericValue: val, formatted: formatInrCurrency(val), isValid: true };
}

/**
 * Formats a number into Indian currency standard:
 * Examples:
 * - 30000 -> "₹30,000"
 * - 500000 -> "₹5L"
 * - 1500000 -> "₹15L"
 * - 12000000 -> "₹1.2 Cr"
 */
export function formatInrCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';

  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2).replace(/\.?0+$/, '')} Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹${lakh % 1 === 0 ? lakh : lakh.toFixed(2).replace(/\.?0+$/, '')}L`;
  }

  // Under 1 Lakh: use Indian thousand separators (e.g. 30,000)
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Interprets a natural language business description using explicit deterministic rules.
 * Clearly surfaces inferences vs ambiguities without fabricating facts.
 */
export function interpretBusinessDescription(text: string): InterpretedBusinessProfile {
  const norm = text.toLowerCase().trim();
  const notes: string[] = [];

  // 1. Budget extraction
  const budgetResult = parseInrBudget(text);
  if (budgetResult.isValid && budgetResult.numericValue !== null) {
    notes.push(`Extracted budget: ${budgetResult.formatted}`);
  } else {
    notes.push('Budget not clearly detected in description; manual budget entry required.');
  }

  // 2. Business Category & Type Inference
  let businessType = 'Tea & Snacks Stall';
  let categoryKey = 'tea_stall';

  if (norm.includes('stationery') || norm.includes('xerox') || norm.includes('book') || norm.includes('print')) {
    businessType = 'Stationery & Print Shop';
    categoryKey = 'stationery';
    notes.push('Inferred category: Stationery & Print Shop from keywords (stationery/books/print).');
  } else if (norm.includes('tea') || norm.includes('chai') || norm.includes('snack') || norm.includes('stall') || norm.includes('tapri') || norm.includes('kiosk')) {
    businessType = 'Tea & Snacks Stall';
    categoryKey = 'tea_stall';
    notes.push('Inferred category: Tea & Snacks Stall from keywords (tea/chai/snacks/stall).');
  } else if (norm.includes('cafe') || norm.includes('coffee') || norm.includes('espresso') || norm.includes('roastery')) {
    businessType = 'Café';
    categoryKey = 'cafe';
    notes.push('Inferred category: Café from coffee/café keywords.');
  } else if (norm.includes('burger') || norm.includes('pizza') || norm.includes('fast food') || norm.includes('qsr') || norm.includes('restaurant')) {
    businessType = 'Quick Service Restaurant';
    categoryKey = 'qsr';
    notes.push('Inferred category: Quick Service Restaurant from dining keywords.');
  } else if (norm.includes('retail') || norm.includes('clothing') || norm.includes('apparel') || norm.includes('store') || norm.includes('boutique')) {
    businessType = 'Specialty Retail Store';
    categoryKey = 'retail';
    notes.push('Inferred category: Specialty Retail Store from retail keywords.');
  } else if (norm.includes('bakery') || norm.includes('cake') || norm.includes('pastry') || norm.includes('dessert')) {
    businessType = 'Bakery & Dessert Bar';
    categoryKey = 'bakery';
    notes.push('Inferred category: Bakery & Dessert Bar from bakery/dessert keywords.');
  } else if (norm.includes('gym') || norm.includes('fitness') || norm.includes('yoga') || norm.includes('workout')) {
    businessType = 'Fitness & Wellness Studio';
    categoryKey = 'fitness';
    notes.push('Inferred category: Fitness & Wellness Studio from fitness keywords.');
  } else if (norm.includes('salon') || norm.includes('parlour') || norm.includes('beauty') || norm.includes('hair')) {
    businessType = 'Salon & Grooming Lounge';
    categoryKey = 'salon';
    notes.push('Inferred category: Salon & Grooming Lounge from beauty keywords.');
  } else if (norm.includes('pharmacy') || norm.includes('chemist') || norm.includes('medical') || norm.includes('medicine')) {
    businessType = 'Pharmacy & Diagnostics';
    categoryKey = 'pharmacy';
    notes.push('Inferred category: Pharmacy & Diagnostics from health/medical keywords.');
  } else {
    businessType = 'Local Commercial Outlet';
    categoryKey = 'retail';
    notes.push('Category general: please review and customize the inferred business type.');
  }

  // 3. Target Customer Inference
  let targetCustomer = 'General neighborhood shoppers';
  if (norm.includes('student') || norm.includes('college') || norm.includes('school') || norm.includes('campus') || norm.includes('hostel')) {
    targetCustomer = 'College & university students';
    notes.push('Target audience inferred: College & university students.');
  } else if (norm.includes('office') || norm.includes('tech') || norm.includes('corporate') || norm.includes('employee') || norm.includes('commuter') || norm.includes('worker')) {
    targetCustomer = 'Office commuters & corporate professionals';
    notes.push('Target audience inferred: Office commuters & corporate professionals.');
  } else if (norm.includes('family') || norm.includes('residential') || norm.includes('neighborhood') || norm.includes('neighbourhood')) {
    targetCustomer = 'Neighborhood families & local residents';
    notes.push('Target audience inferred: Neighborhood families & local residents.');
  } else if (norm.includes('youth') || norm.includes('teen') || norm.includes('young')) {
    targetCustomer = 'Youth & young adults';
    notes.push('Target audience inferred: Youth & young adults.');
  }

  // 4. Preferred Surroundings
  let preferredSurroundings = 'Commercial street corridor';
  if (norm.includes('college') || norm.includes('campus') || norm.includes('university') || norm.includes('school')) {
    preferredSurroundings = 'Near college / educational institutions';
  } else if (norm.includes('metro') || norm.includes('bus') || norm.includes('station') || norm.includes('transit')) {
    preferredSurroundings = 'Near metro station or transit stop';
  } else if (norm.includes('tech park') || norm.includes('office') || norm.includes('it corridor')) {
    preferredSurroundings = 'Commercial office / IT corridor';
  } else if (norm.includes('market') || norm.includes('bazaar') || norm.includes('chowk')) {
    preferredSurroundings = 'High-density street market / bazaar';
  } else if (norm.includes('residential') || norm.includes('colony')) {
    preferredSurroundings = 'Residential neighborhood node';
  }

  // 5. Preferred Format
  let preferredFormat: BusinessFormat | undefined;
  if (norm.includes('stall') || norm.includes('cart') || norm.includes('tapri') || norm.includes('thela')) {
    preferredFormat = 'stall';
  } else if (norm.includes('kiosk') || norm.includes('booth') || norm.includes('counter')) {
    preferredFormat = 'kiosk';
  } else if (norm.includes('home') || norm.includes('cloud') || norm.includes('kitchen') || norm.includes('delivery')) {
    preferredFormat = 'home-based';
  } else if (norm.includes('shop') || norm.includes('dukaan') || norm.includes('store')) {
    preferredFormat = 'small shop';
  } else if (norm.includes('showroom') || norm.includes('premises') || norm.includes('restaurant') || norm.includes('hall')) {
    preferredFormat = 'commercial premises';
  }

  // 6. Priorities
  const priorities: BusinessPriority[] = [];
  if (norm.includes('cheap') || norm.includes('low rent') || norm.includes('affordable') || norm.includes('low cost') || (budgetResult.numericValue !== null && budgetResult.numericValue <= 50000)) {
    priorities.push('low rent');
  }
  if (norm.includes('crowd') || norm.includes('demand') || norm.includes('busy') || norm.includes('footfall') || norm.includes('hungry') || norm.includes('students')) {
    priorities.push('customer demand');
  }
  if (norm.includes('competition') || norm.includes('rival') || norm.includes('unique') || norm.includes('manageable')) {
    priorities.push('manageable competition');
  }
  if (norm.includes('accessible') || norm.includes('near') || norm.includes('metro') || norm.includes('transit') || norm.includes('walk')) {
    priorities.push('accessibility');
  }
  if (norm.includes('visible') || norm.includes('main road') || norm.includes('corner') || norm.includes('frontage')) {
    priorities.push('visibility');
  }

  // Default priority if none triggered
  if (priorities.length === 0) {
    priorities.push('customer demand', 'low rent');
  }

  const confidence = (budgetResult.isValid && text.length > 25) ? 'HIGH' : text.length > 15 ? 'MEDIUM' : 'NEEDS_CLARIFICATION';

  return {
    businessType,
    categoryKey,
    budgetValue: budgetResult.numericValue,
    budgetFormatted: budgetResult.formatted,
    targetCustomer,
    preferredSurroundings,
    preferredFormat,
    priorities,
    interpretationNotes: notes,
    confidence,
  };
}

/**
 * Demo preset examples for rapid evaluation
 */
export const SAMPLE_BUSINESS_PROFILES = [
  {
    id: 'sample-tea-stall',
    title: 'Tea & Snacks Stall (₹30,000)',
    description: 'I want to open a small tea and snacks stall near a college with ₹30,000, mainly serving students.',
    badge: 'Micro-Budget',
    expectedBudget: '₹30,000',
    expectedType: 'Tea & Snacks Stall',
    expectedCustomer: 'College & university students',
  },
  {
    id: 'sample-stationery',
    title: 'Stationery & Xerox Shop (₹50,000)',
    description: 'Looking to start a small stationery and xerox print counter with ₹50,000 budget targeting school and college students.',
    badge: 'Student Services',
    expectedBudget: '₹50,000',
    expectedType: 'Stationery & Print Shop',
    expectedCustomer: 'College & university students',
  },
  {
    id: 'sample-cafe',
    title: 'Specialty Café (₹15L)',
    description: 'Setting up a specialty espresso café with ₹15L capital targeting office commuters and daytime remote workers.',
    badge: 'Commercial F&B',
    expectedBudget: '₹15L',
    expectedType: 'Café',
    expectedCustomer: 'Office commuters & corporate professionals',
  },
  {
    id: 'sample-qsr',
    title: 'Quick Service Restaurant (₹25L)',
    description: 'Opening a quick service momo & wrap outlet with ₹25L budget for evening foodies and office workers.',
    badge: 'Quick Casual',
    expectedBudget: '₹25L',
    expectedType: 'Quick Service Restaurant',
    expectedCustomer: 'Office commuters & corporate professionals',
  },
];
