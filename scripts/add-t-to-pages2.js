/**
 * Adds translation support to page.tsx files:
 * 1. Adds translateText import
 * 2. Adds t() helper inside the component (using useAuth hook pattern)
 * 3. Wraps key visible strings with t()
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const PAGES_WITH_REPLACEMENTS = [
  {
    file: 'src/app/dashboard/staff/page.tsx',
    replacements: [
      ['>Staff Management<', ">{t('Staff Management')}<"],
      ['>Add Staff Member<', ">{t('Add Staff Member')}<"],
      ['>Search staff...<', ">{t('Search staff...')}<"],
      ['>All Roles<', ">{t('All Roles')}<"],
      ['>Active<', ">{t('Active')}<"],
      ['>Inactive<', ">{t('Inactive')}<"],
      ['>Loading staff...<', ">{t('Loading staff...')}<"],
      ['>No staff members found<', ">{t('No staff members found')}<"],
      ['>Staff Directory<', ">{t('Staff Directory')}<"],
      ['>Performance<', ">{t('Performance')}<"],
      ['>Calendar<', ">{t('Calendar')}<"],
      ['>Edit Staff Member<', ">{t('Edit Staff Member')}<"],
      ['>Add Member<', ">{t('Add Member')}<"],
      ['>First Name<', ">{t('First Name')}<"],
      ['>Last Name<', ">{t('Last Name')}<"],
      ['>Email<', ">{t('Email')}<"],
      ['>Phone<', ">{t('Phone')}<"],
      ['>Role<', ">{t('Role')}<"],
      ['>Status<', ">{t('Status')}<"],
      ['>Base Salary<', ">{t('Base Salary')}<"],
      ['>per month<', ">{t('per month')}<"],
      ['>Cancel<', ">{t('Cancel')}<"],
      ['>Save Changes<', ">{t('Save Changes')}<"],
      ['>Saving...<', ">{t('Saving...')}<"],
      ['>Delete<', ">{t('Delete')}<"],
      ['>Edit<', ">{t('Edit')}<"],
      ['>View Profile<', ">{t('View Profile')}<"],
      ['>Joined<', ">{t('Joined')}<"],
      ['>Last Login<', ">{t('Last Login')}<"],
      ['>Never<', ">{t('Never')}<"],
      ['>Performance Overview<', ">{t('Performance Overview')}<"],
      ['>Total Staff<', ">{t('Total Staff')}<"],
      ['>Active Members<', ">{t('Active Members')}<"],
      ['>On Leave<', ">{t('On Leave')}<"],
      ['>Avg. Rating<', ">{t('Avg. Rating')}<"],
      ['>Tasks Completed<', ">{t('Tasks Completed')}<"],
      ['>This Month<', ">{t('This Month')}<"],
      ['>Staff Calendar<', ">{t('Staff Calendar')}<"],
      ['>Off Days<', ">{t('Off Days')}<"],
      ['>Scheduled<', ">{t('Scheduled')}<"],
      ['>Add Off Day<', ">{t('Add Off Day')}<"],
      ['>Select Staff Member<', ">{t('Select Staff Member')}<"],
      ['>All Staff<', ">{t('All Staff')}<"],
      ['>Start Date<', ">{t('Start Date')}<"],
      ['>End Date<', ">{t('End Date')}<"],
      ['>Reason<', ">{t('Reason')}<"],
      ['>Save<', ">{t('Save')}<"],
      ['>No off days scheduled<', ">{t('No off days scheduled')}<"],
      ['>Payment Management<', ">{t('Payment Management')}<"],
      ['>Record Payment<', ">{t('Record Payment')}<"],
      ['>Payment Type<', ">{t('Payment Type')}<"],
      ['>Salary<', ">{t('Salary')}<"],
      ['>Bonus<', ">{t('Bonus')}<"],
      ['>Commission<', ">{t('Commission')}<"],
      ['>Deduction<', ">{t('Deduction')}<"],
      ['>Amount<', ">{t('Amount')}<"],
      ['>Payment Date<', ">{t('Payment Date')}<"],
      ['>Notes<', ">{t('Notes')}<"],
      ['>Submit Payment<', ">{t('Submit Payment')}<"],
      ['>Payment History<', ">{t('Payment History')}<"],
      ['>No payments recorded yet<', ">{t('No payments recorded yet')}<"],
      ['>Total Paid<', ">{t('Total Paid')}<"],
      ['>Claims Management<', ">{t('Claims Management')}<"],
      ['>Submit Claim<', ">{t('Submit Claim')}<"],
      ['>Claim Type<', ">{t('Claim Type')}<"],
      ['>Expense Reimbursement<', ">{t('Expense Reimbursement')}<"],
      ['>Travel Allowance<', ">{t('Travel Allowance')}<"],
      ['>Equipment<', ">{t('Equipment')}<"],
      ['>Other<', ">{t('Other')}<"],
      ['>Description<', ">{t('Description')}<"],
      ['>Submit<', ">{t('Submit')}<"],
      ['>Pending Claims<', ">{t('Pending Claims')}<"],
      ['>No pending claims<', ">{t('No pending claims')}<"],
      ['>Approve<', ">{t('Approve')}<"],
      ['>Reject<', ">{t('Reject')}<"],
      ['>Approved<', ">{t('Approved')}<"],
      ['>Rejected<', ">{t('Rejected')}<"],
    ]
  },
  {
    file: 'src/app/dashboard/properties/page.tsx',
    replacements: [
      ['>Properties<', ">{t('Properties')}<"],
      ['>Add Property<', ">{t('Add Property')}<"],
      ['>Import Properties<', ">{t('Import Properties')}<"],
      ['>Export<', ">{t('Export')}<"],
      ['>Search properties...<', ">{t('Search properties...')}<"],
      ['>All Types<', ">{t('All Types')}<"],
      ['>Apartment<', ">{t('Apartment')}<"],
      ['>Villa<', ">{t('Villa')}<"],
      ['>Studio<', ">{t('Studio')}<"],
      ['>Penthouse<', ">{t('Penthouse')}<"],
      ['>Townhouse<', ">{t('Townhouse')}<"],
      ['>All Status<', ">{t('All Status')}<"],
      ['>Active<', ">{t('Active')}<"],
      ['>Inactive<', ">{t('Inactive')}<"],
      ['>Maintenance<', ">{t('Maintenance')}<"],
      ['>Loading properties...<', ">{t('Loading properties...')}<"],
      ['>No properties found<', ">{t('No properties found')}<"],
      ['>Add New Property<', ">{t('Add New Property')}<"],
      ['>Edit Property<', ">{t('Edit Property')}<"],
      ['>Property Details<', ">{t('Property Details')}<"],
      ['>Property Name<', ">{t('Property Name')}<"],
      ['>Property Type<', ">{t('Property Type')}<"],
      ['>Status<', ">{t('Status')}<"],
      ['>Bedrooms<', ">{t('Bedrooms')}<"],
      ['>Bathrooms<', ">{t('Bathrooms')}<"],
      ['>Max Guests<', ">{t('Max Guests')}<"],
      ['>Base Price (per night)<', ">{t('Base Price (per night)')}<"],
      ['>Address Line 1<', ">{t('Address Line 1')}<"],
      ['>Address Line 2<', ">{t('Address Line 2')}<"],
      ['>City<', ">{t('City')}<"],
      ['>Country<', ">{t('Country')}<"],
      ['>Postal Code<', ">{t('Postal Code')}<"],
      ['>Cancel<', ">{t('Cancel')}<"],
      ['>Save Property<', ">{t('Save Property')}<"],
      ['>Saving...<', ">{t('Saving...')}<"],
      ['>Import Properties<', ">{t('Import Properties')}<"],
      ['>Download Template<', ">{t('Download Template')}<"],
      ['>Previous<', ">{t('Previous')}<"],
      ['>Next<', ">{t('Next')}<"],
      ['>Import<', ">{t('Import')}<"],
      ['>Importing...<', ">{t('Importing...')}<"],
      ['>Column Visibility<', ">{t('Column Visibility')}<"],
      ['>Reset to Default<', ">{t('Reset to Default')}<"],
      ['>Select All<', ">{t('Select All')}<"],
      ['>Deselect All<', ">{t('Deselect All')}<"],
      ['>Building<', ">{t('Building')}<"],
      ['>Check-in Type<', ">{t('Check-in Type')}<"],
      ['>Self Check-in<', ">{t('Self Check-in')}<"],
      ['>Host Check-in<', ">{t('Host Check-in')}<"],
      ['>Edit<', ">{t('Edit')}<"],
      ['>Delete<', ">{t('Delete')}<"],
      ['>View on Map<', ">{t('View on Map')}<"],
    ]
  }
];

for (const { file, replacements } of PAGES_WITH_REPLACEMENTS) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Not found: ${file}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Step 1: Add import
  if (!content.includes('translateText') && !content.includes("from '@/lib/translations'")) {
    // Add after last import
    const importLines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].startsWith('import ')) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      importLines.splice(lastImportIdx + 1, 0, "import { translateText } from '@/lib/translations';");
      content = importLines.join('\n');
      console.log(`✓ Added import to ${path.basename(file)}`);
    }
  }
  
  // Step 2: Add t() helper inside the component
  // Find the pattern: export default function ... or const ... = () => {
  if (!content.includes('const t = ') && content.includes('translateText')) {
    // Find 'use client'; statement or first useAuth call
    const useAuthMatch = content.match(/const\s+\{[^}]+\}\s*=\s*useAuth\(\);?\s*\n/);
    if (useAuthMatch) {
      const insertAfter = useAuthMatch[0];
      const replacement = insertAfter + 
        `  const uiLanguage = typeof window !== 'undefined' ? localStorage.getItem('pms_ui_language') || 'en' : 'en';\n` +
        `  const t = (key: string) => translateText(key, uiLanguage);\n`;
      content = content.replace(insertAfter, replacement);
      console.log(`✓ Added t() helper to ${path.basename(file)}`);
    }
  }
  
  // Step 3: Replace strings
  let replaced = 0;
  for (const [from, to] of replacements) {
    if (content.includes(to)) continue;
    if (content.includes(from)) {
      const count = content.split(from).length - 1;
      content = content.split(from).join(to);
      replaced += count;
    }
  }
  
  if (replaced > 0) {
    console.log(`✓ ${path.basename(file)}: ${replaced} text replacements`);
  }
  
  fs.writeFileSync(fullPath, content);
}

console.log('\n✅ Done!');
