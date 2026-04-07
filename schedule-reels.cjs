// Schedule the 13 production reels into the content calendar starting 2026-04-07
// Mixes Salonga (10) + food forest (3) for diversity instead of stacking same-type runs.
const fs = require('fs');
const path = require('path');

const POSTS_PATH = path.join(__dirname, 'data', 'posts.json');
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'reel-drive-ids.json'), 'utf8'));

// Reel metadata: id, filename, title, type, description
const SALONGA = [
  ['01-food-security.mp4',          'Food Security',                      'Esteban Salonga on what food security actually means.'],
  ['02-chronic-problem.mp4',        'A Chronic Problem',                  'The Philippines has a chronic food problem most people don\'t see.'],
  ['03-wrong-priorities.mp4',       'Wrong Priorities',                   'How national priorities drifted away from feeding ourselves.'],
  ['04-subsistence-fisherman.mp4',  'The Subsistence Fisherman',          'Why subsistence fishermen are the canary in our coal mine.'],
  ['05-subsistence-farming.mp4',    'Subsistence Farming',                'The forgotten dignity of subsistence farming in the Philippines.'],
  ['06-sugar-breadbasket.mp4',      'Sugar vs the Breadbasket',           'How sugar replaced the breadbasket of an entire region.'],
  ['07-dont-feed-yourself.mp4',     'You Don\'t Feed Yourself',           'What happens when a country stops feeding itself.'],
  ['08-destroyed-food-security.mp4','Destroyed Food Security',            'The exact moment Philippine food security got destroyed.'],
  ['09-filipino-identity.mp4',      'Filipino Identity',                  'Filipino identity is rooted in the soil — and we\'re losing it.'],
  ['10-every-family-had-farms.mp4', 'Every Family Used to Farm',          'There was a time every Filipino family had a farm. What changed?'],
];

const FOOD_FOREST = [
  ['11-food-forest-the-vision.mp4',           'Food Forest — The Vision',      'Tax shares the vision behind his food forest project.'],
  ['12-food-forest-weeds-are-not-the-enemy.mp4', 'Weeds Are Not the Enemy',    'Why the weeds in your food forest are doing more good than harm.'],
  ['13-food-forest-first-seeds.mp4',          'Food Forest — First Seeds',     'The first seeds going into the ground. Where it all begins.'],
];

// Diversity mix: 13 slots total. Food forest at positions 3, 7, 11 (1-indexed).
// Sequence: S S F S S S F S S S F S S
const ORDER = [];
let s = 0, f = 0;
const ffPositions = new Set([2, 6, 10]); // 0-indexed
for (let i = 0; i < 13; i++) {
  if (ffPositions.has(i) && f < FOOD_FOREST.length) {
    ORDER.push({ ...mapRow(FOOD_FOREST[f]), type: 'foodforest' });
    f++;
  } else if (s < SALONGA.length) {
    ORDER.push({ ...mapRow(SALONGA[s]), type: 'salonga' });
    s++;
  }
}
function mapRow([filename, title, description]) {
  return { filename, title, description, driveFileId: IDS[filename] };
}

// Load posts.json
const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));

// Find existing reel slots from 2026-04-07 onwards (in date order)
const reelSlots = [];
for (const dateKey of Object.keys(posts).sort()) {
  // Parse YYYY-M-D
  const m = dateKey.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) continue;
  const [, y, mo, d] = m.map(Number);
  // Filter: from 2026-04-07 inclusive onwards
  const dateStamp = y * 10000 + mo * 100 + d;
  if (dateStamp < 20260407) continue;
  // Look for unfilled reel slots (video type, empty driveFileId)
  posts[dateKey].forEach((post, idx) => {
    if (post.driveFileType === 'video' && !post.driveFileId) {
      reelSlots.push({ dateKey, idx });
    }
  });
}
reelSlots.sort((a, b) => {
  // Sort by date (the keys are already alphabetically date-sortable per loop above, but make explicit)
  const pa = a.dateKey.match(/^(\d+)-(\d+)-(\d+)$/).slice(1).map(Number);
  const pb = b.dateKey.match(/^(\d+)-(\d+)-(\d+)$/).slice(1).map(Number);
  return (pa[0]*10000+pa[1]*100+pa[2]) - (pb[0]*10000+pb[1]*100+pb[2]);
});

console.log('Available reel slots from 2026-04-07:', reelSlots.length);
console.log('Reels to place:', ORDER.length);

if (reelSlots.length < ORDER.length) {
  console.warn('WARNING: not enough reel slots in calendar — only first', reelSlots.length, 'will be placed.');
}

// Place reels
const placements = [];
ORDER.forEach((reel, i) => {
  if (i >= reelSlots.length) return;
  const slot = reelSlots[i];
  const post = posts[slot.dateKey][slot.idx];
  post.title = reel.title;
  post.description = reel.description;
  post.driveFileId = reel.driveFileId;
  post.driveFileName = reel.filename.replace(/\.mp4$/, '');
  post.driveFileType = 'video';
  // Add YT Short twin marker — same file, dual-platform per FRIDAY context
  post.ytShort = true;
  placements.push({ date: slot.dateKey, title: reel.title, type: reel.type });
});

// Write back
fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2));
console.log('\nPlacements:');
placements.forEach(p => console.log(' ', p.date, '—', p.type.padEnd(10), p.title));
console.log('\nUpdated', POSTS_PATH);
