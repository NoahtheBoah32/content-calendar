// Fix: month indexing was wrong. Calendar uses 0-indexed months.
// April 2026 = "2026-3-X", not "2026-4-X".
// Step 1: revert the wrongly-placed May entries back to TBD.
// Step 2: place the 13 reels into the correct April keys, starting 2026-3-7.
const fs = require('fs');
const path = require('path');

const POSTS_PATH = path.join(__dirname, 'data', 'posts.json');
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, 'reel-drive-ids.json'), 'utf8'));

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
  ['12-food-forest-weeds-are-not-the-enemy.mp4','Weeds Are Not the Enemy',     'Why the weeds in your food forest are doing more good than harm.'],
  ['13-food-forest-first-seeds.mp4',          'Food Forest — First Seeds',     'The first seeds going into the ground.'],
];

const REELS = [];
let s = 0, f = 0;
const ffPositions = new Set([2, 6, 10]);
for (let i = 0; i < 13; i++) {
  if (ffPositions.has(i) && f < FOOD_FOREST.length) {
    REELS.push({ ...mapRow(FOOD_FOREST[f]), tag: 'foodforest' });
    f++;
  } else if (s < SALONGA.length) {
    REELS.push({ ...mapRow(SALONGA[s]), tag: 'salonga' });
    s++;
  }
}
function mapRow([filename, title, description]) {
  return { filename, title, description, driveFileId: IDS[filename] };
}

const posts = JSON.parse(fs.readFileSync(POSTS_PATH, 'utf8'));

// STEP 1: revert the wrong May entries (2026-4-X that I touched) back to TBD
const REVERT_DATES = ['2026-4-7','2026-4-8','2026-4-10','2026-4-11','2026-4-12','2026-4-14','2026-4-15','2026-4-17','2026-4-18','2026-4-19','2026-4-21','2026-4-22','2026-4-24'];
let reverted = 0;
for (const dk of REVERT_DATES) {
  if (!posts[dk]) continue;
  for (const p of posts[dk]) {
    if (p.driveFileType === 'video' && p.driveFileId) {
      p.title = 'Reel - TBD';
      p.description = 'Reel slot';
      p.driveFileId = '';
      p.driveThumbnail = '';
      p.driveFileName = '';
      delete p.ytShort;
      reverted++;
    }
  }
}
console.log('Reverted (May)', reverted, 'wrongly-placed entries.');

// STEP 2: place reels into correct April keys (month index 3) starting day 7
// April reel posting days from existing TBD slots: 7, 8, 10, 11, 12, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26, 28, 29, 30
// We need 13 slots starting from day 7
const APRIL_REEL_DAYS = [];
for (let d = 7; d <= 30; d++) {
  const key = `2026-3-${d}`;
  if (posts[key]) {
    for (let i = 0; i < posts[key].length; i++) {
      const p = posts[key][i];
      if (p.driveFileType === 'video' && (!p.driveFileId || p.title.includes('TBD'))) {
        APRIL_REEL_DAYS.push({ key, idx: i, day: d });
        break; // one reel per day
      }
    }
  }
}
console.log('April reel slots from day 7:', APRIL_REEL_DAYS.length, '— need 13');

const placements = [];
REELS.forEach((reel, i) => {
  if (i >= APRIL_REEL_DAYS.length) return;
  const slot = APRIL_REEL_DAYS[i];
  const post = posts[slot.key][slot.idx];
  post.title = reel.title;
  post.description = reel.description;
  post.driveFileId = reel.driveFileId;
  post.driveFileName = reel.filename.replace(/\.mp4$/, '');
  post.driveFileType = 'video';
  post.ytShort = true;
  placements.push({ key: slot.key, day: slot.day, tag: reel.tag, title: reel.title });
});

fs.writeFileSync(POSTS_PATH, JSON.stringify(posts, null, 2));
console.log('\nPlacements (April 2026, key = 2026-3-DD):');
placements.forEach(p => console.log(' ', p.key, '(Apr', p.day + ')', '—', p.tag.padEnd(10), p.title));
console.log('\nUpdated', POSTS_PATH);
