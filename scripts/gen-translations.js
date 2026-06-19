require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Client } = require('pg');
const https = require('https');
const fs = require('fs');
const path = require('path');

const LANGUAGES = {
  ar: 'Arabic',
  ru: 'Russian',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
  nl: 'Dutch',
  pl: 'Polish',
  hi: 'Hindi',
};

// ALL strings to translate - collected from all pages
const ALL_STRINGS = [
  // ─── Settings: Profile Tab ───
  "Workspace Settings","Manage your profile, security, roles, and team access controls.",
  "Profile & Security","Personalisation","Roles & Team","Integrations & APIs","Danger Zone",
  "Personal Profile","Your account details","Full Name","Email Address",
  "Organization Parameters","Manage company branding, title and logo settings",
  "Configured workspace settings","Company Name (Title)","Subheading",
  "Company Logo","Option A: Text, Emoji or Initials","Option B: Upload Brand Photo",
  "Brand Logo Photo Active","Remove Photo","Drag & drop photo here or browse files",
  "PNG, JPG, SVG up to 500KB (square ratio recommended)","Base Currency","Company Name",
  "Saving Settings...","Save Workspace Branding","Multi-Factor Authentication (MFA)",
  "Secure login using an authenticator app","MFA is currently Disabled",
  "Protect your workspace from unauthorized entry by enforcing a secondary login code.",
  "Configure MFA","MFA Configuration Steps:","Scan the QR code with your Authenticator App.",
  "If you cannot scan, enter this key manually:","Enter the 6-digit verification code below.",
  "Verification Code","Verify & Activate","MFA is Active & Enforced","Your account is secure.",
  "Disable MFA","Enter 6-Digit Code to Confirm","Confirm Disable",
  "MFA Recovery Backup Codes","Save these codes immediately. They can only be shown once.",
  // ─── Settings: Appearance Tab ───
  "Appearance Theme","Select your preferred workspace visual theme.",
  "Warm Dark Mode","Active","Elegant Light Mode","Dynamic Appearance",
  "Workspace Background Theme","Select your preferred base background styling presets for light and dark modes.",
  "Dark Mode Background","Light Mode Background",
  "Obsidian Black","Coal Charcoal","Midnight Navy","Amethyst Night",
  "Slate Gray","Silver Mist","Desert Sand Cream","Classic Gray",
  "Workspace Color Accent","Choose the primary branding accent color or fine-tune all three accent color tones below.",
  "Luxury Gold","Emerald Green","Royal Blue","Rose Pink","Amethyst Purple","Custom Tuned",
  "Custom Fine-Tuning (All 3 Accent Colors)",
  "Individually customize each of the three accent colors.",
  "Primary Accent Color","Hover/Glow Accent Color","Dark/Shadow Accent Color",
  "Typography Style","Select the primary visual identity and typography set for the workspace.",
  "Modern Executive","Sleek, minimalist and highly readable",
  "Classic Luxury","Sophisticated Roman luxury aesthetic",
  "Minimal Clean","Soft geometry and lightweight feel",
  "Neo-Heritage","High-contrast elegant editorial serif",
  "Futuristic Syne","Bold, avant-garde design language",
  "Platform Custom Order","Arrange the platforms in the sidebar to match your preferred navigation sequence.",
  "Move Up","Move Down","Reset Order to Default",
  // ─── Settings: Roles & Team Tab ───
  "Team Members","Invite Teammate","Loading team...","User","Role","Last Login","Status",
  "Pending Invitation","Pending","Resend","No pending invitations found",
  "Roles & Permissions","Create Role","Loading roles...","System",
  "No permissions assigned","Full Access — All Permissions",
  "Member","Members","Edit","Delete","Edit Role","Create Custom Role",
  "Edit name, description or permissions","Define a new role with custom permissions",
  "Role Name","Description","Brief description","Permissions","selected",
  "Select All","Deselect all","Select all","Save Changes","Invite Team Member",
  "Send an email invitation to join this organization","Workspace Role","Send Invitation",
  // ─── Settings: Integrations Tab ───
  "Uplisting API Key","Unlock to Edit","Enter your Uplisting API Key",
  "Verify & Save","API key verified","Property Link Mappings",
  "Link each local property to its corresponding Uplisting listing to sync calendar bookings.",
  "Sync Bookings","Auto-Map Properties","Search property or listing...","Bulk Unlink",
  "Local Property","Uplisting Listing","Actions","No properties match your filter.",
  "Linked","Unlinked","Not linked","Webhook Security Token","Generate",
  "Your Webhook Target URL:","WhatsApp Business API",
  "Connect your WhatsApp Business account for guest communication and automated messaging.",
  "Phone Number ID","Business Account ID","Access Token","Webhook Verify Token",
  "Connecting...","Test & Save","Platform-Level Integrations",
  "AI Assistant (Claude)","DocuSign Integration","Link Uplisting Property",
  "Select Uplisting Listing","No live listings could be retrieved from your Uplisting account.",
  "Unlink Property","Save Mapping","Confirm Your Password",
  "Enter your password to unlock","Your account password","Unlock",
  // ─── Settings: Danger Zone Tab ───
  "Danger Zone — Irreversible Actions",
  "Actions on this page permanently delete data. They cannot be undone.",
  "Delete All Properties","Permanently remove all properties from this organization.",
  "DELETE PROPERTIES","Delete All Bookings",
  "Permanently remove all bookings and reservation data.",
  "DELETE BOOKINGS","Delete All Team Members",
  "Remove all team members and staff from this organization.",
  "DELETE TEAM","Delete All Tasks & Schedules",
  "Remove all scheduled tasks, cleaning schedules, maintenance requests, and task history.",
  "DELETE TASKS","Delete All Accounting Data",
  "Remove all journal entries, ledger data, VAT records, and owner statements.",
  "DELETE ACCOUNTING","Delete Everything — Full Reset",
  "Completely wipe all data in this organization.",
  "DELETE EVERYTHING","Delete...","Permanently Delete",
  "Please do not close this page while deletion is in progress...",
  "To confirm, type","Confirmation text does not match. Deletion was not performed.",
  "ready to delete","characters typed",
  // ─── Common UI ───
  "Save Changes","Cancel","Delete","Edit","Add","Remove","Enable","Disable",
  "Loading...","Error","Success","Warning","Confirm","Yes","No",
  "Search","Filter","Export","Import","Close","Back","Next","Previous",
  "Submit","Reset","Refresh","View","Copy","Share","Download","Upload",
  "Select","All","None","Apply","Clear","Done","OK","Update","Create","New",
  "Open","More","Less","Show","Hide","Expand","Collapse","Details","Summary",
  "Preview","Print","Help","Info","Note","Required","Optional",
  "Settings","Profile","Name","Email","Password","Description","Status",
  "Date","Time","Location","Type","Category","Tags","Notes","Comments",
  "Created","Updated","Deleted","Active","Inactive","Pending",
  "Approved","Rejected","Draft","Published","Archived","Unknown",
  "No data found","No results","Loading data...","Something went wrong","Try again",
  "Copied!","Saving...","Saved!",
  // ─── Staff ───
  "Staff Management","Manage your team, track performance, and handle schedules.",
  "Staff Directory","Performance","Calendar","Add Staff Member","Search staff...",
  "All Roles","Loading staff...","No staff members found",
  "No staff members match your search criteria.","Add your first staff member to get started.",
  "Staff Member Details","Edit Staff Member","First Name","Last Name","Phone",
  "Base Salary","per month","Add Member",
  "Are you sure you want to delete this staff member?",
  "View Profile","Joined","Never","Performance Overview","Total Staff",
  "Active Members","On Leave","Avg. Rating","Tasks Completed","This Month",
  "Staff Calendar","Off Days","Scheduled","Add Off Day","Select Staff Member",
  "All Staff","Start Date","End Date","Reason","No off days scheduled",
  "Select a staff member to view their schedule","Payment Management","Record Payment",
  "Select staff member...","Payment Type","Salary","Bonus","Commission","Deduction",
  "Amount","Payment Date","Optional notes...","Submit Payment","Payment History",
  "No payments recorded yet","Total Paid","Claims Management","Submit Claim",
  "Claim Type","Expense Reimbursement","Travel Allowance","Equipment","Other",
  "Describe the claim...","Pending Claims","No pending claims","Approve","Reject",
  // ─── Properties ───
  "Manage your property portfolio.","Add Property","Import Properties",
  "Search properties...","All Types","Apartment","Villa","Studio","Penthouse","Townhouse",
  "All Status","Maintenance","Loading properties...","No properties found",
  "No properties match your search criteria.","Add your first property to get started.",
  "Property Name","Bedrooms","Bathrooms","Max Guests","Address","City","Country",
  "View on Map","Are you sure you want to delete this property?",
  "Add New Property","Edit Property","Property Details","Property Type",
  "Base Price (per night)","Address Line 1","Address Line 2","Postal Code",
  "Save Property","Upload a CSV or Excel file to import multiple properties at once.",
  "Drop your file here or click to browse","Supported formats: CSV, XLSX, XLS",
  "Upload File","Download Template","Mapping Columns",
  "Map your file columns to property fields.","Skip this column","Importing...",
  "Properties imported successfully.","Column Visibility","Show/hide columns",
  "Reset to Default","Select All","Deselect All","Building","Check-in Type",
  "Maps Link","Self Check-in","Host Check-in","Uplisting ID",
  "of","properties","Page","per page",
  // ─── Bookings ───
  "Reservations Control",
  "Track direct bookings, sync webhooks, OTA reconciliation, and double-entry escrow logs.",
  "Bookings List","Master Grid Calendar","Loading Reservations Ledger...",
  "Booking ID","Guest Name","Check-in","Check-out","Nights","Guests",
  "Adults","Children","Total Amount","Paid","Unpaid","Partially Paid","Refunded",
  "Cancelled","Confirmed","Source","Platform","Property","Room","Unit",
  "Special Requests","Today","Upcoming","Past","Search bookings...",
  "Filter by status","Filter by platform","Filter by property","No bookings found",
  "Export bookings","Booking confirmed","Booking cancelled","View details",
  "Edit booking","Cancel booking","Arrival","Departure","Duration","Revenue",
  "Commission","Net Revenue","Cleaning Fee","Service Fee","Taxes","Total",
  "Balance Due","Payment Status","Payment Method","Card","Bank Transfer","Cash",
  "Guest Email","Guest Phone",
  // ─── Scheduler ───
  "Today's Schedule","Weekly View","Monthly View","Add Task","Edit Task",
  "Task Name","Task Type","Assign To","Priority","High","Medium","Low",
  "Due Date","Start Time","End Time","Recurring","One-time","Daily","Weekly",
  "Monthly","Custom","Completed","In Progress","Not Started","Overdue",
  "Mark as Complete","Reassign","Add Note","Task Notes",
  "Cleaning","Inspection","Check-in Prep","Check-out Inspection",
  "Deep Cleaning","Quick Clean","No tasks scheduled","Add your first task",
  // ─── Accounting ───
  "Expenses","Profit","Loss","Net Income","Gross Revenue","Operating Expenses",
  "VAT","Tax","Invoice","Receipt","Statement","Report",
  "Financial Report","Monthly Report","Annual Report",
  "Chart of Accounts","General Ledger","Balance Sheet","Income Statement","Cash Flow",
  "Transactions","Income","Expense","Transfer","Refund","Payment","Deposit","Withdrawal",
  "Currency","AED","USD","EUR","Reference","Account","Period","From","To",
  // ─── Channel Management ───
  "Channels","Airbnb","Booking.com","VRBO","Expedia","Direct Booking",
  "Channel Performance","Listing","Sync","Rate Plan","Availability Block",
  "Stop Sell","Blocked","Channel Settings","Connect Channel","Disconnect Channel",
  // ─── Host Management ───
  "Hosts","Property Owner","Owner Portal","Revenue Share","Management Fee",
  "Owner Statement","Owner Report","Monthly Statement","Send Statement",
  "Owner Details","Bank Details","IBAN","Bank Name","Account Holder","Commission Rate",
  // ─── Revenue Management ───
  "Dynamic Pricing","Base Rate","Minimum Rate","Maximum Rate",
  "Seasonal Pricing","Weekend Pricing","Occupancy","ADR","RevPAR",
  "OTA Rate","Direct Rate","Discounts","Promotions","Last Minute","Early Bird",
  "Long Stay","Weekend","Peak Season","Low Season",
  // ─── Chat ───
  "Messages","New Message","Send","Reply","Forward","Archive",
  "Mark as Read","Mark as Unread","Guest Chat","Team Chat","Broadcast",
  "Template","AI Reply","Attachment","Emoji","WhatsApp","No messages",
  "Type a message...","Sending...","Delivered","Read","Failed","Online","Offline",
  "Last seen",
  // ─── Date / Time ───
  "View All","per night","per year","nights","days","hours","minutes",
  "ago","just now","yesterday","Last 7 days","Last 30 days","Last 90 days",
  "This month","This year","All time","Date Range","Apply Filter","Clear Filter",
  "Sort by","Ascending","Descending","Newest First","Oldest First","A-Z","Z-A",
  "Highest First","Lowest First","items","Go to page","First","Last",
  "January","February","March","April","May","June","July","August",
  "September","October","November","December","Q1","Q2","Q3","Q4",
];

// Deduplicate
const STRINGS = [...new Set(ALL_STRINGS)];

// Read existing translations to skip already-translated strings
const translationsFile = fs.readFileSync(
  path.join(__dirname, '../src/lib/translations.ts'), 'utf8'
);
const arMatch = translationsFile.match(/ar:\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
const existingKeys = new Set();
if (arMatch) {
  const entries = arMatch[1].match(/"([^"]+)":/g);
  if (entries) entries.forEach(e => existingKeys.add(e.replace(/[":]/g, '')));
}

const stringsToTranslate = STRINGS.filter(s => !existingKeys.has(s));
console.log(`Total unique strings: ${STRINGS.length}`);
console.log(`Already translated: ${STRINGS.length - stringsToTranslate.length}`);
console.log(`Need translation: ${stringsToTranslate.length}`);

async function callClaude(apiKey, prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 8096,
      messages: [{ role: 'user', content: prompt }]
    });
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content?.[0]) resolve(parsed.content[0].text);
          else reject(new Error('No content: ' + data.substring(0, 200)));
        } catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getClaudeApiKey() {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const res = await client.query(
      "SELECT settings FROM organizations WHERE settings::text LIKE '%pms_claude_api_key%' LIMIT 1"
    );
    await client.end();
    if (res.rows.length > 0) {
      const key = res.rows[0].settings?.pms_claude_api_key;
      if (key) { console.log('✓ Found Claude API key in DB'); return key; }
    }
  } catch (e) { console.log('DB read failed:', e.message); }
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  throw new Error('No Claude API key found.');
}

async function translateBatch(apiKey, strings, langCode, langName) {
  const BATCH_SIZE = 50;
  const results = {};
  for (let i = 0; i < strings.length; i += BATCH_SIZE) {
    const batch = strings.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  [${langCode}] ${i+1}-${Math.min(i+BATCH_SIZE,strings.length)}/${strings.length}...`);
    const prompt = `Translate these English UI strings for a holiday home / short-term rental management platform to ${langName}.

Rules:
- Keep translations short and natural for UI labels and buttons
- Professional hospitality industry tone
- Chinese: Simplified only
- Return ONLY a valid JSON object: {"English": "Translation", ...}
- No explanations

Strings: ${JSON.stringify(batch)}`;
    try {
      const response = await callClaude(apiKey, prompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        Object.assign(results, JSON.parse(jsonMatch[0]));
        process.stdout.write(' ✓\n');
      } else {
        console.log(' ✗ no JSON');
        batch.forEach(s => results[s] = s);
      }
    } catch (e) {
      console.log(` ✗ ${e.message.substring(0, 60)}`);
      batch.forEach(s => results[s] = s);
    }
    if (i + BATCH_SIZE < strings.length) await new Promise(r => setTimeout(r, 800));
  }
  return results;
}

async function main() {
  console.log(`\n=== Generating Translations ===`);
  const apiKey = await getClaudeApiKey();
  
  const allTranslations = {};
  for (const [code, name] of Object.entries(LANGUAGES)) {
    console.log(`\n${name} (${code}):`);
    allTranslations[code] = await translateBatch(apiKey, stringsToTranslate, code, name);
  }
  
  fs.writeFileSync(
    path.join(__dirname, 'new-translations.json'),
    JSON.stringify({ translations: allTranslations, strings: stringsToTranslate }, null, 2)
  );
  console.log('\n✓ Written to scripts/new-translations.json');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
