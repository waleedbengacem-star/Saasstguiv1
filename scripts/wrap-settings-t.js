/**
 * Wraps all hardcoded English text strings in JSX with t() in specified files.
 * Uses a safe approach: only targets JSX text content (>TEXT<) and specific attribute patterns.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// [file, [[oldText, newText], ...]]
const TARGETED_REPLACEMENTS = [
  [
    'src/app/dashboard/settings/page.tsx',
    [
      // Profile Tab - Profile Card
      ['>Personal Profile<', ">{t('Personal Profile')}<"],
      ['>Your account details<', ">{t('Your account details')}<"],
      ['>Full Name<', ">{t('Full Name')}<"],
      ['>Email Address<', ">{t('Email Address')}<"],
      // Profile Tab - Organization Card
      ['>Organization Parameters<', ">{t('Organization Parameters')}<"],
      ["'Manage company branding, title and logo settings'", "t('Manage company branding, title and logo settings')"],
      ["'Configured workspace settings'", "t('Configured workspace settings')"],
      ['>Company Name (Title)<', ">{t('Company Name (Title)')}<"],
      ['>Subheading<', ">{t('Subheading')}<"],
      ['>Company Logo<', ">{t('Company Logo')}<"],
      ['>Option A: Text, Emoji or Initials<', ">{t('Option A: Text, Emoji or Initials')}<"],
      ['>Option B: Upload Brand Photo<', ">{t('Option B: Upload Brand Photo')}<"],
      ['>Brand Logo Photo Active<', ">{t('Brand Logo Photo Active')}<"],
      ['>Remove Photo<', ">{t('Remove Photo')}<"],
      ['>Drag & drop photo here or browse files<', ">{t('Drag & drop photo here or browse files')}<"],
      ['>PNG, JPG, SVG up to 500KB (square ratio recommended)<', ">{t('PNG, JPG, SVG up to 500KB (square ratio recommended)')}<"],
      ['>Base Currency<', ">{t('Base Currency')}<"],
      ['>Saving Settings...<', ">{t('Saving Settings...')}<"],
      ['>Save Workspace Branding<', ">{t('Save Workspace Branding')}<"],
      // MFA Section
      ['>Multi-Factor Authentication (MFA)<', ">{t('Multi-Factor Authentication (MFA)')}<"],
      ['>Secure login using an authenticator app<', ">{t('Secure login using an authenticator app')}<"],
      ['>MFA is currently Disabled<', ">{t('MFA is currently Disabled')}<"],
      ['>Configure MFA<', ">{t('Configure MFA')}<"],
      ['>MFA Configuration Steps:<', ">{t('MFA Configuration Steps:')}<"],
      ['>Scan the QR code with your Authenticator App.<', ">{t('Scan the QR code with your Authenticator App.')}<"],
      ['>If you cannot scan, enter this key manually:<', ">{t('If you cannot scan, enter this key manually:')}<"],
      ['>Enter the 6-digit verification code below.<', ">{t('Enter the 6-digit verification code below.')}<"],
      ['>Verification Code<', ">{t('Verification Code')}<"],
      ['>Verify & Activate<', ">{t('Verify & Activate')}<"],
      ['>MFA is Active & Enforced<', ">{t('MFA is Active & Enforced')}<"],
      ['>Your account is secure.<', ">{t('Your account is secure.')}<"],
      ['>Disable MFA<', ">{t('Disable MFA')}<"],
      ['>Enter 6-Digit Code to Confirm<', ">{t('Enter 6-Digit Code to Confirm')}<"],
      ['>Confirm Disable<', ">{t('Confirm Disable')}<"],
      ['>MFA Recovery Backup Codes<', ">{t('MFA Recovery Backup Codes')}<"],
      ['>Save these codes immediately. They can only be shown once.<', ">{t('Save these codes immediately. They can only be shown once.')}<"],
      // Appearance Tab
      ['>Appearance Theme<', ">{t('Appearance Theme')}<"],
      ['>Select your preferred workspace visual theme.<', ">{t('Select your preferred workspace visual theme.')}<"],
      ['>Warm Dark Mode<', ">{t('Warm Dark Mode')}<"],
      ['>Elegant Light Mode<', ">{t('Elegant Light Mode')}<"],
      ['>Dynamic Appearance<', ">{t('Dynamic Appearance')}<"],
      ['>Workspace Background Theme<', ">{t('Workspace Background Theme')}<"],
      ['>Dark Mode Background<', ">{t('Dark Mode Background')}<"],
      ['>Light Mode Background<', ">{t('Light Mode Background')}<"],
      ['>Obsidian Black<', ">{t('Obsidian Black')}<"],
      ['>Coal Charcoal<', ">{t('Coal Charcoal')}<"],
      ['>Midnight Navy<', ">{t('Midnight Navy')}<"],
      ['>Amethyst Night<', ">{t('Amethyst Night')}<"],
      ['>Slate Gray<', ">{t('Slate Gray')}<"],
      ['>Silver Mist<', ">{t('Silver Mist')}<"],
      ['>Desert Sand Cream<', ">{t('Desert Sand Cream')}<"],
      ['>Classic Gray<', ">{t('Classic Gray')}<"],
      ['>Workspace Color Accent<', ">{t('Workspace Color Accent')}<"],
      ['>Luxury Gold<', ">{t('Luxury Gold')}<"],
      ['>Emerald Green<', ">{t('Emerald Green')}<"],
      ['>Royal Blue<', ">{t('Royal Blue')}<"],
      ['>Rose Pink<', ">{t('Rose Pink')}<"],
      ['>Amethyst Purple<', ">{t('Amethyst Purple')}<"],
      ['>Custom Tuned<', ">{t('Custom Tuned')}<"],
      ['>Primary Accent Color<', ">{t('Primary Accent Color')}<"],
      ['>Hover/Glow Accent Color<', ">{t('Hover/Glow Accent Color')}<"],
      ['>Dark/Shadow Accent Color<', ">{t('Dark/Shadow Accent Color')}<"],
      ['>Typography Style<', ">{t('Typography Style')}<"],
      ['>Modern Executive<', ">{t('Modern Executive')}<"],
      ['>Sleek, minimalist and highly readable<', ">{t('Sleek, minimalist and highly readable')}<"],
      ['>Classic Luxury<', ">{t('Classic Luxury')}<"],
      ['>Sophisticated Roman luxury aesthetic<', ">{t('Sophisticated Roman luxury aesthetic')}<"],
      ['>Minimal Clean<', ">{t('Minimal Clean')}<"],
      ['>Soft geometry and lightweight feel<', ">{t('Soft geometry and lightweight feel')}<"],
      ['>Neo-Heritage<', ">{t('Neo-Heritage')}<"],
      ['>High-contrast elegant editorial serif<', ">{t('High-contrast elegant editorial serif')}<"],
      ['>Futuristic Syne<', ">{t('Futuristic Syne')}<"],
      ['>Bold, avant-garde design language<', ">{t('Bold, avant-garde design language')}<"],
      ['>Platform Custom Order<', ">{t('Platform Custom Order')}<"],
      ['>Move Up<', ">{t('Move Up')}<"],
      ['>Move Down<', ">{t('Move Down')}<"],
      ['>Reset Order to Default<', ">{t('Reset Order to Default')}<"],
      // Roles Tab
      ['>Team Members<', ">{t('Team Members')}<"],
      ['>Invite Teammate<', ">{t('Invite Teammate')}<"],
      ['>Loading team...<', ">{t('Loading team...')}<"],
      ['>Pending Invitation<', ">{t('Pending Invitation')}<"],
      ['>No pending invitations found<', ">{t('No pending invitations found')}<"],
      ['>Roles & Permissions<', ">{t('Roles & Permissions')}<"],
      ['>Create Role<', ">{t('Create Role')}<"],
      ['>Loading roles...<', ">{t('Loading roles...')}<"],
      ['>No permissions assigned<', ">{t('No permissions assigned')}<"],
      ['>Full Access — All Permissions<', ">{t('Full Access — All Permissions')}<"],
      ['>Edit Role<', ">{t('Edit Role')}<"],
      ['>Create Custom Role<', ">{t('Create Custom Role')}<"],
      ['>Send Invitation<', ">{t('Send Invitation')}<"],
      // Integrations Tab
      ['>Uplisting API Key<', ">{t('Uplisting API Key')}<"],
      ['>Unlock to Edit<', ">{t('Unlock to Edit')}<"],
      ['>Verify & Save<', ">{t('Verify & Save')}<"],
      ['>Property Link Mappings<', ">{t('Property Link Mappings')}<"],
      ['>Sync Bookings<', ">{t('Sync Bookings')}<"],
      ['>Auto-Map Properties<', ">{t('Auto-Map Properties')}<"],
      ['>Bulk Unlink<', ">{t('Bulk Unlink')}<"],
      ['>Local Property<', ">{t('Local Property')}<"],
      ['>Uplisting Listing<', ">{t('Uplisting Listing')}<"],
      ['>Webhook Security Token<', ">{t('Webhook Security Token')}<"],
      ['>Generate<', ">{t('Generate')}<"],
      ['>WhatsApp Business API<', ">{t('WhatsApp Business API')}<"],
      ['>Platform-Level Integrations<', ">{t('Platform-Level Integrations')}<"],
      ['>AI Assistant (Claude)<', ">{t('AI Assistant (Claude)')}<"],
      ['>DocuSign Integration<', ">{t('DocuSign Integration')}<"],
      ['>Confirm Your Password<', ">{t('Confirm Your Password')}<"],
      ['>Unlock<', ">{t('Unlock')}<"],
      // Danger Zone Tab
      ['>Danger Zone — Irreversible Actions<', ">{t('Danger Zone — Irreversible Actions')}<"],
      ['>Delete All Properties<', ">{t('Delete All Properties')}<"],
      ['>Delete All Bookings<', ">{t('Delete All Bookings')}<"],
      ['>Delete All Team Members<', ">{t('Delete All Team Members')}<"],
      ['>Delete All Tasks & Schedules<', ">{t('Delete All Tasks & Schedules')}<"],
      ['>Delete All Accounting Data<', ">{t('Delete All Accounting Data')}<"],
      ['>Delete Everything — Full Reset<', ">{t('Delete Everything — Full Reset')}<"],
      ['>Permanently Delete<', ">{t('Permanently Delete')}<"],
    ]
  ]
];

let totalReplaced = 0;

for (const [filePath, replacements] of TARGETED_REPLACEMENTS) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let fileReplaced = 0;
  
  for (const [from, to] of replacements) {
    // Skip if already wrapped with t()
    if (content.includes(to)) continue;
    
    if (content.includes(from)) {
      // Replace all occurrences
      const count = (content.split(from).length - 1);
      content = content.split(from).join(to);
      fileReplaced += count;
    }
  }
  
  if (fileReplaced > 0) {
    fs.writeFileSync(fullPath, content);
    console.log(`✓ ${path.basename(filePath)}: ${fileReplaced} replacements`);
    totalReplaced += fileReplaced;
  } else {
    console.log(`  ${path.basename(filePath)}: nothing to replace (all already wrapped or not found)`);
  }
}

console.log(`\n✅ Done! ${totalReplaced} total replacements`);
