# Troubleshooting Guide

## Prisma Database Connection Errors

### Error: "the URL must start with the protocol `postgresql://` or `postgres://`"

This error occurs when Prisma cannot find or read the `DATABASE_URL` environment variable.

**Solutions:**

1. **Check your .env file exists and has DATABASE_URL:**
   ```bash
   cat .env | grep DATABASE_URL
   ```
   Should show:
   ```
   DATABASE_URL="postgresql://..."
   ```

2. **Restart the dev server:**
   ```bash
   # Stop the current dev server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Regenerate Prisma Client:**
   ```bash
   npx prisma generate
   npm run dev
   ```

5. **Verify environment variables are loaded:**
   - Make sure `.env` is in the project root (not `.env.local` unless you need it)
   - Check that `.env` is not in `.gitignore` (it should be, but the file should exist locally)
   - Ensure no `.env.local` file is overriding with wrong values

6. **If using Turbopack (Next.js 16+):**
   - Turbopack may cache environment variables
   - Always restart the dev server after changing `.env` files
   - Clear `.next` directory if issues persist

### Common Issues:

- **Old SQLite URL in .env.local:** If you have a `.env.local` file with an old SQLite `DATABASE_URL`, it will override `.env`. Delete `.env.local` or update it.

- **Environment variables not loading:** Next.js loads `.env` files automatically, but you must restart the dev server for changes to take effect.

- **Turbopack caching:** Clear `.next` directory and restart.
