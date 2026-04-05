const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');

const masterKeyB64 = process.argv[3] || process.argv[2];
const dbFile = process.argv[2].includes('=') ? process.argv[3] : process.argv[2];

console.log('Using DB:', dbFile);
console.log('Key length:', masterKeyB64?.length);

const mk = Buffer.from(masterKeyB64, 'base64');
const db = new Database(dbFile, { readonly: true });

const rows = db.prepare("SELECT host_key, name, encrypted_value FROM cookies WHERE host_key LIKE '%youtube%' LIMIT 5").all();
console.log('Found', rows.length, 'youtube cookies');

let exported = '# Netscape HTTP Cookie File\n';
let count = 0;

// Also get all google cookies for auth
const allRows = db.prepare("SELECT host_key, name, path, is_secure, expires_utc, encrypted_value FROM cookies WHERE host_key LIKE '%youtube%' OR host_key LIKE '%google%'").all();

for (const r of allRows) {
  try {
    const ev = Buffer.from(r.encrypted_value);
    if (ev.length < 15) continue;

    const prefix = ev.slice(0, 3).toString('hex');
    // v10 = 763130, v20 = 763230
    if (prefix !== '763130' && prefix !== '763230') {
      if (count < 3) console.log('Unknown prefix:', prefix, 'for', r.name);
      continue;
    }

    const nonce = ev.slice(3, 15);
    const ciphertext = ev.slice(15, ev.length - 16);
    const tag = ev.slice(ev.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', mk, nonce);
    decipher.setAuthTag(tag);
    const value = decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');

    const secure = r.is_secure ? 'TRUE' : 'FALSE';
    const expiry = Math.floor((r.expires_utc / 1000000) - 11644473600);
    exported += r.host_key + '\tTRUE\t' + r.path + '\t' + secure + '\t' + expiry + '\t' + r.name + '\t' + value + '\n';
    count++;
  } catch(e) {
    if (count < 3) console.log('Decrypt error for', r.name, ':', e.message);
  }
}

console.log('Successfully decrypted:', count, 'cookies');
fs.writeFileSync('C:/Users/User/AppData/Local/Temp/yt_cookies.txt', exported);
db.close();
