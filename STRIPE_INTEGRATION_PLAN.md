# Stripe Integration & Tier System Implementation Plan

## Executive Summary

This document outlines the complete implementation plan for integrating Stripe payments and implementing a three-tier system for the Cadenza application. The pricing strategy is optimized for real music studios (5+ students) with semester-based usage patterns (typically 2x per year). The free tier serves as a demo for teachers to evaluate the software before committing to paid plans.

## Current Architecture Analysis

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS)
- **Authentication**: Supabase Auth
- **Current Tables**: `studios` (teacher-owned lesson groups), `students` (enrolled in studios)
- **Current Limitations**: None - unlimited studios/students per user
- **Missing**: Billing system, API routes, tier limitations

## Proposed Tier Structure

| Feature | Free | Pro ($50/year) | Enterprise (Custom) |
|---------|------|---------------|-------------------|
| Studios | 1 | 50 | Unlimited |
| Students per studio | 10 | 50 | Unlimited |
| Solves per year | 3 | 100 | Unlimited |
| Advanced scheduling | Basic | ✓ | ✓ |
| Analytics dashboard | Basic | Advanced | Advanced + Custom |
| API access | ❌ | Limited | Full |
| Priority support | Basic | Email | Dedicated + Phone |
| Custom branding | ❌ | ❌ | ✓ |
| Export formats | CSV | CSV + PDF | All formats |
| Bulk operations | ❌ | ✓ | ✓ |

---

## Implementation Plan

### Phase 1: Database Schema & Infrastructure (Week 1)
**Estimated Time**: 3-4 days  
**Team Members**: 2 (Backend + Database)

#### 1.1 Database Schema Extension
**Assignee**: Database Engineer  
**Duration**: 2 days  
**Dependencies**: None

- [ ] Create subscription tiers enum
  ```sql
  CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'enterprise');
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'incomplete');
  ```

- [ ] Create `user_profiles` table
  ```sql
  CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id TEXT, -- Stripe subscription ID
    customer_id TEXT, -- Stripe customer ID
    tier subscription_tier DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- [ ] Create `tier_limits` table
  ```sql
  CREATE TABLE tier_limits (
    tier subscription_tier PRIMARY KEY,
    max_studios INTEGER,
    max_students_per_studio INTEGER,
    max_solves_per_year INTEGER,
    api_access BOOLEAN DEFAULT FALSE,
    advanced_features JSONB DEFAULT '{}'
  );
  ```

- [ ] Create `usage_tracking` table
  ```sql
  CREATE TABLE usage_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL, -- 'studio', 'student', 'api_call'
    action TEXT NOT NULL, -- 'create', 'delete', 'update'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
  );
  ```

- [ ] Add RLS policies for new tables
- [ ] Create indexes for performance
- [ ] Add triggers for `updated_at` timestamps
- [ ] Create usage tracking triggers on studios/students

#### 1.2 Environment Configuration
**Assignee**: DevOps Engineer  
**Duration**: 1 day  
**Dependencies**: None

- [ ] Add Stripe environment variables to `.env.example`
  ```
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  ```

- [ ] Configure Stripe webhooks in dashboard
- [ ] Set up environment variables in deployment (Vercel/etc.)
- [ ] Configure CORS for API routes

### Phase 2: Core Types & Utilities (Week 1-2)
**Estimated Time**: 2-3 days  
**Team Members**: 1-2 (Frontend)

#### 2.1 TypeScript Types & Interfaces
**Assignee**: Frontend Lead  
**Duration**: 1 day  
**Dependencies**: Database schema

- [ ] Create subscription types in `lib/types.ts`
  ```typescript
  export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
  export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';
  
  export interface UserProfile {
    id: string;
    subscription_id?: string;
    customer_id?: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    current_period_end?: Date;
  }
  
  export interface TierLimits {
    tier: SubscriptionTier;
    max_studios: number | null; // null = unlimited
    max_students_per_studio: number | null;
    max_solves_per_year: number | null;
    api_access: boolean;
    advanced_features: Record<string, boolean>;
  }
  ```

- [ ] Add Stripe types
  ```typescript
  export interface StripeProduct {
    id: string;
    name: string;
    description?: string;
    price: number;
    interval: 'month' | 'year';
    tier: SubscriptionTier;
  }
  ```

#### 2.2 Utility Functions
**Assignee**: Frontend Engineer  
**Duration**: 2 days  
**Dependencies**: Types

- [ ] Create `lib/stripe/utils.ts`
  ```typescript
  export const getTierLimits = (tier: SubscriptionTier): TierLimits => { ... }
  export const canCreateStudio = (userProfile: UserProfile, currentStudios: number): boolean => { ... }
  export const canAddStudent = (userProfile: UserProfile, currentStudents: number): boolean => { ... }
  export const formatSubscriptionStatus = (status: SubscriptionStatus): string => { ... }
  ```

- [ ] Create `lib/hooks/useSubscription.ts` hook
  ```typescript
  export const useSubscription = () => {
    // Fetch user profile and subscription status
    // Return tier limits, usage, and helper functions
  }
  ```

### Phase 3: Stripe Integration Core (Week 2)
**Estimated Time**: 3-4 days  
**Team Members**: 2 (Backend + Full-stack)

#### 3.1 Stripe Server Setup
**Assignee**: Backend Engineer  
**Duration**: 2 days  
**Dependencies**: Environment setup

- [ ] Install Stripe dependencies
  ```bash
  pnpm add stripe @stripe/stripe-js
  pnpm add -D @types/stripe
  ```

- [ ] Create `lib/stripe/server.ts`
  ```typescript
  import Stripe from 'stripe';
  export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  ```

- [ ] Create `lib/stripe/config.ts` with product/price configurations
- [ ] Set up Stripe products and prices in dashboard
- [ ] Create helper functions for customer/subscription management

#### 3.2 Webhook Handler
**Assignee**: Full-stack Engineer  
**Duration**: 2 days  
**Dependencies**: Stripe setup

- [ ] Create `src/app/api/webhooks/stripe/route.ts`
- [ ] Handle webhook events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`

- [ ] Implement webhook signature verification
- [ ] Update `user_profiles` table based on webhook events
- [ ] Add comprehensive error handling and logging
- [ ] Test webhook handling with Stripe CLI

### Phase 4: Subscription Management APIs (Week 2-3)
**Estimated Time**: 4 days  
**Team Members**: 2 (Backend)

#### 4.1 Subscription API Routes
**Assignee**: Backend Engineer  
**Duration**: 3 days  
**Dependencies**: Stripe integration core

- [ ] Create `src/app/api/subscriptions/route.ts`
  - [ ] GET: Fetch user's subscription details
  - [ ] POST: Create new subscription

- [ ] Create `src/app/api/subscriptions/cancel/route.ts`
  - [ ] POST: Cancel subscription

- [ ] Create `src/app/api/subscriptions/portal/route.ts`
  - [ ] POST: Generate Stripe customer portal URL

- [ ] Create `src/app/api/subscriptions/checkout/route.ts`
  - [ ] POST: Create Stripe checkout session

- [ ] Add authentication middleware to all routes
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Add request/response validation with Zod

#### 4.2 Usage Tracking APIs
**Assignee**: Backend Engineer  
**Duration**: 1 day  
**Dependencies**: Database schema

- [ ] Create `src/app/api/usage/route.ts`
  - [ ] GET: Fetch user's current usage statistics

- [ ] Implement usage tracking functions
- [ ] Add usage increment functions (called on resource creation)

#### 4.3 Homepage Integration API Endpoints
**Assignee**: Backend Engineer  
**Duration**: 1 day  
**Dependencies**: Subscription API routes

- [ ] Create `src/app/api/contact/enterprise/route.ts`
  - [ ] POST: Handle enterprise inquiry form submissions
  - [ ] Send email notifications to sales team
  - [ ] Store inquiries in database for follow-up
  - [ ] Return confirmation message

- [ ] Update `src/app/api/subscriptions/checkout/route.ts`
  - [ ] Add tier validation (ensure only 'pro' tier for now)
  - [ ] Handle unauthenticated users (return 401 with clear message)
  - [ ] Add success/cancel URL configuration
  - [ ] Set up proper metadata for tracking conversions

- [ ] Create user profile initialization endpoint
  - [ ] Auto-assign free tier on new user registration
  - [ ] Handle tier parameter from signup flow
  - [ ] Initialize usage tracking for new users

### Phase 5: Frontend Subscription Management (Week 3-4)
**Estimated Time**: 5-6 days  
**Team Members**: 2 (Frontend)

#### 5.1 Homepage Button Integration
**Assignee**: Frontend Engineer  
**Duration**: 1 day  
**Dependencies**: Authentication system, API routes

- [ ] Update homepage pricing buttons with proper click handlers
  ```typescript
  // Try Free Button Flow
  const handleTryFree = () => {
    // Redirect to signup with free tier parameter
    router.push('/signup?tier=free');
  };
  
  // Get Pro Button Flow  
  const handleGetPro = async () => {
    if (!user) {
      // Store intent and redirect to login
      localStorage.setItem('pendingSubscription', 'pro');
      router.push('/login?redirect=checkout');
    } else {
      // Create checkout session and redirect to Stripe
      const response = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' })
      });
      const { url } = await response.json();
      window.location.href = url;
    }
  };
  
  // Contact Sales Button Flow
  const handleContactSales = () => {
    // Redirect to enterprise contact form
    router.push('/contact?plan=enterprise');
  };
  ```

- [ ] Add loading states to buttons during checkout creation
- [ ] Add error handling for failed checkout creation
- [ ] Update button styles to indicate clickable actions

#### 5.2 Authentication Flow Integration
**Assignee**: Frontend Engineer  
**Duration**: 1 day  
**Dependencies**: Homepage button integration

- [ ] Update signup flow to handle tier parameter
  ```typescript
  // In signup page: /signup?tier=free
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tier = urlParams.get('tier');
    if (tier === 'free') {
      // Pre-select free tier and auto-assign after signup
      setSelectedTier('free');
    }
  }, []);
  ```

- [ ] Update login flow to handle pending subscriptions
  ```typescript
  // In login success callback
  useEffect(() => {
    const pendingSubscription = localStorage.getItem('pendingSubscription');
    if (pendingSubscription && user) {
      localStorage.removeItem('pendingSubscription');
      // Redirect to checkout for the pending subscription
      router.push(`/checkout?tier=${pendingSubscription}`);
    }
  }, [user]);
  ```

- [ ] Create post-signup tier assignment logic
- [ ] Add tier assignment to user profile creation

#### 5.3 Enterprise Contact Form
**Assignee**: Frontend Engineer  
**Duration**: 1 day  
**Dependencies**: Basic form infrastructure

- [ ] Create `src/app/contact/page.tsx`
- [ ] Design enterprise inquiry form with fields:
  - [ ] Name, Email, Company/Institution
  - [ ] Number of instructors/departments
  - [ ] Estimated student count
  - [ ] Current scheduling solution
  - [ ] Timeline for implementation
  - [ ] Additional requirements/notes

- [ ] Add form validation with Zod
- [ ] Create API endpoint for form submission
- [ ] Set up email notifications for enterprise inquiries
- [ ] Add confirmation page/message after submission

#### 5.4 Pricing Page
**Assignee**: Frontend Lead  
**Duration**: 2 days  
**Dependencies**: Types, API routes, button integration

- [ ] Create `src/app/pricing/page.tsx`
- [ ] Design responsive pricing table
- [ ] Add feature comparison matrix
- [ ] Implement "Choose Plan" buttons with same logic as homepage
- [ ] Add FAQ section addressing common pricing questions
- [ ] Add testimonials/social proof

#### 5.5 Subscription Management UI
**Assignee**: Frontend Engineer  
**Duration**: 3 days  
**Dependencies**: Pricing page, API routes

- [ ] Create `src/components/SubscriptionStatus.tsx`
  - [ ] Display current tier and status
  - [ ] Show usage vs. limits with progress bars
  - [ ] Add upgrade/downgrade buttons

- [ ] Create `src/components/BillingManager.tsx`
  - [ ] Subscription details
  - [ ] Payment method management
  - [ ] Billing history
  - [ ] Cancel subscription flow

- [ ] Update `src/components/Navbar.tsx`
  - [ ] Add subscription status indicator
  - [ ] Add billing management link

- [ ] Add billing management to user dropdown/profile

#### 5.6 Upgrade Prompts & Tier Gates
**Assignee**: Frontend Engineer  
**Duration**: 2 days  
**Dependencies**: Subscription management UI

- [ ] Create `src/components/TierGate.tsx`
  ```typescript
  interface TierGateProps {
    requiredTier: SubscriptionTier;
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }
  ```

- [ ] Create upgrade prompt modals
- [ ] Add contextual upgrade prompts throughout app:
  - [ ] Studio creation limit reached
  - [ ] Student limit reached
  - [ ] Advanced features locked

### Phase 6: Feature Gating Implementation (Week 4-5)
**Estimated Time**: 3-4 days  
**Team Members**: 2 (Full-stack)

#### 6.1 Server-Side Enforcement
**Assignee**: Full-stack Engineer  
**Duration**: 2 days  
**Dependencies**: All previous phases

- [ ] Add tier checking middleware to protected routes
- [ ] Implement server-side validation for:
  - [ ] Studio creation (`/api/studios`)
  - [ ] Student enrollment (`/api/students`)
  - [ ] Advanced scheduling features

- [ ] Update Supabase RLS policies to include tier restrictions
- [ ] Add usage increment tracking to all resource creation endpoints

#### 6.2 Client-Side Feature Gating
**Assignee**: Frontend Engineer  
**Duration**: 2 days  
**Dependencies**: TierGate component

- [ ] Wrap studio creation with `TierGate`
- [ ] Wrap student enrollment with usage checks
- [ ] Hide/disable advanced features based on tier
- [ ] Update UI to show locked features with upgrade prompts
- [ ] Add visual indicators for tier-locked features

#### 6.3 Advanced Features by Tier
**Assignee**: Full-stack Engineer  
**Duration**: 2 days  
**Dependencies**: Feature gating infrastructure

**Pro Tier Features:**
- [ ] Advanced scheduling algorithms
- [ ] Bulk student operations
- [ ] Enhanced analytics dashboard
- [ ] PDF export for schedules
- [ ] Email notifications

**Enterprise Tier Features:**
- [ ] API access with rate limiting
- [ ] Custom branding options
- [ ] Advanced export formats (Excel, JSON)
- [ ] Priority support ticketing system
- [ ] Custom integrations

### Phase 7: Analytics & Monitoring (Week 5-6)
**Estimated Time**: 2-3 days  
**Team Members**: 1 (Full-stack)

#### 7.1 Usage Analytics
**Assignee**: Full-stack Engineer  
**Duration**: 2 days  
**Dependencies**: Usage tracking

- [ ] Create analytics dashboard for users
  - [ ] Usage statistics over time
  - [ ] Feature usage breakdown
  - [ ] Subscription value demonstration

- [ ] Create admin analytics
  - [ ] Subscription metrics
  - [ ] Churn analysis
  - [ ] Feature adoption rates

#### 7.2 Monitoring & Alerting
**Assignee**: DevOps/Full-stack Engineer  
**Duration**: 1 day  
**Dependencies**: Infrastructure

- [ ] Set up Stripe webhook monitoring
- [ ] Add payment failure alerts
- [ ] Monitor subscription lifecycle events
- [ ] Set up usage limit alerts
- [ ] Performance monitoring for billing-related endpoints

### Phase 8: Testing & Quality Assurance (Week 6)
**Estimated Time**: 3-4 days  
**Team Members**: 2-3 (All team members)

#### 8.1 Integration Testing
**Assignee**: All team members  
**Duration**: 2 days  
**Dependencies**: Complete implementation

- [ ] Test Stripe webhook handling
- [ ] Test subscription lifecycle (create, update, cancel)
- [ ] Test tier enforcement across all features
- [ ] Test usage tracking accuracy
- [ ] Test upgrade/downgrade flows

#### 8.2 End-to-End Testing
**Assignee**: QA Engineer  
**Duration**: 2 days  
**Dependencies**: Integration testing

- [ ] User registration → free tier
- [ ] Upgrade to pro → feature unlocking
- [ ] Usage limit enforcement
- [ ] Billing management flows
- [ ] Subscription cancellation
- [ ] Data retention after cancellation

#### 8.3 Edge Case Testing
**Assignee**: All team members  
**Duration**: 1 day  
**Dependencies**: E2E testing

- [ ] Payment failures and retries
- [ ] Webhook delivery failures
- [ ] Concurrent usage limit checks
- [ ] Subscription downgrade data handling
- [ ] Timezone handling for billing periods

### Phase 9: Documentation & Deployment (Week 7)
**Estimated Time**: 2-3 days  
**Team Members**: 2 (All team members)

#### 9.1 Documentation
**Assignee**: Technical Writer/Developer  
**Duration**: 2 days  
**Dependencies**: Complete implementation

- [ ] API documentation for subscription endpoints
- [ ] User guide for billing management
- [ ] Admin guide for subscription monitoring
- [ ] Developer documentation for tier system
- [ ] Deployment guide for Stripe configuration

#### 9.2 Production Deployment
**Assignee**: DevOps Engineer  
**Duration**: 1 day  
**Dependencies**: Documentation, testing

- [ ] Production Stripe configuration
- [ ] Database migration to production
- [ ] Environment variable configuration
- [ ] Webhook endpoint verification
- [ ] Monitoring dashboard setup
- [ ] Rollback plan preparation

---

## GANTT Chart

```
Week 1: Database & Infrastructure Foundation
├── Days 1-2: Database Schema Extension (DB Engineer)
├── Day 1: Environment Configuration (DevOps)
├── Day 3: TypeScript Types (Frontend Lead)
├── Days 4-5: Utility Functions (Frontend Engineer)

Week 2: Stripe Integration Core
├── Days 1-2: Stripe Server Setup (Backend Engineer)
├── Days 1-2: Webhook Handler (Full-stack Engineer)
├── Days 3-5: Subscription API Routes (Backend Engineer)
├── Day 5: Usage Tracking APIs (Backend Engineer)

Week 3: Frontend Foundation
├── Day 1: Homepage Button Integration (Frontend Engineer)
├── Day 2: Authentication Flow Integration (Frontend Engineer)
├── Day 3: Enterprise Contact Form (Frontend Engineer)
├── Days 4-5: Pricing Page (Frontend Lead)

Week 4: Frontend Subscription Management
├── Days 1-3: Subscription Management UI (Frontend Engineer)
├── Days 4-5: Upgrade Prompts & Tier Gates (Frontend Engineer)

Week 5: Feature Implementation
├── Days 1-2: Server-Side Enforcement (Full-stack Engineer)
├── Days 1-2: Client-Side Feature Gating (Frontend Engineer)
├── Days 3-4: Advanced Features by Tier (Full-stack Engineer)

Week 6: Analytics & Polish
├── Days 1-2: Usage Analytics (Full-stack Engineer)
├── Day 3: Monitoring & Alerting (DevOps Engineer)
├── Days 4-5: UI Polish & Edge Cases (Frontend Team)

Week 7: Testing Phase
├── Days 1-2: Integration Testing (All team members)
├── Days 3-4: End-to-End Testing (QA Engineer)
├── Day 5: Edge Case Testing (All team members)

Week 8: Documentation & Launch
├── Days 1-2: Documentation (Technical Writer)
├── Day 3: Production Deployment (DevOps)
├── Days 4-5: Launch Monitoring & Bug Fixes (All team members)
```

## Resource Requirements

### Team Composition
- **1 Database Engineer** - Schema design and optimization
- **1 Backend Engineer** - API development and Stripe integration
- **1 Full-stack Engineer** - Feature implementation and testing
- **1 Frontend Lead** - UI architecture and core components
- **1 Frontend Engineer** - Component implementation and styling
- **1 DevOps Engineer** - Infrastructure and deployment
- **1 QA Engineer** - Testing and quality assurance

### External Dependencies
- **Stripe Account** - Business verification and product setup
- **Production Database** - Supabase Pro plan recommended
- **Monitoring Tools** - Error tracking (Sentry) and analytics
- **CDN/Performance** - For static assets and global performance

## Risk Mitigation

### Technical Risks
1. **Webhook Reliability** - Implement retry mechanisms and monitoring
2. **Race Conditions** - Use database transactions for usage tracking
3. **Stripe API Changes** - Pin SDK versions and monitor changelog
4. **Database Performance** - Add proper indexes and query optimization

### Business Risks
1. **Pricing Strategy** - A/B test different price points
2. **Feature Adoption** - Monitor usage analytics closely
3. **Churn Prevention** - Implement retention strategies and feedback loops

### Security Considerations
1. **Webhook Verification** - Always verify Stripe webhook signatures
2. **Customer Data Protection** - Ensure PCI compliance
3. **Access Control** - Implement proper tier-based authorization
4. **API Rate Limiting** - Prevent abuse and ensure fair usage

## Success Metrics

### Technical Metrics
- [ ] 99.9% webhook processing success rate
- [ ] <200ms average API response time
- [ ] Zero security vulnerabilities
- [ ] 100% test coverage for billing logic

### Business Metrics
- [ ] Conversion rate from free to paid: Target 5-10%
- [ ] Monthly churn rate: Target <5%
- [ ] Average revenue per user (ARPU): Target $19-25
- [ ] Customer satisfaction: Target >4.5/5

## Post-Launch Roadmap

### Month 1-2: Optimization
- [ ] A/B testing for pricing and features
- [ ] Performance optimization based on usage patterns
- [ ] User feedback integration and UI improvements
- [ ] Advanced analytics and reporting

### Month 3-6: Expansion
- [ ] Annual billing discounts
- [ ] Team/organization accounts
- [ ] Additional integrations (Google Calendar, Outlook)
- [ ] Mobile app tier considerations

### Month 6+: Enterprise Features
- [ ] SSO integration
- [ ] Advanced API endpoints
- [ ] White-label solutions
- [ ] Custom reporting and analytics

---

## Getting Started

To begin implementation:

1. **Week 1**: Kick off with database schema design and environment setup
2. **Assign ownership**: Each team member should own their specific components
3. **Daily standups**: Track progress against this timeline
4. **Weekly reviews**: Assess progress and adjust timelines as needed

**Estimated Total Effort**: 40-45 developer days across 8 weeks

**Estimated Budget**: 
- Development: $50,000-70,000 (depending on team rates)
- Stripe fees: 2.9% + 30¢ per transaction
- Infrastructure: ~$500-1000/month additional costs

**Pricing Strategy Notes**:
- Free tier (10 students, 3 solves) positioned as demo for teachers
- Pro tier ($50/year) targets individual teachers with realistic studio sizes
- Enterprise tier targets music departments and larger institutions
- Annual billing aligns with semester-based usage patterns (typically 2x/year)

This plan provides a comprehensive roadmap for implementing a production-ready Stripe integration with a robust tier system that can scale with your business growth.