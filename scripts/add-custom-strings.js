const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'translations.ts');
let fileContent = fs.readFileSync(filePath, 'utf8');

const newTranslations = {
  ar: {
    "1 booking": "حجز واحد",
    "bookings": "حجوزات"
  },
  ru: {
    "1 booking": "1 бронирование",
    "bookings": "бронирований"
  },
  fr: {
    "1 booking": "1 réservation",
    "bookings": "réservations"
  },
  es: {
    "1 booking": "1 reserva",
    "bookings": "reservas"
  },
  de: {
    "1 booking": "1 Buchung",
    "bookings": "Buchungen"
  },
  it: {
    "1 booking": "1 prenotazione",
    "bookings": "prenotazioni"
  },
  pt: {
    "1 booking": "1 reserva",
    "bookings": "reservas"
  },
  zh: {
    "1 booking": "1 个预订",
    "bookings": "预订"
  },
  ja: {
    "1 booking": "1 件 of 予約",
    "bookings": "予約"
  },
  ko: {
    "1 booking": "1개 예약",
    "bookings": "예약"
  },
  tr: {
    "1 booking": "1 rezervasyon",
    "bookings": "rezervasyonlar"
  },
  nl: {
    "1 booking": "1 boeking",
    "bookings": "boekingen"
  },
  pl: {
    "1 booking": "1 rezerwacja",
    "bookings": "rezerwacje"
  },
  hi: {
    "1 booking": "1 बुकिंग",
    "bookings": "बुकिंग"
  }
};

for (const [lang, translations] of Object.entries(newTranslations)) {
  const marker = `${lang}: {`;
  const index = fileContent.indexOf(marker);
  if (index === -1) {
    console.error(`Could not find marker for language: ${lang}`);
    continue;
  }

  // Check if already added in this specific block's vicinity (e.g. next 100 chars)
  const surroundingText = fileContent.slice(index, index + 150);
  if (surroundingText.includes(`"1 booking"`)) {
    console.log(`Translations already added for ${lang}`);
    continue;
  }

  const insertIndex = index + marker.length;
  const insertContent = `\n    "1 booking": "${translations["1 booking"]}",\n    "bookings": "${translations["bookings"]}",`;
  fileContent = fileContent.slice(0, insertIndex) + insertContent + fileContent.slice(insertIndex);
}

fs.writeFileSync(filePath, fileContent, 'utf8');
console.log('Successfully added translations!');
