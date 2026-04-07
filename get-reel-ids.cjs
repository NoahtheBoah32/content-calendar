// Query DriveFS local metadata DB to map reel filenames → cloud Drive file IDs
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = 'C:/Users/User/AppData/Local/Google/DriveFS/105326705216765300079/metadata_sqlite_db';

const TARGET_REELS = [
  '01-food-security.mp4',
  '02-chronic-problem.mp4',
  '03-wrong-priorities.mp4',
  '04-subsistence-fisherman.mp4',
  '05-subsistence-farming.mp4',
  '06-sugar-breadbasket.mp4',
  '07-dont-feed-yourself.mp4',
  '08-destroyed-food-security.mp4',
  '09-filipino-identity.mp4',
  '10-every-family-had-farms.mp4',
  '11-food-forest-the-vision.mp4',
  '12-food-forest-weeds-are-not-the-enemy.mp4',
  '13-food-forest-first-seeds.mp4',
];

// Open read-only with WAL handling
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

// Inspect schema to find correct columns
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// items table: local_title, stable_id
// stable_ids table maps stable_id → cloud_id
let itemsCols, stableIdsCols;
try { itemsCols = db.prepare("PRAGMA table_info(items)").all().map(c => c.name); console.log('items cols:', itemsCols.join(', ')); } catch(e) {}
try { stableIdsCols = db.prepare("PRAGMA table_info(stable_ids)").all().map(c => c.name); console.log('stable_ids cols:', stableIdsCols.join(', ')); } catch(e) {}

// Lookup each reel
const results = {};
const stmt = db.prepare(`
  SELECT i.local_title, i.stable_id, s.cloud_id
  FROM items i
  LEFT JOIN stable_ids s ON i.stable_id = s.stable_id
  WHERE i.local_title = ?
  LIMIT 5
`);

for (const filename of TARGET_REELS) {
  const rows = stmt.all(filename);
  if (rows.length === 0) {
    console.log('NOT FOUND:', filename);
    results[filename] = null;
  } else {
    // If multiple matches, prefer the one with a cloud_id
    const best = rows.find(r => r.cloud_id) || rows[0];
    console.log(filename, '→', best.cloud_id || '(no cloud_id)');
    results[filename] = best.cloud_id;
  }
}

fs.writeFileSync('reel-drive-ids.json', JSON.stringify(results, null, 2));
console.log('\nSaved reel-drive-ids.json');
db.close();
