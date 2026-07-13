// ============================================
// TEAM CONFIGURATION
// ============================================

// Fixed rotation order for phone duty - edit this to change the rotation order
// Note: Nadim is on the triage rota but not the phone rota
const ROTATION = ['Angus', 'Tommy', 'Tom', 'Farhad', 'Abir', 'Zoe'];

// ============================================
// HOLIDAYS
// Format: 'Name': ['YYYY-MM-DD', 'YYYY-MM-DD']
// ============================================
const HOLIDAYS = {
  'Abir':   ['2026-04-07', '2026-05-05', '2026-05-26', '2026-06-12', '2026-06-22', '2026-07-06', '2026-07-07', '2026-07-08', '2026-08-13', '2026-08-14', '2026-09-01', '2026-09-02', '2026-11-19', '2026-11-20', '2026-12-07', '2026-12-23', '2026-12-24', '2026-12-29', '2026-12-30', '2026-12-31'],
  'Zoe':    ['2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-06-25', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11'],
  'Angus':  ['2026-08-19', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24', '2026-12-29', '2026-12-30', '2026-12-31'],
  'Tom':    ['2026-04-27', '2026-04-28', '2026-05-14', '2026-05-15', '2026-06-15', '2026-06-25', '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-03'],
  'Farhad': ['2026-04-16', '2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-27', '2026-05-28', '2026-06-29'],
  'Tommy':  ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-13', '2026-08-14', '2026-08-17', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-28', '2026-09-29', '2026-12-29', '2026-12-30', '2026-12-31'],
};

// ============================================
// SCRIPT - No need to edit below this line
// ============================================

// A fixed reference Monday - week index 0 in the rotation
// Week of 16 Mar 2026 = position 0 (Angus + Tommy are first up)
const REFERENCE_MONDAY = new Date('2026-03-16T00:00:00Z');

function getNextFriday() {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();

  let daysUntilFriday;
  if (dayOfWeek <= 3) {
    daysUntilFriday = 5 - dayOfWeek;
  } else {
    daysUntilFriday = 5 + (7 - dayOfWeek);
  }

  const friday = new Date(today);
  friday.setUTCDate(today.getUTCDate() + daysUntilFriday);
  friday.setUTCHours(0, 0, 0, 0);
  return friday;
}

function getFollowingMonday(friday) {
  const monday = new Date(friday);
  monday.setUTCDate(friday.getUTCDate() + 3);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function getMondayOfWeek(friday) {
  const monday = new Date(friday);
  monday.setUTCDate(friday.getUTCDate() - 4);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function isOnHoliday(person, dateStr) {
  return HOLIDAYS[person]?.includes(dateStr) || false;
}

function isAvailable(person, fridayStr, mondayStr) {
  return !isOnHoliday(person, fridayStr) && !isOnHoliday(person, mondayStr);
}

function getWeekIndex(friday) {
  const mondayOfFridaysWeek = getMondayOfWeek(friday);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diff = mondayOfFridaysWeek - REFERENCE_MONDAY;
  return Math.round(diff / msPerWeek);
}

function selectPrimary(friday, monday) {
  const fridayStr = friday.toISOString().split('T')[0];
  const mondayStr = monday.toISOString().split('T')[0];
  const weekIndex = getWeekIndex(friday);
  const size = ROTATION.length;

  const picked = [];
  for (let i = 0; i < size * 2; i++) {
    const person = ROTATION[(weekIndex + i) % size];
    if (isAvailable(person, fridayStr, mondayStr) && !picked.includes(person)) {
      picked.push(person);
      if (picked.length === 2) break;
    }
  }

  if (picked.length < 2) return null;
  return { iphone: picked[0], android: picked[1] };
}

function selectBackups(friday, monday, primary) {
  const fridayStr = friday.toISOString().split('T')[0];
  const mondayStr = monday.toISOString().split('T')[0];
  const weekIndex = getWeekIndex(friday);
  const size = ROTATION.length;

  const picked = [];
  for (let i = 0; i < size * 2; i++) {
    const person = ROTATION[(weekIndex + i) % size];
    if (
      isAvailable(person, fridayStr, mondayStr) &&
      person !== primary.iphone &&
      person !== primary.android &&
      !picked.includes(person)
    ) {
      picked.push(person);
      if (picked.length === 2) break;
    }
  }

  return {
    iphoneBackup: picked[0] || null,
    androidBackup: picked[1] || null
  };
}

function generatePhoneRota() {
  const friday = getNextFriday();
  const monday = getFollowingMonday(friday);

  const fridayFormatted = friday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const mondayFormatted = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const fridayStr = friday.toISOString().split('T')[0];
  const mondayStr = monday.toISOString().split('T')[0];

  const primary = selectPrimary(friday, monday);

  if (!primary) {
    return {
      error: true,
      friday: fridayFormatted,
      monday: mondayFormatted,
      message: '⚠️ Not enough people available for both Friday and Monday'
    };
  }

  const backups = selectBackups(friday, monday, primary);

  const holidayNotes = [];
  for (const [person, dates] of Object.entries(HOLIDAYS)) {
    if (dates.includes(fridayStr)) holidayNotes.push(`${person} off Fri`);
    if (dates.includes(mondayStr)) holidayNotes.push(`${person} off Mon`);
  }

  return {
    error: false,
    friday: fridayFormatted,
    monday: mondayFormatted,
    primary,
    backups,
    holidayNotes
  };
}

function formatForSlack(rota) {
  if (rota.error) {
    return `*📱 MFA Phone Rota: Friday ${rota.friday}*\n\n${rota.message}`;
  }

  let message = `*📱 MFA Phone Rota: Friday ${rota.friday}*\n\n`;
  message += `_Take home Thursday evening, return Monday ${rota.monday}_\n\n`;

  message += `*Primary (taking phones home):*\n`;
  message += `📱 iPhone: *${rota.primary.iphone}*\n`;
  message += `📱 Android: *${rota.primary.android}*\n\n`;

  message += `*Backups (cover if primary is ill):*\n`;
  message += `🛡️ iPhone backup: ${rota.backups.iphoneBackup || 'N/A'}\n`;
  message += `🛡️ Android backup: ${rota.backups.androidBackup || 'N/A'}\n`;

  if (rota.backups.iphoneBackup === rota.backups.androidBackup && rota.backups.iphoneBackup) {
    message += `\n_⚠️ ${rota.backups.iphoneBackup} is backup for both phones (limited availability)_\n`;
  }

  if (rota.holidayNotes.length > 0) {
    message += `\n_🏖️ ${rota.holidayNotes.join(' | ')}_`;
  }

  return message;
}

async function postToSlack(message) {
  const webhookUrl = process.env.SLACK_PHONE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error('ERROR: SLACK_PHONE_WEBHOOK_URL not set');
    process.exit(1);
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });

  if (!response.ok) {
    throw new Error(`Slack API error: ${response.status}`);
  }

  console.log('✅ Phone rota posted successfully!');
}

// Main execution
const rota = generatePhoneRota();
const message = formatForSlack(rota);

console.log('Generated phone rota:\n');
console.log(message);
console.log('\n---\nPosting to Slack...\n');

postToSlack(message);
