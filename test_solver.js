const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');

// Load env variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
    if (match) {
      let key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
}

if (typeof globalThis.WebSocket === 'undefined') {
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
}
neonConfig.forceDisablePgSSL = true;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

// Helper functions from Scheduler.tsx
function parseCoordinatesFromLink(link) {
  if (!link) return null;
  const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = link.match(regex);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
}

function getDrivingTime(fromId, toId, fromLat, fromLng, toLat, toLng, departureMins, dateKey) {
  // Simplification of getDrivingTime for offline simulation
  return 20; // 20 mins default
}

async function main() {
  const org = await prisma.organization.findUnique({
    where: { id: '43930e53-1e19-493f-a5ce-14cb83bf22ad' },
    include: { bookings: { include: { property: true } } }
  });
  
  const propertiesData = await prisma.property.findMany({
    where: { organizationId: '43930e53-1e19-493f-a5ce-14cb83bf22ad' }
  });
  
  const properties = propertiesData.map(p => {
    const extra = p.extraDetails && typeof p.extraDetails === 'object' ? p.extraDetails : {};
    return {
      ...p,
      col_bedrooms: String(p.bedrooms || extra.col_bedrooms || "1"),
      col_baths: String(p.bathrooms || extra.col_baths || "1"),
      col_building_name: extra.col_building_name || p.addressLine2 || "",
      col_maps: extra.col_maps || p.city || "",
      col_checkin_type: extra.col_checkin_type || "Self Check-in",
      uplistingPropertyId: extra.uplistingId || undefined,
      google_maps_link: p.addressLine1 || "",
      extraDetails: extra
    };
  });

  const staff = org.settings.staff || [];
  const hqs = org.settings.hhs_hq || {};
  const isHqLocated = !!hqs.latitude;

  // Let's print out some properties and staff to make sure we're aligned
  console.log("Total staff loaded:", staff.length);
  console.log("Total properties loaded:", properties.length);

  // Simulate scheduler run for a date with Celadon 501 1B Mid-stay Cleaning
  // Let's check which date has tasks
  console.log("Tasks in database settings:", org.settings.hhs_tasks?.map(t => ({
    id: t.id,
    type: t.task_type,
    property: t.property_id,
    assigned_date: t.assigned_date,
    duration: t.duration_mins,
    priority: t.priority
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
