# Local Windows PostgreSQL UTF-8 Runbook

## Why UTF-8 is Required on Windows
On Windows systems, the default PostgreSQL cluster locale and encoding are inherited from the host operating system's system locale, which typically defaults to `WIN1252` (Western European). 

When the Paperclip workspace path contains Vietnamese or other non-ASCII characters (e.g. `D:\Project\A Tung\paperclip-dự án công ty AI`), the dev server attempts to scan the workspace and insert absolute paths into the `company_skills` database table (e.g. within `source_locator` or `local_path` fields). Because the `WIN1252` encoding has no representation for Vietnamese accented characters like `ự` or `á`, PostgreSQL rejects the transaction with:
```
PostgresError: character with byte sequence 0xe1 0xbb 0xb1 in encoding "UTF8" has no equivalent in encoding "WIN1252"
```
This halts database transactions and prevents agent heartbeats and run cycles from succeeding.

## How to Initialize PostgreSQL with UTF-8
To resolve this issue, the local PostgreSQL database cluster must be initialized with `UTF8` encoding and the `C` locale.

Follow these steps to clean and recreate a UTF-8 local database cluster:

1. **Stop any running postgres processes**:
   ```powershell
   Get-Process postgres -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
   ```
2. **Remove the old database directory**:
   ```powershell
   Remove-Item "C:\Users\ADMIN\.paperclip\instances\default\db" -Recurse -Force -ErrorAction SilentlyContinue
   ```
3. **Re-initialize the database cluster with UTF-8**:
   ```powershell
   & "C:\paperclip-pg\bin\initdb.exe" -D "C:\Users\ADMIN\.paperclip\instances\default\db" --encoding=UTF8 --locale=C
   ```
4. **Configure Local Trust Authentication**:
   Verify that `pg_hba.conf` in the initialized folder is set to `trust` for local connection ranges:
   ```
   # TYPE  DATABASE        USER            ADDRESS                 METHOD
   local   all             all                                     trust
   host    all             all             127.0.0.1/32            trust
   host    all             all             ::1/128                 trust
   ```
   *Warning: Do not use trust authentication for production environments.*

## Database Migration & Seeding Verification
Once the UTF-8 database server is running, configure the schema and seed the default workspace using the following commands:

1. **Set the DATABASE_URL environment variable**:
   ```powershell
   $env:DATABASE_URL="postgresql://paperclip@127.0.0.1:54329/paperclip"
   ```
2. **Apply DB migrations**:
   ```powershell
   pnpm --filter @paperclipai/db exec tsx src/migrate.ts
   ```
3. **Seed the AI Dev Factory**:
   ```powershell
   pnpm --filter @paperclipai/db exec tsx src/seed-ai-factory.ts
   ```

*Note: Do not delete the local DB unless explicitly instructed or when resetting for clean verification.*
