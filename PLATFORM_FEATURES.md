# Megna Voice Platform - Complete Feature & Function List

## 📋 Table of Contents
1. [Core Platform Features](#core-platform-features)
2. [AI Voice Agents](#ai-voice-agents)
3. [Call Management](#call-management)
4. [CRM & Lead Management](#crm--lead-management)
5. [Campaign Management](#campaign-management)
6. [Knowledge Base](#knowledge-base)
7. [Phone Number Management](#phone-number-management)
8. [Analytics & Reporting](#analytics--reporting)
9. [Billing & Cost Tracking](#billing--cost-tracking)
10. [Real-Time Features](#real-time-features)
11. [Organization & Settings](#organization--settings)
12. [API Endpoints](#api-endpoints)
13. [Database Schema](#database-schema)

---

## Core Platform Features

### Authentication & User Management
- ✅ **Supabase Authentication Integration**
  - User login/signup
  - JWT token-based authentication
  - Session management with secure cookies
  - User profile management
  - Multi-tenant organization isolation

### Multi-Tenancy
- ✅ **Organization-Based Isolation**
  - Complete data isolation per organization
  - Organization-specific rooms for WebSocket
  - Row-level security in database queries
  - Organization whitelabel customization

### User Roles
- ✅ **Role-Based Access Control**
  - Admin
  - Agent Manager
  - Analyst
  - Developer

---

## AI Voice Agents

### Agent Creation & Management
- ✅ **Create AI Agents**
  - Custom agent name and description
  - System prompts and user prompts
  - First message configuration
  - Agent templates (reusable configurations)
  
- ✅ **Voice Configuration**
  - Multiple voice providers:
    - ElevenLabs
    - Google TTS
    - Amazon Polly
    - OpenAI TTS
  - Voice ID selection
  - Language selection (default: en-US)
  - Voice name customization

- ✅ **AI Model Configuration**
  - Provider selection (OpenAI, Anthropic, etc.)
  - Model selection (GPT-4, Claude, etc.)
  - Temperature control (0-2)
  - Max tokens per response
  - Max call duration (seconds)

- ✅ **Advanced Bolna Configuration**
  - Transcriber settings:
    - Provider (Deepgram, etc.)
    - Model selection
    - Language
    - Streaming enabled/disabled
    - Sampling rate
    - Encoding format
    - Endpointing configuration
  - Synthesizer settings:
    - Streaming enabled/disabled
    - Buffer size
    - Audio format
  - Task configuration:
    - Hangup after silence
    - Incremental delay
    - Interruption handling
    - Backchanneling
    - Ambient noise
    - Voicemail detection
    - Call termination settings

- ✅ **Phone Number Assignment**
  - Assign Exotel phone numbers to agents
  - Call forwarding configuration
  - Inbound call setup

- ✅ **Knowledge Base Integration**
  - Link knowledge bases to agents
  - Multiple knowledge bases per agent
  - Automatic RAG (Retrieval Augmented Generation)

### Agent Operations
- ✅ **Agent Sync to Bolna**
  - Automatic sync on creation
  - Manual sync via API
  - Bolna agent ID tracking
  - Config synchronization

- ✅ **Agent Status Management**
  - Active/Inactive status
  - Agent metrics tracking:
    - Total calls
    - Total messages
    - Average rating
    - Last used timestamp

- ✅ **Agent Templates**
  - Create reusable agent templates
  - User-specific templates
  - Template CRUD operations

### Agent Actions
- ✅ **Stop Agent Calls**
  - Stop active agent execution
  - Stop specific call execution
  - Graceful call termination

---

## Call Management

### Call Initiation
- ✅ **Outbound Calls**
  - Initiate calls via API
  - Select AI agent
  - Specify recipient phone number
  - Contact name and lead association
  - Scheduled calls support

- ✅ **Inbound Calls**
  - Automatic inbound call handling
  - Phone number routing to agents
  - Webhook-based call routing

### Call Tracking
- ✅ **Call Status Management**
  - Status tracking: initiated, ringing, in_progress, completed, failed, cancelled
  - Real-time status updates via WebSocket
  - Status normalization from multiple providers

- ✅ **Call Details**
  - Contact information
  - Call direction (inbound/outbound)
  - Call type
  - Duration tracking
  - Start/end timestamps
  - Scheduled time

### Call Recordings & Transcripts
- ✅ **Recording Management**
  - Automatic call recording
  - Recording URL storage
  - Audio playback in UI
  - Download recordings
  - Bolna recording integration

- ✅ **Transcription**
  - Automatic transcription
  - Bolna transcript retrieval
  - Local transcript storage
  - Transcript search and filtering

### Call Analytics
- ✅ **Call Outcomes**
  - Outcome tracking (success, no-answer, busy, etc.)
  - Sentiment analysis
  - AI-generated summaries
  - Custom notes

- ✅ **Call Cost Tracking**
  - Exotel cost per minute
  - Bolna cost per minute
  - Total call cost calculation
  - Cost breakdown display

### Call Operations
- ✅ **Stop Active Calls**
  - Stop in-progress calls
  - Graceful termination
  - Status update to cancelled

- ✅ **Call Polling**
  - Background call status polling
  - Polling statistics
  - Automatic status updates

### Call History
- ✅ **Call List View**
  - Filter by status
  - Search by contact name/phone
  - Sort by date, duration, status
  - Pagination support
  - Export to CSV

- ✅ **Call Detail View**
  - Full call information
  - Transcript display
  - Recording playback
  - Cost breakdown
  - AI summary
  - Notes editing

---

## CRM & Lead Management

### Lead Management
- ✅ **Lead CRUD Operations**
  - Create leads manually
  - Bulk upload via CSV
  - Update lead information
  - Delete leads
  - Lead status management

- ✅ **Lead Information**
  - Contact name, email, phone
  - Company information
  - Lead source tracking
  - Tags and categorization
  - Custom fields (JSON)

- ✅ **Lead Status**
  - Status tracking: new, contacted, qualified, converted, lost
  - Status filtering
  - Status-based workflows

- ✅ **Lead Assignment**
  - Manual agent assignment
  - AI-powered auto-assignment
  - Assignment history
  - Lead-agent matching

- ✅ **Lead Interaction Tracking**
  - Last contacted timestamp
  - Next follow-up scheduling
  - Total calls count
  - Interaction history

- ✅ **AI Lead Features**
  - AI-generated summaries
  - Lead qualification analysis
  - Custom notes
  - Lead scoring (via AI)

### Contact Management
- ✅ **Contact CRUD**
  - Create contacts
  - Bulk contact import
  - Update contact information
  - Contact list view

- ✅ **Contact Information**
  - Name, email, phone
  - Company details
  - Custom fields
  - Tags

### Pipeline Management
- ✅ **Sales Pipeline**
  - Pipeline stages
  - Lead progression tracking
  - Pipeline visualization
  - Stage-based filtering

### Channel Partners
- ✅ **Partner Management**
  - Create channel partners
  - Bulk partner upload
  - Partner information:
    - Name, email, phone
    - Company details
    - Category classification
    - Status tracking
  - Interaction tracking
  - Notes and history

---

## Campaign Management

### Campaign CRUD
- ✅ **Campaign Operations**
  - Create campaigns
  - Update campaign details
  - Delete campaigns
  - Campaign list view

### Campaign Configuration
- ✅ **Campaign Setup**
  - Campaign name and description
  - Status management (draft, active, paused, completed)
  - Start/end date scheduling
  - Lead assignment

### Campaign Execution
- ✅ **Run Campaigns**
  - Bulk outbound calling
  - Lead-to-agent assignment
  - Campaign progress tracking
  - Real-time campaign updates

### Campaign Analytics
- ✅ **Campaign Metrics**
  - Total leads count
  - Completed leads count
  - Campaign completion rate
  - Campaign performance tracking

### Campaign Contacts
- ✅ **Contact Management**
  - Bulk contact upload (CSV/Excel)
  - Contact preview
  - Contact list per campaign
  - Contact assignment

---

## Knowledge Base

### Knowledge Base CRUD
- ✅ **Knowledge Operations**
  - Create knowledge entries
  - Update knowledge content
  - Delete knowledge entries
  - Knowledge list view

### Knowledge Content
- ✅ **Content Types**
  - Text content
  - File uploads (PDF, DOCX, TXT)
  - URL-based content
  - Batch file upload (up to 10 files)

- ✅ **Content Management**
  - Title and description
  - Category classification
  - Tags system
  - Content search
  - Category filtering

### Bolna Integration
- ✅ **Bolna Knowledge Base**
  - Upload to Bolna RAG
  - Sync knowledge to Bolna
  - Link knowledge bases to agents
  - Bolna RAG ID tracking
  - Knowledge base listing from Bolna

### Agent Integration
- ✅ **Agent-Knowledge Linking**
  - Assign knowledge bases to agents
  - Multiple knowledge bases per agent
  - Automatic RAG during calls
  - Knowledge base sync to Bolna

---

## Phone Number Management

### Phone Number CRUD
- ✅ **Number Operations**
  - List phone numbers
  - Sync from Exotel
  - Assign to agents
  - Update number configuration

### Exotel Integration
- ✅ **Exotel Phone Numbers**
  - List Exotel numbers
  - Get number details
  - Provision new numbers
  - Update number configuration
  - Delete/release numbers
  - Available numbers listing

### Number Configuration
- ✅ **Number Settings**
  - Phone number assignment
  - Country code
  - Provider tracking
  - Friendly name
  - Capabilities tracking
  - Status management

### Inbound Call Setup
- ✅ **Inbound Configuration**
  - Setup inbound routing
  - Agent assignment
  - Call forwarding
  - Webhook configuration

---

## Analytics & Reporting

### Dashboard Metrics
- ✅ **Key Performance Indicators**
  - Total calls
  - Total AI agents
  - Active agents
  - Success rate
  - Conversations today
  - Usage cost today
  - Average call duration

### Analytics Metrics
- ✅ **Analytics Data**
  - Total calls
  - Total leads
  - Response rate
  - Conversion rate
  - Time range filtering (7d, 30d, 90d)

### Call Analytics
- ✅ **Call Metrics**
  - Calls over time
  - Duration trends
  - Success rates
  - Time-series charts

### Agent Performance
- ✅ **Agent Analytics**
  - Total calls per agent
  - Successful calls
  - Average duration
  - Success rate
  - Average rating

### Analytics Visualization
- ✅ **Charts & Graphs**
  - Bar charts
  - Line charts
  - Time-series visualization
  - Performance comparisons
  - Export capabilities

---

## Billing & Cost Tracking

### Cost Metrics
- ✅ **Billing Dashboard**
  - Current month total cost
  - Previous month comparison
  - Cost breakdown by date
  - Total minutes
  - Total calls

### Cost Breakdown
- ✅ **Cost Components**
  - Exotel cost (telephony)
  - Bolna cost (AI voice)
  - Markup cost
  - Total cost calculation
  - Per-minute cost tracking

### Usage Tracking
- ✅ **Usage Metrics**
  - Total minutes
  - Total calls
  - Daily usage breakdown
  - Cost trends
  - Usage history

### Credits/Wallet
- ✅ **Credit System**
  - Organization credits balance
  - Real-time credit updates
  - Credit display in UI
  - Credit management

---

## Real-Time Features

### WebSocket Integration
- ✅ **Real-Time Updates**
  - Socket.io integration
  - Organization-specific rooms
  - Multi-tenant isolation
  - Connection management

### Real-Time Events
- ✅ **Event Types**
  - `call:created` - New call initiated
  - `call:updated` - Call status changed
  - `agent:created` - New agent created
  - `agent:updated` - Agent configuration updated
  - `lead:created` - New lead added
  - `lead:updated` - Lead information updated
  - `campaign:created` - New campaign created
  - `campaign:updated` - Campaign updated
  - `campaign:deleted` - Campaign deleted
  - `metrics:updated` - Dashboard metrics changed
  - `organization:updated` - Organization settings updated
  - `phone:created` - Phone number added
  - `phone:updated` - Phone number updated
  - `credits:updated` - Credits balance changed

### Real-Time UI Updates
- ✅ **Auto-Refresh Pages**
  - Dashboard metrics
  - Call history
  - Lead list
  - Campaign list
  - Billing metrics
  - Agent list

---

## Organization & Settings

### Organization Management
- ✅ **Organization CRUD**
  - Get organization details
  - Update organization settings
  - Organization information display

### Whitelabel Configuration
- ✅ **Branding Customization**
  - Company name
  - Logo URL
  - Primary color
  - Real-time whitelabel updates

### User Settings
- ✅ **Profile Management**
  - First name, last name
  - Email address
  - Profile image
  - User preferences

### System Settings
- ✅ **Configuration Options**
  - Webhook URL configuration
  - Email notifications
  - Call alerts
  - Daily summary settings
  - 2FA (Two-Factor Authentication) - UI ready

---

## API Endpoints

### Authentication (4 endpoints)
- `GET /api/auth/user` - Get current user
- `POST /api/login` - User login
- `POST /api/signup` - User signup
- `POST /api/logout` - User logout

### Users (1 endpoint)
- `GET /api/users` - List users in organization

### AI Agents (6 endpoints)
- `GET /api/ai-agents` - List all agents
- `GET /api/ai-agents/:id` - Get agent details
- `POST /api/ai-agents` - Create agent
- `PATCH /api/ai-agents/:id` - Update agent
- `DELETE /api/ai-agents/:id` - Delete agent
- `POST /api/ai-agents/:id/sync` - Sync agent to Bolna

### Agent Templates (4 endpoints)
- `GET /api/agent-templates` - List templates
- `POST /api/agent-templates` - Create template
- `PATCH /api/agent-templates/:id` - Update template
- `DELETE /api/agent-templates/:id` - Delete template

### Calls (8 endpoints)
- `GET /api/calls` - List calls
- `GET /api/calls/my` - Get my calls
- `GET /api/calls/:id` - Get call details
- `GET /api/calls/:id/bolna-details` - Get Bolna call details
- `POST /api/calls` - Create call record
- `POST /api/calls/initiate` - Initiate new call
- `POST /api/calls/:id/stop` - Stop active call
- `PATCH /api/calls/:id` - Update call
- `GET /api/calls/polling/stats` - Get polling statistics

### Phone Numbers (2 endpoints)
- `GET /api/phone-numbers` - List phone numbers
- `GET /api/phone-numbers/sync` - Sync from Exotel

### Knowledge Base (8 endpoints)
- `GET /api/knowledge-base` - List knowledge entries
- `GET /api/knowledge-base/:id` - Get knowledge entry
- `POST /api/knowledge-base` - Create knowledge entry
- `POST /api/knowledge-base/upload-to-bolna` - Upload file to Bolna
- `POST /api/knowledge-base/upload-batch` - Batch upload files
- `POST /api/knowledge-base/agent/:agentId/sync-to-bolna` - Sync agent knowledge
- `PATCH /api/knowledge-base/:id` - Update knowledge entry
- `DELETE /api/knowledge-base/:id` - Delete knowledge entry

### Bolna Integration (7 endpoints)
- `GET /api/bolna/voices` - Get available voices
- `GET /api/bolna/models` - Get available models
- `GET /api/bolna/knowledge-bases` - List Bolna knowledge bases
- `GET /api/bolna/knowledge-bases/:ragId` - Get Bolna knowledge base
- `POST /api/bolna/knowledge-bases` - Create Bolna knowledge base
- `POST /api/bolna/inbound/setup` - Setup inbound calls
- `POST /api/bolna/agents/:agentId/stop` - Stop agent
- `POST /api/bolna/calls/:executionId/stop` - Stop call execution
- `GET /api/bolna/agents/:agentId/executions/:executionId` - Get execution details

### Exotel Integration (10 endpoints)
- `GET /api/exotel/phone-numbers` - List Exotel numbers
- `GET /api/exotel/phone-numbers/:phoneSid` - Get number details
- `POST /api/exotel/phone-numbers/:phoneSid` - Update number
- `GET /api/exotel/available-phone-numbers` - List available numbers
- `POST /api/exotel/provision-phone-number` - Provision new number
- `DELETE /api/exotel/phone-numbers/:phoneSid` - Release number
- `GET /api/exotel/calls` - List Exotel calls
- `GET /api/exotel/calls/:callSid` - Get call details
- `POST /api/exotel/calls` - Make Exotel call
- `POST /api/exotel/sms` - Send SMS
- `POST /api/exotel/sms/bulk` - Send bulk SMS
- `GET /api/exotel/sms` - Get SMS messages
- `GET /api/exotel/whitelist` - Get whitelist
- `POST /api/exotel/whitelist` - Add to whitelist
- `DELETE /api/exotel/whitelist/:whitelistSid` - Remove from whitelist

### Campaigns (5 endpoints)
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns` - Create campaign
- `PATCH /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Leads (7 endpoints)
- `GET /api/leads` - List leads
- `GET /api/leads/my` - Get my leads
- `GET /api/leads/:id` - Get lead details
- `POST /api/leads` - Create lead
- `POST /api/leads/upload` - Bulk upload leads (CSV)
- `POST /api/leads/auto-assign` - AI auto-assign leads
- `PATCH /api/leads/:id` - Update lead

### Contacts (2 endpoints)
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact

### Channel Partners (4 endpoints)
- `GET /api/channel-partners` - List partners
- `GET /api/channel-partners/:id` - Get partner details
- `POST /api/channel-partners` - Create partner
- `POST /api/channel-partners/upload` - Bulk upload partners (CSV)
- `PATCH /api/channel-partners/:id` - Update partner

### Visits (4 endpoints)
- `GET /api/visits` - List visits
- `GET /api/visits/my` - Get my visits
- `POST /api/visits` - Create visit
- `PATCH /api/visits/:id` - Update visit

### Analytics (4 endpoints)
- `GET /api/dashboard/metrics` - Dashboard KPIs
- `GET /api/analytics/metrics` - Analytics metrics
- `GET /api/analytics/calls` - Call analytics
- `GET /api/analytics/agents` - Agent performance
- `GET /api/billing/metrics` - Billing metrics

### Organization (2 endpoints)
- `GET /api/organization` - Get organization
- `PATCH /api/organization/whitelabel` - Update whitelabel

### Webhooks (2 endpoints)
- `POST /api/webhooks/bolna/call-status` - Bolna webhook
- `POST /api/webhooks/exotel/call-status` - Exotel webhook

**Total: 90+ API Endpoints**

---

## Database Schema

### Core Tables
1. **organizations** - Multi-tenant organization data
   - Whitelabel configuration
   - Credits/wallet balance

2. **users** - User accounts
   - Organization association
   - Role management
   - Profile information

3. **ai_agents** - AI voice agent configurations
   - Voice settings
   - AI model configuration
   - Bolna integration
   - Phone number assignment
   - Knowledge base links

4. **phone_numbers** - Virtual phone numbers
   - Exotel integration
   - Agent assignment
   - Status tracking

5. **calls** - Call records
   - Call details
   - Status tracking
   - Recordings and transcripts
   - Cost tracking
   - Integration IDs

6. **leads** - Lead/contact management
   - Contact information
   - Status tracking
   - AI summaries
   - Custom fields

7. **campaigns** - Marketing campaigns
   - Campaign configuration
   - Lead assignment
   - Progress tracking

8. **contacts** - Contact management
   - Contact information
   - Custom fields

9. **channel_partners** - Partner management
   - Partner information
   - Interaction tracking

10. **visits** - Field visit tracking
    - Visit scheduling
    - Notes and summaries

11. **knowledge_base** - AI training documents
    - Content storage
    - File references
    - Agent association

12. **agent_templates** - Reusable agent configurations
    - Template storage
    - User-specific templates

13. **usage_tracking** - Usage analytics
    - Daily metrics
    - Cost tracking

14. **sessions** - Session storage (for auth)

---

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build tool
- Radix UI components
- TailwindCSS styling
- TanStack Query (React Query)
- Wouter routing
- Recharts for charts
- Socket.io-client for WebSocket
- React Hook Form
- Zod validation

### Backend
- Node.js with Express.js
- TypeScript
- Drizzle ORM
- PostgreSQL (via Supabase)
- Socket.io for WebSocket
- Multer for file uploads
- Express-session for sessions

### Integrations
- **Bolna AI** - Voice AI platform
- **Exotel** - Telephony provider
- **Supabase** - Database & Auth
- **OpenAI** - AI enhancements (optional)

---

## Key Features Summary

### ✅ Fully Implemented
- Multi-tenant architecture
- AI voice agent creation and management
- Outbound and inbound call handling
- Real-time WebSocket updates
- Lead and contact management
- Campaign automation
- Knowledge base with RAG
- Phone number management
- Analytics and reporting
- Billing and cost tracking
- Whitelabel customization
- Bulk data import (CSV)
- Call recording and transcription
- AI-powered lead assignment
- Agent templates

### 🔄 Real-Time Capabilities
- Live call status updates
- Dashboard metrics refresh
- Lead list updates
- Campaign progress tracking
- Billing cost updates
- Organization settings sync

### 📊 Analytics Features
- Dashboard KPIs
- Call analytics
- Agent performance metrics
- Cost breakdown
- Usage tracking
- Time-series charts

### 🔐 Security Features
- Multi-tenant data isolation
- JWT authentication
- Row-level security
- Secure session management
- API key management

---

## Total Feature Count

- **90+ API Endpoints**
- **14 Database Tables**
- **15+ Frontend Pages**
- **50+ UI Components**
- **10+ Real-Time Events**
- **4 Major Integrations** (Bolna, Exotel, Supabase, OpenAI)
- **6 Core Modules** (Agents, Calls, Leads, Campaigns, Knowledge Base, Analytics)

---

*Last Updated: Based on codebase analysis*
*Platform Version: 1.0.0*

