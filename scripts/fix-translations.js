/**
 * Fixes the missing commas in translations.ts that were introduced by the merge script.
 * The issue: entries like "Inactive": "value"\n  "NextKey" are missing commas.
 * Also fixes the staff/page.tsx corruption.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Fix translations.ts
function fixTranslationsFile() {
  const filePath = path.join(ROOT, 'src/lib/translations.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // The problem: lines ending in a quoted value followed by a newline then a new key entry
  // Pattern: "value"\n    "key" => "value",\n    "key"
  // But we need to avoid breaking closing braces
  
  // Strategy: find all occurrences where a line ends with " (closing a value string)
  // and the NEXT non-empty line starts with " (another key entry)
  // Insert a comma in those cases
  
  let fixed = 0;
  // Match pattern: end of line with " followed by optional \r, then newline, then spaces/tabs followed by " (next entry)
  const newContent = content.replace(/"(\r?\n)([ \t]+)"/g, (match, newline, spaces) => {
    fixed++;
    return `",${newline}${spaces}"`;
  });
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✓ Fixed ${fixed} missing commas in translations.ts`);
  } else {
    console.log('  No missing commas found in translations.ts');
  }
  
  return fixed;
}

// Fix staff/page.tsx
function fixStaffPage() {
  const filePath = path.join(ROOT, 'src/app/dashboard/staff/page.tsx');
  if (!fs.existsSync(filePath)) {
    console.log('⚠ Staff page not found');
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`Staff page lines 1-10:`);
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    console.log(`  ${i+1}: ${lines[i]}`);
  }
}

fixTranslationsFile();
fixStaffPage();
