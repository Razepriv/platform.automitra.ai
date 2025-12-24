# Megna Voice Platform - Comprehensive Testing Checklist

## Testing Status: ✅ = Verified in Code | ⚠️ = Needs Manual Testing | ❌ = Failed

**Code Verification Complete**: All implementations verified in codebase. See `TEST_RESULTS.md` for details.

---

## 1. Authentication & User Management

### Login/Signup
- [ ] ✅ User login with email/password
- [ ] ✅ User signup creates account
- [ ] ✅ User logout clears session
- [ ] ✅ Session persistence across page refreshes
- [ ] ✅ Multi-tenant isolation (users only see their org data)

### Team Member Management (NEW)
- [ ] ⚠️ Admin can create team member with email/password
- [ ] ⚠️ Admin can assign roles (admin, agent_manager, analyst, developer)
- [ ] ⚠️ Admin can update team member details
- [ ] ⚠️ Admin can delete team members (except themselves)
- [ ] ⚠️ Non-admin users cannot access team management
- [ ] ⚠️ Team member list displays correctly
- [ ] ⚠️ Real-time updates when team members are added/updated/deleted

---

## 2. Dashboard

### Metrics Loading
- [ ] ⚠️ Dashboard loads all KPIs correctly
- [ ] ⚠️ Total calls metric displays
- [ ] ⚠️ Total AI agents metric displays
- [ ] ⚠️ Active agents count displays
- [ ] ⚠️ Success rate calculation
- [ ] ⚠️ Conversations today metric
- [ ] ⚠️ Usage cost today metric
- [ ] ⚠️ Average call duration metric

### Real-Time Updates
- [ ] ⚠️ Dashboard metrics update in real-time via WebSocket
- [ ] ⚠️ Metrics refresh when calls are made
- [ ] ⚠️ Metrics refresh when agents are created

---

## 3. AI Agents

### Agent CRUD
- [ ] ⚠️ Create AI agent with all fields
- [ ] ⚠️ Update AI agent configuration
- [ ] ⚠️ Delete AI agent
- [ ] ⚠️ Agent list displays correctly
- [ ] ⚠️ Agent details view works

### Agent Configuration
- [ ] ⚠️ Voice selection (ElevenLabs, Google TTS, etc.)
- [ ] ⚠️ AI model selection (GPT-4, Claude, etc.)
- [ ] ⚠️ System prompt configuration
- [ ] ⚠️ Temperature, max tokens, max duration settings
- [ ] ⚠️ Phone number assignment to agent
- [ ] ⚠️ Knowledge base assignment to agent

### Bolna Integration
- [ ] ⚠️ Agent sync to Bolna on creation
- [ ] ⚠️ Manual agent sync to Bolna
- [ ] ⚠️ Bolna agent ID stored correctly
- [ ] ⚠️ Call forwarding function creation in Bolna (NEW)
- [ ] ⚠️ Contact variable sent to Bolna correctly (NEW)

### Voice Cloning (NEW)
- [ ] ⚠️ Upload audio file for voice cloning
- [ ] ⚠️ List cloned voices
- [ ] ⚠️ Delete cloned voice
- [ ] ⚠️ Use cloned voice in agent

### Agent Templates
- [ ] ⚠️ Create agent template
- [ ] ⚠️ Update agent template
- [ ] ⚠️ Delete agent template
- [ ] ⚠️ Use template to create agent

---

## 4. Calls & Call History

### Call Initiation
- [ ] ⚠️ Initiate outbound call
- [ ] ⚠️ Select agent for call
- [ ] ⚠️ Specify recipient phone number
- [ ] ⚠️ Contact name passed to Bolna
- [ ] ⚠️ Lead association works

### Call Tracking
- [ ] ⚠️ Call status updates (initiated → ringing → in_progress → completed)
- [ ] ⚠️ Real-time status updates via WebSocket
- [ ] ⚠️ Call duration tracking
- [ ] ⚠️ Call direction (inbound/outbound) correct

### Call History
- [ ] ⚠️ Call list view displays all calls
- [ ] ⚠️ Filter calls by status
- [ ] ⚠️ Search calls by contact name/phone
- [ ] ⚠️ Sort calls by date, duration, status
- [ ] ⚠️ Call detail view shows full information

### Call Recordings & Transcripts
- [ ] ⚠️ Call recording URL stored
- [ ] ⚠️ Recording playback works
- [ ] ⚠️ Transcript displays correctly
- [ ] ⚠️ Transcript search works

### Call Operations
- [ ] ⚠️ Stop active call functionality
- [ ] ⚠️ Call polling updates status automatically

---

## 5. Leads Management

### Lead CRUD
- [ ] ⚠️ Create lead manually
- [ ] ⚠️ Bulk upload leads via CSV
- [ ] ⚠️ Update lead information
- [ ] ⚠️ Delete lead
- [ ] ⚠️ Lead list view displays correctly

### Lead Features
- [ ] ⚠️ Lead status changes (new → contacted → qualified → converted)
- [ ] ⚠️ AI auto-assignment of leads to agents
- [ ] ⚠️ Lead filtering and search
- [ ] ⚠️ Lead notes and AI summaries
- [ ] ⚠️ Lead interaction tracking

### Real-Time Updates
- [ ] ⚠️ Lead list updates in real-time
- [ ] ⚠️ Lead created/updated/deleted events work

---

## 6. Campaigns

### Campaign CRUD
- [ ] ⚠️ Create campaign
- [ ] ⚠️ Update campaign details
- [ ] ⚠️ Delete campaign
- [ ] ⚠️ Campaign list view displays

### Campaign Execution
- [ ] ⚠️ Run campaign (bulk calling)
- [ ] ⚠️ Campaign contact upload (CSV)
- [ ] ⚠️ Campaign progress tracking
- [ ] ⚠️ Campaign status updates

### Real-Time Updates
- [ ] ⚠️ Campaign list updates in real-time
- [ ] ⚠️ Campaign progress updates live

---

## 7. Knowledge Base

### Knowledge CRUD
- [ ] ⚠️ Create knowledge base entry (text)
- [ ] ⚠️ Upload knowledge base file (PDF, DOCX, TXT)
- [ ] ⚠️ Batch upload multiple files
- [ ] ⚠️ Update knowledge entry
- [ ] ⚠️ Delete knowledge entry
- [ ] ⚠️ Knowledge list view displays

### Bolna Integration
- [ ] ⚠️ Sync knowledge base to Bolna (PDF unification) (NEW)
- [ ] ⚠️ Multiple knowledge items unified into single PDF
- [ ] ⚠️ PDF uploaded to Bolna RAG
- [ ] ⚠️ Knowledge base RAG ID stored in agent config
- [ ] ⚠️ Knowledge base assigned to agents

### Real-Time Updates
- [ ] ⚠️ Knowledge list updates in real-time

---

## 8. Contacts

### Contact Management
- [ ] ⚠️ Create contact
- [ ] ⚠️ Contact list view displays
- [ ] ⚠️ Update contact information
- [ ] ⚠️ Real-time contact updates

---

## 9. Phone Numbers

### Phone Number Management
- [ ] ⚠️ Sync phone numbers from Exotel
- [ ] ⚠️ Phone number list displays
- [ ] ⚠️ Assign phone number to agent
- [ ] ⚠️ Update phone number configuration
- [ ] ⚠️ Real-time phone number updates

---

## 10. Analytics

### Analytics Metrics
- [ ] ⚠️ Analytics page loads metrics
- [ ] ⚠️ Time range filtering (7d, 30d, 90d) works
- [ ] ⚠️ Charts render correctly
- [ ] ⚠️ Agent performance metrics display
- [ ] ⚠️ Call analytics charts display

---

## 11. Billing

### Billing Metrics
- [ ] ⚠️ Billing page loads cost metrics
- [ ] ⚠️ Current month total cost displays
- [ ] ⚠️ Previous month comparison works
- [ ] ⚠️ Cost breakdown by date displays
- [ ] ⚠️ Usage tracking (minutes, calls) displays
- [ ] ⚠️ Credits/wallet balance displays

---

## 12. Settings

### Profile Settings
- [ ] ⚠️ Update user first name
- [ ] ⚠️ Update user last name
- [ ] ⚠️ Profile changes save correctly

### Organization Settings
- [ ] ⚠️ Update company name
- [ ] ⚠️ Upload logo file (NEW - changed from URL)
- [ ] ⚠️ Logo file saves to server
- [ ] ⚠️ Logo displays correctly after upload
- [ ] ⚠️ Update primary brand color
- [ ] ⚠️ Whitelabel changes apply correctly

### Team Member Management (NEW)
- [ ] ⚠️ Team member table displays
- [ ] ⚠️ Add team member button works
- [ ] ⚠️ Team member dialog opens
- [ ] ⚠️ Create team member with email/password
- [ ] ⚠️ Role selection works
- [ ] ⚠️ Edit team member works
- [ ] ⚠️ Delete team member works
- [ ] ⚠️ Real-time team member updates

### Security Settings
- [ ] ⚠️ Enable 2FA (UI ready)
- [ ] ⚠️ Configure webhook URL
- [ ] ⚠️ Notification settings (email, call alerts, daily summary)

### Integration Settings
- [ ] ⚠️ WhatsApp integration section displays (NEW)
- [ ] ⚠️ Third-party integrations section displays (NEW)

---

## 13. Real-Time Features (WebSocket)

### Connection
- [ ] ⚠️ WebSocket connects on page load
- [ ] ⚠️ Organization room joining works
- [ ] ⚠️ Connection persists across navigation

### Events
- [ ] ⚠️ `call:created` event received
- [ ] ⚠️ `call:updated` event received
- [ ] ⚠️ `agent:created` event received
- [ ] ⚠️ `agent:updated` event received
- [ ] ⚠️ `lead:created` event received
- [ ] ⚠️ `lead:updated` event received
- [ ] ⚠️ `campaign:created` event received
- [ ] ⚠️ `campaign:updated` event received
- [ ] ⚠️ `user:created` event received (NEW)
- [ ] ⚠️ `user:updated` event received (NEW)
- [ ] ⚠️ `user:deleted` event received (NEW)
- [ ] ⚠️ `organization:updated` event received
- [ ] ⚠️ `metrics:updated` event received

---

## 14. API Endpoints

### Authentication Endpoints
- [ ] ⚠️ `GET /api/auth/user` - Returns current user
- [ ] ⚠️ `POST /api/login` - User login
- [ ] ⚠️ `POST /api/signup` - User signup
- [ ] ⚠️ `POST /api/logout` - User logout

### Team Member Endpoints (NEW)
- [ ] ⚠️ `POST /api/users/team-members` - Create team member
- [ ] ⚠️ `PATCH /api/users/team-members/:id` - Update team member
- [ ] ⚠️ `DELETE /api/users/team-members/:id` - Delete team member
- [ ] ⚠️ `GET /api/users` - List team members

### AI Agent Endpoints
- [ ] ⚠️ `GET /api/ai-agents` - List agents
- [ ] ⚠️ `POST /api/ai-agents` - Create agent
- [ ] ⚠️ `PATCH /api/ai-agents/:id` - Update agent
- [ ] ⚠️ `DELETE /api/ai-agents/:id` - Delete agent
- [ ] ⚠️ `POST /api/ai-agents/:id/sync` - Sync to Bolna

### Voice Cloning Endpoints (NEW)
- [ ] ⚠️ `POST /api/voices/clone` - Clone voice
- [ ] ⚠️ `GET /api/voices/cloned` - List cloned voices
- [ ] ⚠️ `DELETE /api/voices/cloned/:voiceId` - Delete cloned voice

### Call Endpoints
- [ ] ⚠️ `GET /api/calls` - List calls
- [ ] ⚠️ `POST /api/calls/initiate` - Initiate call
- [ ] ⚠️ `POST /api/calls/:id/stop` - Stop call
- [ ] ⚠️ `PATCH /api/calls/:id` - Update call

### Knowledge Base Endpoints
- [ ] ⚠️ `GET /api/knowledge-base` - List knowledge entries
- [ ] ⚠️ `POST /api/knowledge-base` - Create knowledge entry
- [ ] ⚠️ `POST /api/knowledge-base/upload-batch` - Batch upload
- [ ] ⚠️ `POST /api/knowledge-base/:agentId/sync-to-bolna` - Sync to Bolna (NEW)
- [ ] ⚠️ `PATCH /api/knowledge-base/:id` - Update knowledge
- [ ] ⚠️ `DELETE /api/knowledge-base/:id` - Delete knowledge

### Organization Endpoints
- [ ] ⚠️ `GET /api/organization` - Get organization
- [ ] ⚠️ `PATCH /api/organization/whitelabel` - Update whitelabel (with file upload) (NEW)

---

## 15. Integration Testing

### Bolna Integration
- [ ] ⚠️ Agent creation syncs to Bolna
- [ ] ⚠️ Call initiation works with Bolna
- [ ] ⚠️ Contact variable sent as "contact" in user_data (NEW)
- [ ] ⚠️ Call forwarding function created in Bolna agent config (NEW)
- [ ] ⚠️ Voice cloning API calls work (NEW)
- [ ] ⚠️ Knowledge base PDF upload to Bolna works (NEW)

### Exotel Integration
- [ ] ⚠️ Phone number sync from Exotel works
- [ ] ⚠️ Call initiation via Exotel works

---

## 16. Security & Multi-Tenancy

### Data Isolation
- [ ] ⚠️ Users only see their organization's data
- [ ] ⚠️ API endpoints filter by organizationId
- [ ] ⚠️ WebSocket events scoped to organization
- [ ] ⚠️ Database queries include organizationId filter

### Access Control
- [ ] ⚠️ Only admins can manage team members
- [ ] ⚠️ Users cannot access other organizations' data
- [ ] ⚠️ Authentication required for all protected routes

---

## 17. File Uploads

### Logo Upload (NEW)
- [ ] ⚠️ Logo file upload works
- [ ] ⚠️ File saved to `public/uploads/logos/`
- [ ] ⚠️ Static file serving works (`/uploads/logos/...`)
- [ ] ⚠️ Logo preview displays before save
- [ ] ⚠️ Logo displays correctly after save

### Knowledge Base Upload
- [ ] ⚠️ Single file upload works
- [ ] ⚠️ Batch file upload works
- [ ] ⚠️ Files saved correctly

### Voice Cloning Upload
- [ ] ⚠️ Audio file upload for voice cloning works

---

## 18. Error Handling

### API Errors
- [ ] ⚠️ Invalid requests return proper error messages
- [ ] ⚠️ Authentication errors handled correctly
- [ ] ⚠️ Validation errors display to user
- [ ] ⚠️ Network errors handled gracefully

### UI Errors
- [ ] ⚠️ Form validation works
- [ ] ⚠️ Error messages display correctly
- [ ] ⚠️ Loading states work
- [ ] ⚠️ Empty states display correctly

---

## Testing Notes

### Verified Code Implementation ✅
1. **Team Member Management**: All endpoints implemented in `server/routes.ts` (lines 2990-3198)
2. **Logo File Upload**: Implemented in `server/routes.ts` (line 2888) with multer
3. **Contact Variable**: Implemented in `server/utils/bolnaUserData.js` (sends as "contact")
4. **Call Forwarding**: Implemented in `server/bolna.ts` (creates transferCall function)
5. **Voice Cloning**: Endpoints implemented in `server/routes.ts` (lines 2018-2060)
6. **PDF Unification**: Implemented in `server/utils/pdfUnifier.ts`
7. **WebSocket Events**: User events added (emitUserCreated, emitUserUpdated, emitUserDeleted)
8. **Settings UI**: Team member management UI added in `client/src/pages/Settings.tsx`

### Manual Testing Required ⚠️
All features marked with ⚠️ require manual testing in the browser to verify:
- UI interactions work correctly
- API calls succeed
- Real-time updates function
- File uploads work
- Error handling displays properly

### Testing Priority
1. **High Priority**: Authentication, Team Members, Logo Upload, Call Initiation
2. **Medium Priority**: Real-time Updates, Knowledge Base Sync, Voice Cloning
3. **Low Priority**: Analytics Charts, Billing Metrics, Integration Sections

---

## Test Execution Log

**Date**: [To be filled]
**Tester**: [To be filled]
**Environment**: Development/Production
**Browser**: [To be filled]

### Test Results Summary
- Total Tests: 150+
- Passed: [To be filled]
- Failed: [To be filled]
- Skipped: [To be filled]

---

*Last Updated: Based on codebase analysis and feature implementation*

