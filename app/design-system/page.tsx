import React from 'react';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { PageHeading } from '@/components/ui/PageHeading';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Radio } from '@/components/ui/Radio';
import { Shield, Sparkles, Send, Award, ArrowRight } from 'lucide-react';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 py-12 space-y-16">
      <Container size="lg">
        {/* Page Heading Component Demonstration */}
        <PageHeading
          eyebrow="Development Preview • Phase F2"
          title="YRL Design System & Component Library"
          description="Visual test harness for verifying brand tokens, typography hierarchy, layout containers, buttons, cards, badges, alerts, and accessible form controls."
        />

        <div className="mt-4 p-3 bg-amber-50 border border-[#C9A227]/40 rounded-[6px] text-xs text-amber-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#C9A227] shrink-0" />
          <span>
            <strong>Internal Developer Harness:</strong> This page is strictly for development verification and is not linked in public site navigation.
          </span>
        </div>
      </Container>

      {/* 1. BRAND COLORS */}
      <Section background="white" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">1. Brand Colors &amp; Accents</h2>
            <p className="text-sm text-slate-500">Official YRL civic palette and restrained Ghanaian accents.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Primary Navy */}
            <div className="space-y-2 p-3 rounded-[6px] border border-slate-200 bg-white shadow-xs">
              <div className="h-16 rounded-[4px] bg-[#0B1F3A] flex items-end p-2 text-white font-mono text-xs">
                #0B1F3A
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Primary Navy</p>
                <p className="text-[11px] text-slate-500">Core Brand Color</p>
              </div>
            </div>

            {/* Navy Dark */}
            <div className="space-y-2 p-3 rounded-[6px] border border-slate-200 bg-white shadow-xs">
              <div className="h-16 rounded-[4px] bg-[#061120] flex items-end p-2 text-white font-mono text-xs">
                #061120
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Navy Dark</p>
                <p className="text-[11px] text-slate-500">Deep Contrast / Footer</p>
              </div>
            </div>

            {/* Navy Light */}
            <div className="space-y-2 p-3 rounded-[6px] border border-slate-200 bg-white shadow-xs">
              <div className="h-16 rounded-[4px] bg-[#152E52] flex items-end p-2 text-white font-mono text-xs">
                #152E52
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Navy Light</p>
                <p className="text-[11px] text-slate-500">Interactive Hover</p>
              </div>
            </div>

            {/* Gold Accent */}
            <div className="space-y-2 p-3 rounded-[6px] border border-slate-200 bg-white shadow-xs">
              <div className="h-16 rounded-[4px] bg-[#C9A227] flex items-end p-2 text-[#0B1F3A] font-mono text-xs font-bold">
                #C9A227
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Gold Accent</p>
                <p className="text-[11px] text-slate-500">Seal &amp; Highlights</p>
              </div>
            </div>

            {/* Ghana Red Accent */}
            <div className="space-y-2 p-3 rounded-[6px] border border-slate-200 bg-white shadow-xs">
              <div className="h-16 rounded-[4px] bg-[#CE1126] flex items-end p-2 text-white font-mono text-xs">
                #CE1126
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Ghana Red</p>
                <p className="text-[11px] text-slate-500">Stripe / Error / Motif</p>
              </div>
            </div>

            {/* Ghana Green Accent */}
            <div className="space-y-2 p-3 rounded-[6px] border border-slate-200 bg-white shadow-xs">
              <div className="h-16 rounded-[4px] bg-[#006B3F] flex items-end p-2 text-white font-mono text-xs">
                #006B3F
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Ghana Green</p>
                <p className="text-[11px] text-slate-500">Stripe / Success / Motif</p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 2. TYPOGRAPHY SCALE */}
      <Section background="slate" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">2. Typography Scale</h2>
            <p className="text-sm text-slate-500">Montserrat (Headings) + Inter (Body).</p>
          </div>

          <div className="bg-white p-6 rounded-[6px] border border-slate-200 space-y-6">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Display / Hero</span>
              <p className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B1F3A] tracking-tight font-heading leading-tight">
                A Nation Built by Young Leaders
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Heading 1 (H1)</span>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1F3A] tracking-tight font-heading">
                Civic Governance and Youth Representation
              </h1>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Heading 2 (H2)</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F3A] tracking-tight font-heading">
                16 Regional Leadership Councils
              </h2>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Heading 3 (H3)</span>
              <h3 className="text-xl sm:text-2xl font-semibold text-[#0B1F3A] font-heading">
                Interim Leadership Recruitment Guidelines
              </h3>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-mono">Heading 4 (H4)</span>
              <h4 className="text-lg sm:text-xl font-semibold text-[#0B1F3A] font-heading">
                Eligibility: Young Ghanaians Aged 18–40
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-mono">Body Large</span>
                <p className="text-lg text-slate-700 leading-relaxed">
                  Leadership is service, not privilege. We empower young citizens to actively shape policy and community development.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-mono">Body Regular</span>
                <p className="text-base text-slate-700 leading-relaxed">
                  Youth Republic Leadership (YRL) is an independent, voluntary civic organization. All nominations are completely free of charge.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-mono">Body Small &amp; Caption</span>
                <p className="text-sm text-slate-600 leading-normal">
                  Applicants must not use YRL&apos;s name or position to claim governmental authority.
                </p>
                <p className="text-xs text-slate-500 pt-2">
                  Caption: Data protection complies with Act 843.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 3. BUTTONS */}
      <Section background="white" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">3. Button Variants &amp; States</h2>
            <p className="text-sm text-slate-500">Accessible focus-visible rings, consistent sizing, and clear hierarchy.</p>
          </div>

          <div className="space-y-6 bg-white p-6 rounded-[6px] border border-slate-200">
            {/* Variants */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Variants (Medium Size)</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">
                  <Send className="w-4 h-4" />
                  Primary Action
                </Button>
                <Button variant="secondary">
                  Secondary Action
                </Button>
                <Button variant="outline">
                  Outline Button
                </Button>
                <Button variant="ghost">
                  Ghost Button
                </Button>
                <Button variant="gold">
                  <Sparkles className="w-4 h-4" />
                  Gold Accent
                </Button>
                <Button variant="destructive">
                  Destructive
                </Button>
              </div>
            </div>

            {/* Sizing */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Sizing</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="primary">Small (sm)</Button>
                <Button size="md" variant="primary">Medium (md)</Button>
                <Button size="lg" variant="primary">
                  Large (lg)
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Disabled States */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Disabled State</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled>Primary Disabled</Button>
                <Button variant="secondary" disabled>Secondary Disabled</Button>
                <Button variant="outline" disabled>Outline Disabled</Button>
                <Button variant="gold" disabled>Gold Disabled</Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {/* 4. BADGES */}
      <Section background="slate" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">4. Badges</h2>
            <p className="text-sm text-slate-500">Simple status indicators and civic tags.</p>
          </div>

          <div className="bg-white p-6 rounded-[6px] border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="default">Default Badge</Badge>
              <Badge variant="primary">Primary Navy</Badge>
              <Badge variant="success">Success / Selected</Badge>
              <Badge variant="warning">Warning / Review</Badge>
              <Badge variant="error">Error / Declined</Badge>
              <Badge variant="neutral">Neutral Status</Badge>
              <Badge variant="gold">Gold Accent</Badge>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500 mr-2">Small Size:</span>
              <Badge size="sm" variant="primary">Small Primary</Badge>
              <Badge size="sm" variant="success">Small Success</Badge>
              <Badge size="sm" variant="warning">Small Warning</Badge>
            </div>
          </div>
        </Container>
      </Section>

      {/* 5. CARDS */}
      <Section background="white" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">5. Cards &amp; Structural Panels</h2>
            <p className="text-sm text-slate-500">Bordered, elevated, and flat card variants with optional brand accents.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Standard Bordered with Navy Accent */}
            <Card variant="bordered" accent="navy">
              <CardHeader>
                <Badge variant="primary" size="sm" className="mb-2">National</Badge>
                <CardTitle>Leadership Nomination</CardTitle>
                <CardDescription>Foundational interim leadership council positions.</CardDescription>
              </CardHeader>
              <CardContent>
                Open to committed young Ghanaians passionate about public service, integrity, and sustainable governance.
              </CardContent>
              <CardFooter>
                <span className="text-xs font-semibold text-[#0B1F3A]">100% Free</span>
                <Button size="sm" variant="outline">Learn More</Button>
              </CardFooter>
            </Card>

            {/* Elevated with Ghana Flag Accent */}
            <Card variant="elevated" accent="flag">
              <CardHeader>
                <Badge variant="success" size="sm" className="mb-2">16 Regions</Badge>
                <CardTitle>Regional Representation</CardTitle>
                <CardDescription>Every region actively represented across Ghana.</CardDescription>
              </CardHeader>
              <CardContent>
                Grassroots coordination and community-led initiatives across Ahafo to Western North.
              </CardContent>
              <CardFooter>
                <span className="text-xs text-slate-500">Ages 18–40</span>
                <Button size="sm" variant="primary">Explore Regions</Button>
              </CardFooter>
            </Card>

            {/* Flat with Gold Accent */}
            <Card variant="flat" accent="gold">
              <CardHeader>
                <Badge variant="warning" size="sm" className="mb-2">Voluntary</Badge>
                <CardTitle>Civic Membership</CardTitle>
                <CardDescription>General youth membership and volunteer network.</CardDescription>
              </CardHeader>
              <CardContent>
                Participate in youth parliament debates, community development programs, and policy workshops.
              </CardContent>
              <CardFooter>
                <span className="text-xs text-slate-500">All 16 Regions</span>
                <Button size="sm" variant="gold">Join Network</Button>
              </CardFooter>
            </Card>
          </div>
        </Container>
      </Section>

      {/* 6. ALERTS */}
      <Section background="slate" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">6. Alerts &amp; Civic Notices</h2>
            <p className="text-sm text-slate-500">Accessible status boxes with appropriate ARIA roles and clear iconography.</p>
          </div>

          <div className="space-y-4">
            <Alert variant="info" title="Important Information">
              Youth Republic Leadership (YRL) is an independent, non-partisan, non-governmental civic organization.
            </Alert>

            <Alert variant="success" title="Application Received">
              Your interim leadership nomination has been recorded. All nominations are completely free of charge.
            </Alert>

            <Alert variant="warning" title="Interim Position Notice">
              Interim appointment does not guarantee permanent appointment or election to the same position.
            </Alert>

            <Alert variant="error" title="Submission Warning">
              Please review all required fields before proceeding. Nominations must be submitted by the candidate.
            </Alert>
          </div>
        </Container>
      </Section>

      {/* 7. FORM CONTROLS */}
      <Section background="white" spacing="sm">
        <Container size="lg" className="space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-[#0B1F3A] font-heading">7. Reusable Form Controls</h2>
            <p className="text-sm text-slate-500">Accessible inputs, textareas, selects, checkboxes, and radio buttons with error and disabled states.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-[6px] border border-slate-200">
            {/* Left Column: Text Inputs & Select */}
            <div className="space-y-5">
              <div>
                <Label htmlFor="demo-name" required>Full Name</Label>
                <Input id="demo-name" placeholder="e.g. Kwame Mensah" helperText="Enter your legal full name." />
              </div>

              <div>
                <Label htmlFor="demo-email" required>Email Address</Label>
                <Input id="demo-email" type="email" placeholder="kwame@example.com" />
              </div>

              <div>
                <Label htmlFor="demo-region" required>Region of Residence</Label>
                <Select
                  id="demo-region"
                  placeholder="Select your region"
                  options={[
                    { value: 'greater-accra', label: 'Greater Accra' },
                    { value: 'ashanti', label: 'Ashanti' },
                    { value: 'central', label: 'Central' },
                    { value: 'eastern', label: 'Eastern' },
                    { value: 'northern', label: 'Northern' },
                  ]}
                />
              </div>

              <div>
                <Label htmlFor="demo-bio">Short Statement</Label>
                <Textarea id="demo-bio" placeholder="Describe your interest in youth leadership..." rows={3} />
              </div>
            </div>

            {/* Right Column: Error, Disabled, Checkboxes, Radios */}
            <div className="space-y-5">
              <div>
                <Label htmlFor="demo-error">Field with Validation Error</Label>
                <Input
                  id="demo-error"
                  defaultValue="invalid-email"
                  error="Please enter a valid Ghanaian phone number or email."
                />
              </div>

              <div>
                <Label htmlFor="demo-disabled">Disabled Input State</Label>
                <Input
                  id="demo-disabled"
                  disabled
                  value="System Generated Reference: YRL-2026-001"
                />
              </div>

              <div className="pt-2 space-y-3">
                <Label>Checkboxes</Label>
                <div className="space-y-2">
                  <Checkbox
                    id="cb-declaration"
                    label="I confirm that all provided information is accurate"
                    description="Submission is voluntary and free of charge."
                    defaultChecked
                  />
                  <Checkbox
                    id="cb-disabled"
                    label="Government Employee Confirmation"
                    description="This option is disabled for this demonstration."
                    disabled
                  />
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Label>Radio Buttons</Label>
                <div className="space-y-2">
                  <Radio
                    id="r-lead-yes"
                    name="leadership_exp"
                    label="Yes, I have previous leadership experience"
                    defaultChecked
                  />
                  <Radio
                    id="r-lead-no"
                    name="leadership_exp"
                    label="No prior leadership experience"
                    description="Previous political experience is not a requirement."
                  />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}
