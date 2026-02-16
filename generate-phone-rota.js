// ============================================
// TEAM CONFIGURATION (shared with triage rota)
// ============================================
const TEAM = ['Abir', 'Zoe', 'Angus', 'Tommy', 'Tom', 'Farhad', 'Nadim'];

// ============================================
// HOLIDAYS - Shared with triage rota
// Format: 'Name': ['YYYY-MM-DD', 'YYYY-MM-DD']
// ============================================
const HOLIDAYS = {
  'Abir': ['2026-02-13', '2026-04-02', '2026-04-07', '2026-05-05', '2026-05-26', '2026-06-12', '2026-07-06', '2026-07-07', '2026-07-08', '2026-11-19', '2026-11-20'],
  'Zoe': ['2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13'],
  'Angus': ['2026-01-23', '2026-01-26', '2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30', '2026-02-02', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-08-19', '2026-09-01'],
  'Tom': ['2026-02-09', '2026-05-14', '2026-05-15'],
  'Farhad': ['2026-01-12', '2026-01-13', '2026-05-29', '2026-02-23', '2026-02-24', '2026-02-25', '2026-02-26', '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-08'],
  'Tommy': [],
  'Nadim': []
};

// ============================================
// PHONE ASSIGNMENT HISTORY (in-memory)
// In production, this could be stored in a file or database
// ============================================
let PHONE_HISTORY = [];

// ============================================
// HELPER FUNCTIONS
// ============================================

function getNextFriday() {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  
  // Calculate days until next Friday (5 = Friday)
  let daysUntilFriday;
  if (dayOfWeek <= 3) {
    // Mon-Wed: next Friday this week
    daysUntilFriday = 5 - dayOfWeek;
  } else {
    // Thu-Sun: next Friday next week
    daysUntilFriday = 5 + (7 - dayOfWeek);
  }
  
  const friday = new Date(today);
  friday.setUTCDate(today.getUTCDate() + daysUntilFriday);
  friday.setUTCHours(0, 0, 0, 0);
  
  return friday;
}

function getFollowingMonday(friday) {
  const monday = new Date(friday);
  monday.setUTCDate(friday.getUTCDate() + 3); // Friday + 3 days = Monday
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function isOnHoliday(person, dateStr) {
  return HOLIDAYS[person]?.includes(dateStr) || false;
}

function getAvailableForPhones(friday, monday) {
  const fridayStr = friday.toISOString().split('T')[0];
  const mondayStr = monday.toISOString().split('T')[0];
  
  // Person must be available BOTH Friday (to take) AND Monday (to return)
  return TEAM.filter(person => 
    !isOnHoliday(person, fridayStr) && 
    !isOnHoliday(person, mondayStr)
  );
}

function getPhoneCounts() {
  const counts = {
    total: {},
    iphone: {},
    android: {}
  };
  
  TEAM.forEach(person => {
    counts.total[person] = 0;
    counts.iphone[person] = 0;
    counts.android[person] = 0;
  });
  
  PHONE_HISTORY.forEach(assignment => {
    if (counts.total[assignment.iphone] !== undefined) {
      counts.total[assignment.iphone]++;
      counts.iphone[assignment.iphone]++;
    }
    if (counts.total[assignment.android] !== undefined) {
      counts.total[assignment.android]++;
      counts.android[assignment.android]++;
    }
  });
  
  return counts;
}

function selectPhoneHolders(available) {
  if (available.length < 2) {
    return null; // Not enough people
  }
  
  const counts = getPhoneCounts();
  
  // Sort by total assignments (least to most)
  const sorted = [...available].sort((a, b) => {
    const countDiff = counts.total[a] - counts.total[b];
    if (countDiff !== 0) return countDiff;
    
    // If tied on total, sort by who hasn't had a phone longest
    const lastA = [...PHONE_HISTORY].reverse().findIndex(h => 
      h.iphone === a || h.android === a
    );
    const lastB = [...PHONE_HISTORY].reverse().findIndex(h => 
      h.iphone === b || h.android === b
    );
    
    if (lastA === -1 && lastB === -1) return 0;
    if (lastA === -1) return -1; // a never had phone, pick them
    if (lastB === -1) return 1;  // b never had phone, pick them
    return lastB - lastA; // Pick whoever had it longer ago
  });
  
  // Pick top 2 people with fewest assignments
  const person1 = sorted[0];
  const person2 = sorted[1];
  
  // Decide who gets iPhone vs Android based on their individual phone counts
  const p1iPhone = counts.iphone[person1] || 0;
  const p1Android = counts.android[person1] || 0;
  const p2iPhone = counts.iphone[person2] || 0;
  const p2Android = counts.android[person2] || 0;
  
  // Give iPhone to person who has had it less
  let iphone, android;
  if (p1iPhone - p1Android <= p2iPhone - p2Android) {
    iphone = person1;
    android = person2;
  } else {
    iphone = person2;
    android = person1;
  }
  
  return { iphone, android };
}

function selectBackups(available, primary) {
  // Remove primary holders from available pool
  const backupPool = available.filter(p => 
    p !== primary.iphone && p !== primary.android
  );
  
  if (backupPool.length === 0) {
    return { iphoneBackup: null, androidBackup: null };
  }
  
  const counts = getPhoneCounts();
  
  // Sort backup pool by total assignments
  const sorted = [...backupPool].sort((a, b) => 
    counts.total[a] - counts.total[b]
  );
  
  if (backupPool.length === 1) {
    // Only one backup available - they cover both phones
    return {
      iphoneBackup: sorted[0],
      androidBackup: sorted[0]
    };
  }
  
  // Assign different backups for each phone
  return {
    iphoneBackup: sorted[0],
    androidBackup: sorted[1]
  };
}

function generatePhoneRota() {
  const friday = getNextFriday();
  const monday = getFollowingMonday(friday);
  
  const fridayFormatted = friday.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
  const mondayFormatted = monday.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short' 
  });
  
  const available = getAvailableForPhones(friday, monday);
  
  if (available.length < 2) {
    return {
      error: true,
      friday: fridayFormatted,
      monday: mondayFormatted,
      available,
      message: '⚠️ Not enough people available for both Friday and Monday'
    };
  }
  
  const primary = selectPhoneHolders(available);
  const backups = selectBackups(available, primary);
  
  // Record this assignment
  PHONE_HISTORY.push({
    iphone: primary.iphone,
    android: primary.android,
    date: friday.toISOString().split('T')[0]
  });
  
  return {
    error: false,
    friday: fridayFormatted,
    monday: mondayFormatted,
    primary,
    backups,
    available
  };
}

function formatForSlack(rota) {
  if (rota.error) {
    let message = `*📱 MFA Phone Rota - ${rota.friday}*\n\n`;
    message += `${rota.message}\n\n`;
    message += `Available: ${rota.available.join(', ') || 'None'}`;
    return message;
  }
  
  let message = `*📱 MFA Phone Rota: Friday ${rota.friday}*\n\n`;
  message += `_Take home Thursday evening, return Monday ${rota.monday}_\n\n`;
  
  // Primary assignments
  message += `*Primary (taking phones home):*\n`;
  message += `📱 iPhone: *${rota.primary.iphone}*\n`;
  message += `📱 Android: *${rota.primary.android}*\n\n`;
  
  // Backup assignments
  message += `*Backups (cover if primary is ill):*\n`;
  message += `🛡️ iPhone backup: ${rota.backups.iphoneBackup || 'N/A'}\n`;
  message += `🛡️ Android backup: ${rota.backups.androidBackup || 'N/A'}\n\n`;
  
  if (rota.backups.iphoneBackup === rota.backups.androidBackup && rota.backups.iphoneBackup) {
    message += `_⚠️ ${rota.backups.iphoneBackup} is backup for both phones (limited availability)_\n\n`;
  }
  
  // Add holiday info if relevant
  const fridayStr = new Date(rota.friday + ' 2026').toISOString().split('T')[0];
  const mondayStr = new Date(rota.monday + ' 2026').toISOString().split('T')[0];
  
  const holidayNotes = [];
  for (const [person, dates] of Object.entries(HOLIDAYS)) {
    if (dates.includes(fridayStr)) {
      holidayNotes.push(`${person} off Fri`);
    }
    if (dates.includes(mondayStr)) {
      holidayNotes.push(`${person} off Mon`);
    }
  }
  
  if (holidayNotes.length > 0) {
    message += `_🏖️ ${holidayNotes.join(' | ')}_`;
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
