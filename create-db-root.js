import postgres from 'postgres';

async function main() {
  // Connect to default 'postgres' database
  const sql = postgres('postgres://paperclip@127.0.0.1:54329/postgres');
  try {
    await sql`CREATE DATABASE paperclip`;
    console.log('Database paperclip created successfully!');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Database paperclip already exists.');
    } else {
      console.error('Error creating database:', err);
    }
  } finally {
    await sql.end();
  }
}

main();
