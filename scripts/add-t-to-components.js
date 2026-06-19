/**
 * Adds translation support to component files by:
 * 1. Adding the translateText import
 * 2. Adding the t() helper after the component function declaration
 * 3. Wrapping visible JSX string literals with t()
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Component files to add translation to
const COMPONENTS = [
  'src/components/bookings/BookingsList.tsx',
  'src/components/bookings/MasterCalendar.tsx',
];

for (const filePath of COMPONENTS) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add translateText import if not present
  if (!content.includes('translateText') && !content.includes("from '@/lib/translations'")) {
    content = content.replace(
      `import { useAuth } from '@/hooks/useAuth';`,
      `import { useAuth } from '@/hooks/useAuth';\nimport { translateText } from '@/lib/translations';`
    );
    console.log(`✓ Added translateText import to ${path.basename(filePath)}`);
  }
  
  fs.writeFileSync(fullPath, content);
}

// Now do targeted text replacements for the most visible strings
const REPLACEMENTS = {
  'src/components/bookings/BookingsList.tsx': [
    ['>Reservations Control<', ">{t('Reservations Control')}<"],
    ['>Bookings List<', ">{t('Bookings List')}<"],
    ['>Search bookings...<', ">{t('Search bookings...')}<"],
    ['>No bookings found<', ">{t('No bookings found')}<"],
    ['>Loading Reservations Ledger...<', ">{t('Loading Reservations Ledger...')}<"],
    ['>Check-in<', ">{t('Check-in')}<"],
    ['>Check-out<', ">{t('Check-out')}<"],
    ['>Nights<', ">{t('Nights')}<"],
    ['>Guests<', ">{t('Guests')}<"],
    ['>Total Amount<', ">{t('Total Amount')}<"],
    ['>Confirmed<', ">{t('Confirmed')}<"],
    ['>Cancelled<', ">{t('Cancelled')}<"],
    ['>Platform<', ">{t('Platform')}<"],
    ['>Property<', ">{t('Property')}<"],
    ['>Total<', ">{t('Total')}<"],
    ['>Guest Name<', ">{t('Guest Name')}<"],
    ['>Status<', ">{t('Status')}<"],
    ['>Actions<', ">{t('Actions')}<"],
    ['>Notes<', ">{t('Notes')}<"],
    ['>Revenue<', ">{t('Revenue')}<"],
    ['>Special Requests<', ">{t('Special Requests')}<"],
    ['>Payment Status<', ">{t('Payment Status')}<"],
    ['>Payment Method<', ">{t('Payment Method')}<"],
    ['>Balance Due<', ">{t('Balance Due')}<"],
  ],
  'src/components/bookings/MasterCalendar.tsx': [
    ['>Master Grid Calendar<', ">{t('Master Grid Calendar')}<"],
    ['>Check-in<', ">{t('Check-in')}<"],
    ['>Check-out<', ">{t('Check-out')}<"],
    ['>Confirmed<', ">{t('Confirmed')}<"],
    ['>Cancelled<', ">{t('Cancelled')}<"],
    ['>Platform<', ">{t('Platform')}<"],
    ['>Property<', ">{t('Property')}<"],
    ['>Nights<', ">{t('Nights')}<"],
  ],
};

// For component files we need to ensure there's a t() function accessible
// The simplest way: add a module-level helper that reads from localStorage
// We insert this before the main exported function

let totalReplaced = 0;

for (const [filePath, replacements] of Object.entries(REPLACEMENTS)) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add a top-level t() helper function after the imports but before the first function
  // Only if translateText is imported and there's no t() function yet
  if (content.includes('translateText') && !content.includes('const t = (')) {
    // Insert a helper before the first exported function or class
    const insertBefore = content.match(/^(export (default )?function|export const [A-Z]|function [A-Z])/m);
    if (insertBefore) {
      const idx = content.indexOf(insertBefore[0]);
      const helper = `// Translation helper - reads language from localStorage\nfunction t(key: string): string {\n  const lang = typeof window !== 'undefined' ? localStorage.getItem('pms_ui_language') || 'en' : 'en';\n  return translateText(key, lang);\n}\n\n`;
      content = content.slice(0, idx) + helper + content.slice(idx);
      console.log(`✓ Added t() helper to ${path.basename(filePath)}`);
    }
  }
  
  let fileReplaced = 0;
  for (const [from, to] of replacements) {
    if (content.includes(to)) continue; // Already done
    if (content.includes(from)) {
      const count = content.split(from).length - 1;
      content = content.split(from).join(to);
      fileReplaced += count;
    }
  }
  
  if (fileReplaced > 0) {
    console.log(`✓ ${path.basename(filePath)}: ${fileReplaced} text replacements`);
    totalReplaced += fileReplaced;
  }
  
  fs.writeFileSync(fullPath, content);
}

console.log(`\n✅ Done! ${totalReplaced} replacements across component files`);
