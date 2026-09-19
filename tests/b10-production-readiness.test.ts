import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import nextConfig from '../next.config';
import { nominationSchema } from '../lib/validations/nomination';
import { memberSchema } from '../lib/validations/member';
import { contactSchema } from '../lib/validations/contact';
import { newsArticleSchema, updateNewsArticleSchema } from '../lib/validations/news';
import { isResendConfigured, getContactEmail, getEmailFrom } from '../lib/email/config';
import { sendEmail } from '../lib/email/resend';

describe('Phase B10: Production Readiness & Pre-Flight Verification', () => {
  describe('1. Production Security Headers', () => {
    it('configures all 6 required security headers for all routes', async () => {
      expect(nextConfig.headers).toBeDefined();
      const headersConfig = await nextConfig.headers!();
      expect(headersConfig).toHaveLength(1);

      const allRouteConfig = headersConfig[0];
      expect(allRouteConfig.source).toBe('/(.*)');

      const headersMap = new Map(
        allRouteConfig.headers.map((h: { key: string; value: string }) => [h.key, h.value])
      );

      // 1. X-Frame-Options
      expect(headersMap.get('X-Frame-Options')).toBe('DENY');

      // 2. X-Content-Type-Options
      expect(headersMap.get('X-Content-Type-Options')).toBe('nosniff');

      // 3. Referrer-Policy
      expect(headersMap.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');

      // 4. Permissions-Policy
      expect(headersMap.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()');

      // 5. Strict-Transport-Security
      expect(headersMap.get('Strict-Transport-Security')).toBe(
        'max-age=63072000; includeSubDomains; preload'
      );

      // 6. Content-Security-Policy
      const csp = headersMap.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain('https://*.supabase.co');
      expect(csp).toContain('wss://*.supabase.co');
      expect(csp).toContain('https://api.resend.com');
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('2. 404 Route Integrity & Canonical Paths', () => {
    it('contains valid canonical route links in app/not-found.tsx without legacy paths', () => {
      const notFoundPath = path.join(process.cwd(), 'app', 'not-found.tsx');
      const content = fs.readFileSync(notFoundPath, 'utf8');

      // Must contain canonical routes
      expect(content).toContain('href="/structure"');
      expect(content).toContain('href="/get-involved/nominate"');
      expect(content).toContain('href="/get-involved/join"');
      expect(content).toContain('href="/contact"');
      expect(content).toContain('href="/"');

      // Must NOT contain stale legacy routes
      expect(content).not.toContain('href="/positions"');
      expect(content).not.toContain('href="/nominate"');
      expect(content).not.toContain('href="/join"');
    });
  });

  describe('3. Secret Exposure & Environment Audit', () => {
    it('.env.example does not expose secrets or prefix server keys with NEXT_PUBLIC_', () => {
      const examplePath = path.join(process.cwd(), '.env.example');
      const content = fs.readFileSync(examplePath, 'utf8');

      expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY=');
      expect(content).toContain('RESEND_API_KEY=');
      expect(content).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
      expect(content).not.toContain('NEXT_PUBLIC_RESEND_API_KEY');
    });

    it('.gitignore properly excludes local environment files', () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      const content = fs.readFileSync(gitignorePath, 'utf8');

      expect(content).toMatch(/\.env\*\.local|\.env/);
    });

    it('no client component files reference SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY', () => {
      function scanDir(dir: string): string[] {
        const files: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.next') {
            files.push(...scanDir(fullPath));
          } else if (entry.isFile() && /\.(tsx|jsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
        return files;
      }

      const clientFiles = scanDir(path.join(process.cwd(), 'app')).concat(
        scanDir(path.join(process.cwd(), 'components'))
      );

      for (const file of clientFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes("'use client'") || content.includes('"use client"')) {
          expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
          expect(content).not.toContain('RESEND_API_KEY');
        }
      }
    });
  });

  describe('4. Resend Transactional Email Safe Handling', () => {
    it('isResendConfigured and getEmailFrom function predictably', () => {
      expect(typeof isResendConfigured()).toBe('boolean');
      expect(typeof getContactEmail()).toBe('string');
      expect(typeof getEmailFrom()).toBe('string');
    });

    it('sendEmail gracefully skips dispatch when unconfigured without throwing or crashing', async () => {
      const origKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      try {
        const result = await sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
          text: 'Test',
        });

        expect(result.success).toBe(false);
        expect(result.skipped).toBe(true);
        expect(result.error).toContain('Resend API key is not configured');
      } finally {
        if (origKey !== undefined) {
          process.env.RESEND_API_KEY = origKey;
        }
      }
    });
  });

  describe('5. Public Submission Flow Schema Contracts', () => {
    it('nominationSchema validates 35-field nomination payload correctly', () => {
      const validNomination = {
        full_name: 'Kofi Mensah',
        date_of_birth: '1998-04-12',
        gender: 'Male',
        phone_number: '+233241234567',
        email: 'kofi.mensah@example.org',
        region: 'Greater Accra',
        district_municipality: 'Accra Metropolitan',
        town_community: 'Osu',
        occupation: 'Policy Researcher',
        education_level: "Bachelor's Degree",
        area_of_study_profession: 'Political Science & Economics',
        position_applied: 'Minister for Communications',
        has_leadership_experience: true,
        prior_position: 'Youth Coordinator',
        prior_organisation: 'Civic Ghana Initiative',
        prior_duration: '2 years',
        prior_responsibilities: 'Led communications and digital strategy',
        suitability_statement: 'Committed to advancing transparent youth leadership across Ghana.',
        proudest_achievement: 'Organized national voter awareness campaign reaching 5,000 youth.',
        q1_why_serve: 'I wish to serve because the youth represent the cornerstone of democratic renewal and economic transformation in Ghana.',
        q2_leadership_as_service: 'Leadership is fundamentally about serving others with humility, transparency, and accountability to public trust.',
        q3_first_90_days: 'My first 90 days will prioritize establishing regional communication networks and digital engagement channels.',
        q4_recruitment_plan: 'I will mobilize youth through university campus forums, community workshops, and interactive civic spaces.',
        weekly_hours: '15 hours/week',
        willing_online_meetings: true,
        willing_physical_activities: true,
        referee_name: 'Dr. Kwame Asante',
        referee_relationship: 'Former Academic Supervisor',
        referee_phone: '+233209876543',
        declaration_agreed: true,
      };

      const result = nominationSchema.safeParse(validNomination);
      expect(result.success).toBe(true);
    });

    it('memberSchema validates 14-field membership payload correctly', () => {
      const validMember = {
        full_name: 'Ama Serwaa',
        date_of_birth: '2000-08-20',
        gender: 'Female',
        phone_number: '+233501234567',
        email: 'ama.serwaa@example.org',
        region: 'Ashanti',
        district_municipality: 'Kumasi Metropolitan',
        town_community: 'Adum',
        occupation: 'Software Developer',
        education_level: "Bachelor's Degree",
        why_join: 'I believe in the vision of Youth Republic Leadership and want to contribute my skills to community empowerment.',
        availability: '5-10 hours/week',
        engagement_interests: ['community_projects', 'digital_media'],
        civic_acknowledgement: true,
      };

      const result = memberSchema.safeParse(validMember);
      expect(result.success).toBe(true);
    });

    it('contactSchema validates contact message payload correctly', () => {
      const validInquiry = {
        full_name: 'Chioma Eze',
        email: 'chioma@example.org',
        message: 'We would like to request an interview regarding the youth leadership council initiatives.',
      };

      const result = contactSchema.safeParse(validInquiry);
      expect(result.success).toBe(true);
    });

    it('newsArticleSchema validates article creation and update schemas correctly', () => {
      const validArticle = {
        title: 'New Civic Leadership Announcement',
        slug: 'new-civic-leadership-announcement',
        date: '2026-09-19',
        category: 'Announcement',
        author: 'YRL Interim National Secretariat',
        excerpt: 'A comprehensive summary of the new civic leadership announcement.',
        content: [
          'The Youth Republic Leadership is pleased to announce this initiative.',
          'All regional coordinators are urged to mobilize community members.',
        ],
        is_published: true,
      };

      const createResult = newsArticleSchema.safeParse(validArticle);
      expect(createResult.success).toBe(true);

      const updateResult = updateNewsArticleSchema.safeParse({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Updated Civic Announcement',
        is_published: false,
      });
      expect(updateResult.success).toBe(true);
    });
  });
});
