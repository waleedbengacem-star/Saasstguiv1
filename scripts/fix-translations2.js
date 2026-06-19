/**
 * Fixes the translations.ts file where merge-translations.js appended new entries
 * after the last existing entry without commas.
 * 
 * The pattern is:
 * Line N:     "SomeKey": "SomeValue"   (no trailing comma - was last entry)
 * Line N+1:   (blank/spaces - the removed closing brace)
 * Line N+2:   "NewKey": "NewValue",    (new entry from merge)
 * 
 * We need to add a comma to line N and remove the blank line N+1.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src/lib/translations.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Strategy: We have 14 languages. The merge script replaced 
// the closing `}` of each language object with the new entries.
// What resulted is:
//   "LastOldKey": "lastOldValue"    <- no comma (was last)
//   (empty line - was the `}`)
//   "FirstNewKey": "firstNewValue",  <- new entry
//   ...more new entries...
//   "LastNewKey": "lastNewValue",
//   },                               <- closing brace from merge with comma
// 
// Fix: We need a comma after the "lastOldValue" that has no comma
// The pattern is: line ends with " followed by line of only whitespace

// More precisely: `"[^"]+"\s*\n\s*\n\s*"` pattern where the value has no comma

let fixed = 0;

// Find the pattern: a line with just spaces/tabs but no comma at end, followed by blank line, followed by a new key
// In the actual file: these appear as CRLF lines merged to LF
// Pattern: ends with quote + \r\n (or \n), then line that's just \r\n or \n, then content

// Split and process line by line
const lines = content.split(/\r?\n/);
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
  const nextNonEmpty = (() => {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) return lines[j];
    }
    return null;
  })();
  
  // Detect: current line ends with a string value (no comma), next meaningful line is also a string key
  // Current line pattern: `    "key": "value"` (no trailing comma)
  // Next non-empty line starts with: `    "key": "value",`
  if (
    /^\s+"[^"]+"\s*:\s*"[^"]*"\s*$/.test(line) && // current is key-value pair without comma
    nextLine !== null && 
    nextLine.trim() === '' && // next line is empty
    nextNonEmpty !== null && 
    /^\s+"[^"]+"\s*:/.test(nextNonEmpty) // next non-empty is also a key
  ) {
    // Add comma to current line
    newLines.push(line.trimEnd() + ',');
    fixed++;
  } else {
    newLines.push(line);
  }
}

if (fixed > 0) {
  const newContent = newLines.join('\n');
  fs.writeFileSync(filePath, newContent);
  console.log(`✓ Fixed ${fixed} missing commas in translations.ts`);
} else {
  console.log('  No missing commas found');
}

// Verify the file by checking for TypeScript syntax issues
const testContent = fs.readFileSync(filePath, 'utf8');
const problemLines = [];
const testLines = testContent.split('\n');
for (let i = 0; i < testLines.length; i++) {
  const line = testLines[i];
  const nextLine = i + 1 < testLines.length ? testLines[i + 1] : null;
  if (
    /^\s+"[^"]+"\s*:\s*"[^"]*"\s*$/.test(line) &&
    nextLine !== null && nextLine.trim() === ''
  ) {
    problemLines.push(i + 1);
  }
}

if (problemLines.length > 0) {
  console.log(`⚠ Still ${problemLines.length} potential issues at lines: ${problemLines.slice(0, 10).join(', ')}`);
} else {
  console.log('✓ No more comma issues detected');
}
