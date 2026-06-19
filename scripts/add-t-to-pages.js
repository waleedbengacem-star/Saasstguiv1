/**
 * Adds translateText import and t() helper to page files that don't already have it,
 * and wraps common literal strings with t() across all page files.
 * 
 * This does targeted replacements - not every string, but the highest-frequency visible ones.
 */

const fs = require('fs');
const path = require('path');

const PAGES = [
  'src/app/dashboard/staff/page.tsx',
  'src/app/dashboard/properties/page.tsx',
  'src/app/dashboard/bookings/page.tsx',
  'src/app/dashboard/accounting/page.tsx',
  'src/app/dashboard/reservations/page.tsx',
  'src/app/dashboard/channels/page.tsx',
  'src/app/dashboard/host-management/page.tsx',
  'src/app/dashboard/revenue-management/page.tsx',
  'src/app/dashboard/chat/page.tsx',
];

const ROOT = path.join(__dirname, '..');

// Strings to wrap with t() in all pages - these are the most common button/label texts
// We do safe replacements only for JSX text content (between > and <)
const REPLACEMENTS = [
  // Buttons
  { from: '>Save Changes<', to: ">{t('Save Changes')}<" },
  { from: '>Cancel<', to: ">{t('Cancel')}<" },
  { from: '>Delete<', to: ">{t('Delete')}<" },
  { from: '>Edit<', to: ">{t('Edit')}<" },
  { from: '>Add<', to: ">{t('Add')}<" },
  { from: '>Submit<', to: ">{t('Submit')}<" },
  { from: '>Search<', to: ">{t('Search')}<" },
  { from: '>Filter<', to: ">{t('Filter')}<" },
  { from: '>Export<', to: ">{t('Export')}<" },
  { from: '>Import<', to: ">{t('Import')}<" },
  { from: '>Close<', to: ">{t('Close')}<" },
  { from: '>Back<', to: ">{t('Back')}<" },
  { from: '>Next<', to: ">{t('Next')}<" },
  { from: '>Approve<', to: ">{t('Approve')}<" },
  { from: '>Reject<', to: ">{t('Reject')}<" },
  { from: '>Refresh<', to: ">{t('Refresh')}<" },
  { from: '>Loading...<', to: ">{t('Loading...')}<" },
  { from: '>No data found<', to: ">{t('No data found')}<" },
  { from: '>No results<', to: ">{t('No results')}<" },
];

let totalChanged = 0;

for (const pagePath of PAGES) {
  const fullPath = path.join(ROOT, pagePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ File not found: ${pagePath}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = 0;
  
  // Check if translateText is already imported
  const hasImport = content.includes("from '@/lib/translations'") || content.includes('from "@/lib/translations"');
  
  if (!hasImport) {
    // Add import after the last import line
    const lastImportMatch = content.match(/(import[^;]+;)\s*\n(?!import)/s);
    if (lastImportMatch) {
      const insertAfter = lastImportMatch[0].trimEnd();
      content = content.replace(insertAfter, `${insertAfter}\nimport { translateText } from '@/lib/translations';`);
      changed++;
      console.log(`  Added translateText import to ${path.basename(pagePath)}`);
    }
  }
  
  // Check if t() helper exists
  const hasHelper = content.includes('const t = ') || content.includes('const t=');
  
  if (!hasHelper && (content.includes('uiLanguage') || content.includes('useAuth'))) {
    // Find a good place to add t() - after useState declarations, before return
    // Look for a line with useAuth or first const statement in the component
    const addAfter = content.match(/(const \{ [^}]+ \} = useAuth\(\);?\s*\n)/);
    if (addAfter) {
      content = content.replace(addAfter[0], `${addAfter[0]}  const uiLang = typeof window !== 'undefined' ? localStorage.getItem('pms_ui_language') || 'en' : 'en';\n  const t = (key: string) => translateText(key, uiLang);\n`);
      changed++;
    }
  }
  
  if (changed > 0) {
    fs.writeFileSync(fullPath, content);
    console.log(`✓ Updated ${path.basename(pagePath)}: ${changed} additions`);
    totalChanged += changed;
  } else {
    console.log(`  ${path.basename(pagePath)}: no changes needed`);
  }
}

console.log(`\nDone: ${totalChanged} total changes`);
