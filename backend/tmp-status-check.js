const fs = require('fs');
const mysql = require('mysql2/promise');
const env = {};
for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
(async () => {
  const c = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'findora_db',
    port: Number(env.DB_PORT || 3306)
  });
  const [rows] = await c.query("SHOW COLUMNS FROM items LIKE 'status'");
  console.log(rows[0]);
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
