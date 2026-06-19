const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const reports = [
  { html: 'auth_report.html', pdf: 'Auth_and_Access_Audit_Report.pdf', title: 'Authentication & Access Module Audit' },
  { html: 'bookings_report.html', pdf: 'Bookings_and_Integrations_Audit_Report.pdf', title: 'Bookings & Integrations Module Audit' },
  { html: 'properties_report.html', pdf: 'Properties_and_Maps_Audit_Report.pdf', title: 'Properties & Maps Module Audit' },
  { html: 'host_mgmt_report.html', pdf: 'Host_and_Org_Management_Audit_Report.pdf', title: 'Host & Org Management Module Audit' },
  { html: 'settings_report.html', pdf: 'Settings_and_Configurations_Audit_Report.pdf', title: 'Settings & Configurations Module Audit' },
  { html: 'accounting_report.html', pdf: 'Accounting_and_Owner_Portal_Audit_Report.pdf', title: 'Accounting & Owner Portal Module Audit' }
];

(async () => {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const report of reports) {
    const htmlPath = path.resolve(__dirname, report.html);
    const pdfPath = path.resolve(__dirname, report.pdf);

    if (!fs.existsSync(htmlPath)) {
      console.warn(`Warning: ${htmlPath} does not exist. Skipping...`);
      continue;
    }

    console.log(`Generating: ${report.pdf}...`);
    const page = await browser.newPage();
    const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

    try {
      await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 45000 });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      await new Promise(r => setTimeout(r, 2000));

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '16mm',
          bottom: '20mm',
          left: '16mm',
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="width: 100%; font-size: 9px; color: #999; text-align: center; font-family: Arial, sans-serif;">
            <span>Holiday Homes SaaS — ${report.title}</span>
            <span style="margin-left: 24px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      const stats = fs.statSync(pdfPath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`Successfully generated: ${report.pdf} (${sizeMB} MB)`);
    } catch (err) {
      console.error(`Error generating ${report.pdf}:`, err);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('All PDF generation tasks completed.');
})();
