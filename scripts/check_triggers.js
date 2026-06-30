const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:54322/postgres'
});

async function checkTriggers() {
  try {
    const res = await pool.query(`
      SELECT event_object_table, trigger_name, event_manipulation, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'members';
    `);
    console.log(res.rows);
    pool.end();
  } catch (err) {
    console.error(err);
    pool.end();
  }
}

checkTriggers();
