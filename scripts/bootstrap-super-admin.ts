import fs from 'fs';
import path from 'path';

// Parse and load .env.local before Supabase client initializes
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { createAdminClient } from '../lib/supabase/server';

/**
 * Super Admin Bootstrap Script
 * 
 * Secure server-side utility to bootstrap the first Super Admin user.
 * Assigns app_metadata.role = 'super_admin'.
 * 
 * Usage:
 *   SUPER_ADMIN_EMAIL="admin@domain.org" SUPER_ADMIN_PASSWORD="secure_password" pnpm exec tsx scripts/bootstrap-super-admin.ts
 *   OR pass as CLI arguments:
 *   pnpm exec tsx scripts/bootstrap-super-admin.ts <email> <password>
 */
async function bootstrapSuperAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.SUPER_ADMIN_EMAIL || '').trim();
  const password = args[1] || process.env.SUPER_ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('[Error] Missing required credentials.');
    console.error('Usage: pnpm exec tsx scripts/bootstrap-super-admin.ts <email> <password>');
    console.error('Or set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('[Error] Password must be at least 8 characters in length.');
    process.exit(1);
  }

  try {
    const supabase = createAdminClient();

    // 1. Check if user already exists
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[Error] Failed to list existing users:', listError.message);
      process.exit(1);
    }

    const existingUser = userList.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      // Update existing user with super_admin role
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
          app_metadata: {
            ...existingUser.app_metadata,
            role: 'super_admin',
          },
        }
      );

      if (updateError) {
        console.error('[Error] Failed to update existing user to Super Admin:', updateError.message);
        process.exit(1);
      }

      console.log('----------------------------------------------------');
      console.log('Super Admin user updated successfully.');
      console.log(`User ID:   ${updated.user.id}`);
      console.log(`Email:     ${updated.user.email}`);
      console.log(`Role:      ${updated.user.app_metadata.role}`);
      console.log('----------------------------------------------------');
    } else {
      // Create new user with super_admin role
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          role: 'super_admin',
        },
      });

      if (createError) {
        console.error('[Error] Failed to create Super Admin user:', createError.message);
        process.exit(1);
      }

      console.log('----------------------------------------------------');
      console.log('Super Admin user created successfully.');
      console.log(`User ID:   ${created.user.id}`);
      console.log(`Email:     ${created.user.email}`);
      console.log(`Role:      ${created.user.app_metadata.role}`);
      console.log('----------------------------------------------------');
    }
  } catch (err: any) {
    console.error('[Fatal Error] Bootstrap execution failed:', err?.message || err);
    process.exit(1);
  }
}

bootstrapSuperAdmin();
