// Reference: javascript_log_in_with_replit integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { verifyOrganizationIsolation, ensureUserOrganization } from "./isolationMiddleware";
import { generateAISummary, analyzeLeadQualification, generateMeetingSummary, matchLeadsToAgents } from "./openai";
import { bolnaClient } from "./bolna";
// import { exotelClient } from "./exotel"; // Exotel disabled - using Plivo only
import { plivoClient } from "./plivo";
import { startCallPolling, stopCallPolling, stopAllPolling, getPollingStats } from "./callPoller";
import { syncAllPhoneNumbers, triggerManualSync, getSyncStats, syncOrganizationPhoneNumbers, startPhoneNumberSync } from "./phoneNumberSync";
import type { InsertLead, InsertChannelPartner, InsertCampaign, InsertCall, InsertVisit, InsertAiAgent, CreateAiAgentInput, UpdateAiAgentInput, InsertKnowledgeBase, CreateKnowledgeBaseInput, UpdateKnowledgeBaseInput, InsertPhoneNumber } from "@shared/schema";
import { createAiAgentSchema, updateAiAgentSchema, createKnowledgeBaseSchema, updateKnowledgeBaseSchema } from "@shared/schema";
import { getAgentTemplatesForUser, createAgentTemplate, updateAgentTemplate, deleteAgentTemplate } from './agentTemplates';
import { buildBolnaUserData } from './utils/bolnaUserData.js';

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Agent Template routes (user-specific)

  app.get('/api/agent-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await getAgentTemplatesForUser(userId);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching agent templates:', error);
      res.status(500).json({ message: 'Failed to fetch agent templates' });
    }
  });

  app.post('/api/agent-templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const template = { ...req.body, createdBy: userId, updatedAt: new Date() };
      const created = await createAgentTemplate(template);
      res.json(created);
    } catch (error) {
      console.error('Error creating agent template:', error);
      res.status(500).json({ message: 'Failed to create agent template' });
    }
  });

  app.patch('/api/agent-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updated = await updateAgentTemplate(req.params.id, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating agent template:', error);
      res.status(500).json({ message: 'Failed to update agent template' });
    }
  });

  app.delete('/api/agent-templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await deleteAgentTemplate(req.params.id, userId);
      res.json({ success });
    } catch (error) {
      console.error('Error deleting agent template:', error);
      res.status(500).json({ message: 'Failed to delete agent template' });
    }
  });
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes
  // Note: With absolute isolation, each user has their own organization
  // So this will only return the current user (their own organization)
  app.get('/api/users', isAuthenticated, verifyOrganizationIsolation, async (req: any, res) => {
    try {
      const organizationId = ensureUserOrganization(req);
      const users = await storage.getUsersByOrganization(organizationId);
      // With absolute isolation, this should only return the current user
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // User settings routes
  app.patch('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName } = req.body;
      
      const user = await storage.updateUserProfile(userId, { firstName, lastName });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Emit real-time update
      if ((app as any).emitUserUpdate) {
        (app as any).emitUserUpdate(user.organizationId, user);
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  app.post('/api/user/notifications/email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled } = req.body;
      
      const user = await storage.updateUserPreferences(userId, { emailNotificationsEnabled: enabled !== false });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating email notifications:", error);
      res.status(500).json({ message: "Failed to update email notifications" });
    }
  });

  app.post('/api/user/notifications/call-alerts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled } = req.body;
      
      const user = await storage.updateUserPreferences(userId, { callAlertsEnabled: enabled !== false });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating call alerts:", error);
      res.status(500).json({ message: "Failed to update call alerts" });
    }
  });

  app.post('/api/user/notifications/daily-summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled } = req.body;
      
      const user = await storage.updateUserPreferences(userId, { dailySummaryEnabled: enabled !== false });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating daily summary:", error);
      res.status(500).json({ message: "Failed to update daily summary" });
    }
  });

  app.post('/api/user/enable-2fa', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Generate a 2FA secret (in production, use a proper library like speakeasy)
      const crypto = await import('crypto');
      const secret = crypto.randomBytes(32).toString('base64');
      
      const user = await storage.updateUser2FA(userId, true, secret);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ enabled: true, secret });
    } catch (error) {
      console.error("Error enabling 2FA:", error);
      res.status(500).json({ message: "Failed to enable 2FA" });
    }
  });

  // AI Agents routes
  app.get('/api/ai-agents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const agents = await storage.getAIAgents(user.organizationId);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      res.status(500).json({ message: "Failed to fetch AI agents" });
    }
  });

  app.get('/api/ai-agents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const agent = await storage.getAIAgent(req.params.id, user.organizationId);
      if (!agent) {
        return res.status(404).json({ message: "AI agent not found" });
      }
      res.json(agent);
    } catch (error) {
      console.error("Error fetching AI agent:", error);
      res.status(500).json({ message: "Failed to fetch AI agent" });
    }
  });

  app.post('/api/ai-agents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Validate request body using strict schema that rejects organizationId
      const clientData: CreateAiAgentInput = createAiAgentSchema.parse(req.body);

      // Append username/email to agent name for Bolna
      const userIdentifier = user.firstName || user.email || user.id;
      
      // Ensure webhook URL is set for call updates
      const defaultWebhookUrl = process.env.PUBLIC_WEBHOOK_URL
        ? `${process.env.PUBLIC_WEBHOOK_URL}/api/webhooks/bolna/call-status`
        : null;
      
      const agentData: InsertAiAgent = {
        ...clientData,
        organizationId: user.organizationId,
        name: `${clientData.name} - ${userIdentifier}`,
        createdBy: userId,
        // Set webhook URL if not provided
        webhookUrl: clientData.webhookUrl || defaultWebhookUrl,
      };

      // Create agent in database first
      const agent = await storage.createAIAgent(agentData);

      // Emit real-time update
      if ((app as any).emitAgentCreated) {
        (app as any).emitAgentCreated(user.organizationId, agent);
      }

      // Auto-sync to Bolna in background (don't block response)
      if (agentData.voiceId && agentData.voiceProvider && agentData.voiceProvider !== 'all') {
        // Sync to Bolna asynchronously
        bolnaClient.createAgent(agent as any)
          .then(async (bolnaAgent) => {
            console.log(`Agent ${agent.id} synced to Bolna with ID: ${bolnaAgent.agent_id}`);
            // Update agent with Bolna info
            await storage.updateAIAgent(agent.id, user.organizationId, {
              bolnaAgentId: bolnaAgent.agent_id,
              bolnaConfig: bolnaAgent as any,
            }).catch(err => console.error("Failed to update agent with Bolna ID:", err));

            // Auto-setup inbound call if phone number is assigned
            if (agent.assignedPhoneNumberId) {
              try {
                console.log(`Setting up inbound call for agent ${agent.id} with phone number ${agent.assignedPhoneNumberId}...`);
                const phoneNumber = await storage.getPhoneNumber(agent.assignedPhoneNumberId, user.organizationId);
                if (phoneNumber && phoneNumber.phoneNumber) {
                  // Pass the actual phone number to Bolna with provider
                  await bolnaClient.setupInboundCall(bolnaAgent.agent_id, phoneNumber.phoneNumber, phoneNumber.provider || "exotel");
                  console.log(`Inbound call setup successful for agent ${agent.id} with number ${phoneNumber.phoneNumber}`);
                }
              } catch (inboundError) {
                console.error(`Failed to setup inbound call for agent ${agent.id}:`, inboundError);
              }
            }
          })
          .catch(bolnaError => {
            console.error(`Failed to sync agent ${agent.id} to Bolna:`, bolnaError.message);
          });
      } else {
        console.log("Agent created without voice configuration, skipping Bolna sync");
      }

      res.json(agent);
    } catch (error) {
      console.error("Error creating AI agent:", error);
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid request data", errors: (error as any).issues });
      }
      res.status(500).json({ message: "Failed to create AI agent" });
    }
  });

  app.patch('/api/ai-agents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Validate using strict update schema that rejects organizationId
      const updateData: UpdateAiAgentInput = updateAiAgentSchema.parse(req.body);

      // Get existing agent to check for Bolna integration
      const existingAgent = await storage.getAIAgent(req.params.id, user.organizationId);
      if (!existingAgent) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      // Sync updates to Bolna if agent has Bolna integration
      if (existingAgent.bolnaAgentId) {
        try {
          // Ensure voiceId and voiceProvider are included for Bolna update
          const mergedData = {
            ...existingAgent,
            ...updateData,
            voiceId: updateData.voiceId || existingAgent.voiceId,
            voiceProvider: updateData.voiceProvider || existingAgent.voiceProvider,
          };
          console.log(`[Update Agent] Syncing to Bolna with voiceId: ${mergedData.voiceId}, voiceProvider: ${mergedData.voiceProvider}`);
          await bolnaClient.updateAgent(existingAgent.bolnaAgentId, mergedData as any);
        } catch (bolnaError: any) {
          console.error("Bolna API update error:", bolnaError);
          console.error("Bolna error details:", {
            message: bolnaError?.message,
            response: bolnaError?.response?.data || bolnaError?.response,
            status: bolnaError?.response?.status,
          });
          // Continue with local update even if Bolna sync fails
          // But log the error so we can see what went wrong
        }
      }

      // Pass only validated tenant-safe data to storage (organizationId cannot be in updateData)
      const agent = await storage.updateAIAgent(req.params.id, user.organizationId, updateData);
      if (!agent) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      // Emit real-time update
      if ((app as any).emitAgentUpdate) {
        (app as any).emitAgentUpdate(user.organizationId, agent);
      }

      res.json(agent);
    } catch (error) {
      console.error("Error updating AI agent:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
        agentId: req.params.id,
      });

      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: (error as any).issues,
          error: error.message
        });
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        message: "Failed to update AI agent",
        error: errorMessage
      });
    }
  });

  app.delete('/api/ai-agents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get agent to check for Bolna integration before deleting
      const agent = await storage.getAIAgent(req.params.id, user.organizationId);
      if (!agent) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      // Delete from Bolna if integrated
      // WARNING: This deletes ALL agent data including batches, executions, etc.
      if (agent.bolnaAgentId) {
        try {
          const deleteResponse = await bolnaClient.deleteAgent(agent.bolnaAgentId);
          console.log(`[Agent Delete] Bolna agent ${agent.bolnaAgentId} deleted successfully:`, deleteResponse);
        } catch (bolnaError: any) {
          // Handle 404 gracefully (agent already deleted or never existed in Bolna)
          if (bolnaError?.message?.includes('404') || bolnaError?.message?.includes('not found')) {
            console.log(`[Agent Delete] Bolna agent ${agent.bolnaAgentId} not found (already deleted or never synced), continuing with local deletion`);
          } else {
            console.error("Bolna API delete error:", bolnaError);
            // Log but continue with local deletion - don't fail the entire operation
          }
          // Continue with local deletion even if Bolna deletion fails
        }
      }

      const deleted = await storage.deleteAIAgent(req.params.id, user.organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      // Emit real-time update
      if ((app as any).emitAgentDeleted) {
        (app as any).emitAgentDeleted(user.organizationId, req.params.id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      res.status(500).json({ message: "Failed to delete AI agent" });
    }
  });

  // Sync agent with Bolna - retry Bolna integration
  app.post('/api/ai-agents/:id/sync', isAuthenticated, verifyOrganizationIsolation, async (req: any, res) => {
    try {
      const organizationId = ensureUserOrganization(req);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agent = await storage.getAIAgent(req.params.id, organizationId);
      if (!agent) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      console.log(`Syncing agent ${agent.id} with Bolna...`);
      console.log(`Agent data:`, JSON.stringify({
        name: agent.name,
        voiceId: agent.voiceId,
        voiceName: agent.voiceName,
        voiceProvider: agent.voiceProvider,
        model: agent.model,
        provider: agent.provider,
        language: agent.language,
      }, null, 2));

      // Validate required fields
      if (!agent.voiceId) {
        return res.status(400).json({
          message: "Voice ID is required",
          error: "Please select a voice for the agent before syncing with Bolna."
        });
      }

      if (!agent.voiceProvider || agent.voiceProvider === 'all') {
        return res.status(400).json({
          message: "Voice provider is required",
          error: "Please select a specific voice provider (ElevenLabs, Polly, etc.) before syncing."
        });
      }

      // If already has Bolna integration, update it
      // If not, create new Bolna agent
      try {
        // NOTE: Exotel is disabled - using Plivo only
        // Configure Plivo as the telephony provider (Exotel configuration removed)
        console.log('[Bolna] Using Plivo as telephony provider (Exotel disabled)');

        // Always use Plivo as telephony provider (Exotel disabled)
        const telephonyProvider = "plivo";

        // Ensure webhook URL is set for call updates
        const defaultWebhookUrl = process.env.PUBLIC_WEBHOOK_URL
          ? `${process.env.PUBLIC_WEBHOOK_URL}/api/webhooks/bolna/call-status`
          : null;
        const webhookUrl = agent.webhookUrl || defaultWebhookUrl;
        
        console.log(`[Bolna Sync] Setting webhook URL for agent ${agent.name}:`, webhookUrl || 'none');

        let bolnaAgent;
        if (agent.bolnaAgentId) {
          console.log(`Agent has existing Bolna ID: ${agent.bolnaAgentId}, updating...`);
          // Only send Bolna-relevant fields, exclude database-only fields
          const updateData = {
            name: agent.name,
            description: agent.description,
            voiceId: agent.voiceId,
            voiceName: agent.voiceName,
            voiceProvider: agent.voiceProvider,
            language: agent.language,
            model: agent.model,
            provider: agent.provider,
            agentType: agent.agentType,
            systemPrompt: agent.systemPrompt,
            userPrompt: agent.userPrompt,
            firstMessage: agent.firstMessage,
            temperature: agent.temperature,
            maxDuration: agent.maxDuration,
            maxTokens: agent.maxTokens,
            knowledgeBaseIds: agent.knowledgeBaseIds,
            assignedPhoneNumberId: agent.assignedPhoneNumberId,
            callForwardingEnabled: agent.callForwardingEnabled,
            callForwardingNumber: agent.callForwardingNumber,
            webhookUrl: webhookUrl,
            status: agent.status,
            telephonyProvider,
          };
          bolnaAgent = await bolnaClient.updateAgent(agent.bolnaAgentId, updateData as any);
        } else {
          console.log(`Creating new Bolna agent...`);
          // Only send Bolna-relevant fields, exclude database-only fields
          const createData = {
            name: agent.name,
            description: agent.description,
            voiceId: agent.voiceId,
            voiceName: agent.voiceName,
            voiceProvider: agent.voiceProvider,
            language: agent.language,
            model: agent.model,
            provider: agent.provider,
            agentType: agent.agentType,
            systemPrompt: agent.systemPrompt,
            userPrompt: agent.userPrompt,
            firstMessage: agent.firstMessage,
            temperature: agent.temperature,
            maxDuration: agent.maxDuration,
            maxTokens: agent.maxTokens,
            knowledgeBaseIds: agent.knowledgeBaseIds,
            assignedPhoneNumberId: agent.assignedPhoneNumberId,
            callForwardingEnabled: agent.callForwardingEnabled,
            callForwardingNumber: agent.callForwardingNumber,
            webhookUrl: webhookUrl,
            status: agent.status,
            telephonyProvider,
          };
          bolnaAgent = await bolnaClient.createAgent(createData as any);
          console.log(`Bolna agent created with ID: ${bolnaAgent.agent_id}`);
          await storage.updateAIAgent(req.params.id, organizationId, {
            bolnaAgentId: bolnaAgent.agent_id,
            bolnaConfig: bolnaAgent as any,
          });

          // Auto-setup inbound call if phone number is assigned
          if (agent.assignedPhoneNumberId) {
            try {
              console.log(`Setting up inbound call for agent ${agent.id} with phone number ${agent.assignedPhoneNumberId}...`);
              const phoneNumber = await storage.getPhoneNumber(agent.assignedPhoneNumberId, organizationId);
              if (phoneNumber && phoneNumber.phoneNumber) {
                // Pass the actual phone number to Bolna with provider
                await bolnaClient.setupInboundCall(bolnaAgent.agent_id, phoneNumber.phoneNumber, phoneNumber.provider || "exotel");
                console.log(`Inbound call setup successful for agent ${agent.id} with number ${phoneNumber.phoneNumber}`);
              }
            } catch (inboundError) {
              console.error(`Failed to setup inbound call for agent ${agent.id}:`, inboundError);
              // Don't fail the sync if inbound setup fails
            }
          }
        }

        const updatedAgent = await storage.getAIAgent(req.params.id, organizationId);

        // Emit real-time update
        if ((app as any).emitAgentUpdate && updatedAgent) {
          (app as any).emitAgentUpdate(organizationId, updatedAgent);
        }

        res.json(updatedAgent);
      } catch (bolnaError: any) {
        console.error("Bolna sync error:", bolnaError);
        
        // Extract detailed error information
        let errorMessage = bolnaError.message || String(bolnaError);
        let errorDetails: any = null;
        
        // Try to extract error from response
        if (bolnaError.response) {
          errorDetails = bolnaError.response.data;
          if (errorDetails?.message) {
            errorMessage = `Bolna API error (${bolnaError.response.status || 400}): ${JSON.stringify(errorDetails)}`;
          }
          console.error("Bolna API Error Response:", JSON.stringify(errorDetails, null, 2));
          console.error("Bolna API Error Status:", bolnaError.response.status);
        }
        
        // Log the payload that was sent (for debugging)
        if (agent.bolnaAgentId) {
          console.error("Failed update payload for agent:", agent.bolnaAgentId);
        } else {
          console.error("Failed create payload for agent:", agent.id);
        }
        
        return res.status(500).json({
          message: "Failed to sync with Bolna",
          error: errorMessage,
          details: errorDetails
        });
      }
    } catch (error: any) {
      console.error("Error syncing AI agent:", error);
      if (error.response) {
        console.error("Bolna Error Response:", JSON.stringify(error.response.data, null, 2));
        console.error("Bolna Error Status:", error.response.status);
      }
      res.status(500).json({
        message: "Failed to sync AI agent",
        details: error.response?.data,
        error: error.message || String(error)
      });
    }
  });

  // Call initiation route - Use Bolna + Exotel
  app.post('/api/calls/initiate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { agentId, recipientPhone, contactName, fromPhone, leadId } = req.body;

      if (!agentId || !recipientPhone) {
        return res.status(400).json({ message: "agentId and recipientPhone are required" });
      }

      // Get the AI agent
      const agent = await storage.getAIAgent(agentId, user.organizationId);
      if (!agent) {
        return res.status(404).json({ message: "AI agent not found" });
      }

      if (!agent.bolnaAgentId) {
        return res.status(400).json({ message: "Agent is not configured with Bolna" });
      }

      let callerId = fromPhone;
      if (!callerId && agent.assignedPhoneNumberId) {
        const assignedPhone = await storage.getPhoneNumber(agent.assignedPhoneNumberId, user.organizationId);
        callerId = assignedPhone?.phoneNumber || undefined;
        console.log('[Call Initiate] Agent assigned phone:', assignedPhone?.phoneNumber);
        console.log('[Call Initiate] Using caller ID:', callerId);
      } else {
        console.log('[Call Initiate] No assigned phone number for agent');
      }

      // Create call record in database
      const callData: InsertCall = {
        organizationId: user.organizationId,
        leadId: leadId || null,
        agentId,
        contactPhone: recipientPhone,
        contactName: contactName || null,
        callType: 'outbound',
        direction: 'outbound',
        status: 'initiated',
        scheduledAt: new Date(),
      };

      const call = await storage.createCall(callData);

      let bolnaCall;
      try {
        // Use v2 API for call initiation
        bolnaCall = await bolnaClient.initiateCallV2({
          agent_id: agent.bolnaAgentId,
          recipient_phone_number: recipientPhone,
          from_phone_number: callerId,
          user_data: buildBolnaUserData({
            callId: call.id,
            leadId,
            contactName,
            organizationId: user.organizationId,
          }),
        });

        await storage.updateCall(call.id, user.organizationId, {
          bolnaCallId: bolnaCall.call_id || bolnaCall.execution_id,
        });
      } catch (bolnaError) {
        console.error("Bolna initiate call error:", bolnaError);
        // Fallback to v1 API if v2 fails
        try {
          bolnaCall = await bolnaClient.initiateCall({
            agent_id: agent.bolnaAgentId,
            recipient_phone_number: recipientPhone,
            from: callerId,
            metadata: {
              callId: call.id,
              leadId,
              contactName,
              organizationId: user.organizationId,
            },
          });
          await storage.updateCall(call.id, user.organizationId, {
            bolnaCallId: bolnaCall.call_id,
          });
        } catch (fallbackError) {
          console.error("Bolna v1 fallback also failed:", fallbackError);
        }
      }

      // NOTE: Exotel is disabled - using Plivo only via Bolna
      const exotelCall = null;

      const latestCall = await storage.getCall(call.id, user.organizationId);

      // Emit real-time updates
      if ((app as any).emitCallCreated && latestCall) {
        (app as any).emitCallCreated(user.organizationId, latestCall);
      }

      // Emit metrics update for dashboard
      if ((app as any).emitMetricsUpdate) {
        const metrics = await storage.getDashboardMetrics(user.organizationId);
        (app as any).emitMetricsUpdate(user.organizationId, metrics);
      }

      // Start automatic polling for call status if we have a Bolna call ID
      // Disabled for now - webhooks are working and polling causes too many API calls
      // if (latestCall?.bolnaCallId) {
      //   console.log(`🔄 [Call Initiate] Starting automatic polling for call ${latestCall.bolnaCallId}`);
      //   startCallPolling(
      //     latestCall.bolnaCallId,
      //     latestCall.id,
      //     user.organizationId,
      //     (app as any).emitCallUpdate,
      //     (app as any).emitMetricsUpdate
      //   );
      // }

      res.json({ call: latestCall || call, bolnaCall, exotelCall });
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json({ message: "Failed to initiate call" });
    }
  });

  // Exotel phone numbers management
  app.get('/api/phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get phone numbers from database
      const phoneNumbers = await storage.getPhoneNumbers(user.organizationId);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers" });
    }
  });

  // Legacy sync endpoint - now uses the new sync service for user's organization
  app.get('/api/phone-numbers/sync', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use the new sync service but only for this organization
      const orgStats = await syncOrganizationPhoneNumbers(
        user.organizationId,
        emitPhoneNumberUpdate,
        emitPhoneNumberCreated
      );

      // Get updated phone numbers
      const syncedNumbers = await storage.getPhoneNumbers(user.organizationId);

      res.json({
        syncedNumbers,
        total: syncedNumbers.length,
        created: orgStats.created,
        updated: orgStats.updated,
        errors: orgStats.errors
      });
    } catch (error: any) {
      console.error("Error syncing phone numbers:", error);
      res.status(500).json({ message: "Failed to sync phone numbers", error: error.message });
    }
  });

  // Bolna webhook for call status updates
  app.post('/api/webhooks/bolna/call-status', async (req, res) => {
    try {
      // Log ALL incoming webhooks with full payload
      console.log('\n🔔 [Bolna Webhook] Received at:', new Date().toISOString());
      console.log('📦 [Bolna Webhook] Full payload:', JSON.stringify(req.body, null, 2));

      // Bolna webhook payload structure
      const {
        id: bolnaCallId,
        conversation_duration,
        total_cost,
        transcript,
        recording_url,
        status: bolnaStatus,
        context_details,
        telephony_data
      } = req.body;

      // Ensure conversation_duration is an integer
      const callDuration = conversation_duration ? Math.floor(Number(conversation_duration)) : undefined;
      console.log(`[Bolna Webhook] conversation_duration raw: ${conversation_duration}, type: ${typeof conversation_duration}, converted: ${callDuration}`);

      let call;

      // Method 1: Try to find call using context_details (most reliable)
      if (context_details?.recipient_data?.callId && context_details?.recipient_data?.organizationId) {
        console.log(`[Bolna Webhook] Trying context_details: callId=${context_details.recipient_data.callId}, org=${context_details.recipient_data.organizationId}`);
        call = await storage.getCall(context_details.recipient_data.callId, context_details.recipient_data.organizationId);
      }

      // Method 2: Try to find call by Bolna call ID
      if (!call && bolnaCallId) {
        console.log(`[Bolna Webhook] Trying Bolna ID: ${bolnaCallId}`);
        call = await storage.getCallByBolnaCallId(bolnaCallId);
      }

      if (!call) {
        console.warn(`[Bolna Webhook] ❌ Could not find matching call. Bolna ID: ${bolnaCallId}, Context callId: ${context_details?.recipient_data?.callId}`);
        return res.status(202).json({ received: true, matched: false });
      }

      console.log(`[Bolna Webhook] ✅ Found call ${call.id} for Bolna ID ${bolnaCallId}`);
      console.log(`[Bolna Webhook] Org: ${call.organizationId}`);
      console.log(`[Bolna Webhook] Current status: ${call.status}`);
      console.log(`[Bolna Webhook] Bolna status: ${bolnaStatus}`);

      // Determine status based on Bolna's status field or conversation_duration
      let normalizedStatus = call.status;

      if (bolnaStatus) {
        const statusLower = bolnaStatus.toLowerCase();
        if (statusLower === 'ringing') {
          normalizedStatus = 'ringing';
        } else if (statusLower === 'answered' || statusLower === 'in-progress' || statusLower === 'ongoing') {
          normalizedStatus = 'in_progress';
        } else if (statusLower === 'call-disconnected' || statusLower === 'ended' || statusLower === 'completed') {
          normalizedStatus = 'completed';
        } else if (statusLower === 'failed' || statusLower === 'no-answer' || statusLower === 'busy') {
          normalizedStatus = 'failed';
        }
        console.log(`[Bolna Webhook] Status mapped: ${bolnaStatus} -> ${normalizedStatus}`);
      }

      // If we have conversation_duration > 0, the call is completed
      if (callDuration && callDuration > 0) {
        normalizedStatus = 'completed';
        console.log(`[Bolna Webhook] Call completed with duration: ${callDuration}s`);
      }

      const updates: Partial<InsertCall> = {
        status: normalizedStatus,
        duration: callDuration || call.duration,
        transcription: transcript || call.transcription,
        recordingUrl: telephony_data?.recording_url || recording_url || call.recordingUrl,
        endedAt: normalizedStatus === 'completed' || normalizedStatus === 'failed' || normalizedStatus === 'cancelled'
          ? new Date()
          : call.endedAt,
      };

      // Add Bolna cost information if available
      if (total_cost !== undefined) {
        updates.bolnaCostPerMinute = Number(total_cost);
      }

      console.log(`[Bolna Webhook] Updating call with:`, JSON.stringify(updates, null, 2));

      const updatedCall = await storage.updateCall(call.id, call.organizationId, updates);

      console.log(`[Bolna Webhook] ✅ Call updated successfully`);
      console.log(`[Bolna Webhook] Checking emitters - emitCallUpdate:`, typeof (app as any).emitCallUpdate);
      console.log(`[Bolna Webhook] Checking emitters - emitMetricsUpdate:`, typeof (app as any).emitMetricsUpdate);

      // Emit real-time updates
      if ((app as any).emitCallUpdate && updatedCall) {
        console.log(`[Bolna Webhook] 🚀 Emitting call:updated to org:${call.organizationId}`);
        (app as any).emitCallUpdate(call.organizationId, updatedCall);
      } else {
        console.warn('[Bolna Webhook] ⚠️ emitCallUpdate not available or call not updated');
      }

      // Emit metrics update for dashboard
      if ((app as any).emitMetricsUpdate) {
        console.log(`[Bolna Webhook] 📊 Fetching and emitting metrics update`);
        const metrics = await storage.getDashboardMetrics(call.organizationId);
        (app as any).emitMetricsUpdate(call.organizationId, metrics);
        console.log(`[Bolna Webhook] ✅ Metrics emitted`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Bolna webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Exotel webhook for call status updates
  app.post('/api/webhooks/exotel/call-status', async (req, res) => {
    try {
      const payload = req.body || {};
      const { CallSid, Status, Duration, RecordingUrl, StartTime, EndTime, Price } = payload;

      let metadata: { callId?: string; organizationId?: string } = {};
      if (payload.CustomField) {
        try {
          metadata = JSON.parse(payload.CustomField);
        } catch (err) {
          console.warn("Failed to parse Exotel CustomField:", err);
        }
      }

      let call;
      if (metadata.callId && metadata.organizationId) {
        call = await storage.getCall(metadata.callId, metadata.organizationId);
      }
      if (!call && CallSid) {
        call = await storage.getCallByExotelSid(CallSid);
      }

      if (!call) {
        console.warn("Exotel webhook could not find matching call", CallSid);
        return res.status(202).json({ received: true, matched: false });
      }

      const parsedDuration = Duration ? parseInt(Duration, 10) : undefined;

      // Normalize Exotel status to our internal status values
      let normalizedStatus = Status || call.status;
      if (Status) {
        const statusLower = Status.toLowerCase();
        if (statusLower === 'answered' || statusLower === 'in-progress' || statusLower === 'in_progress') {
          normalizedStatus = 'in_progress';
        } else if (statusLower === 'completed' || statusLower === 'ended') {
          normalizedStatus = 'completed';
        } else if (statusLower === 'busy' || statusLower === 'no-answer' || statusLower === 'no_answer' || statusLower === 'failed') {
          normalizedStatus = 'failed';
        } else if (statusLower === 'ringing') {
          normalizedStatus = 'ringing';
        } else if (statusLower === 'initiated' || statusLower === 'queued') {
          normalizedStatus = 'initiated';
        } else if (statusLower === 'cancelled' || statusLower === 'canceled') {
          normalizedStatus = 'cancelled';
        }
      }

      console.log(`[Exotel Webhook] Call ${CallSid}: ${Status} -> ${normalizedStatus}`);
      console.log(`[Exotel Webhook] Duration: ${parsedDuration}, Price: ${Price}`);

      const updates: Partial<InsertCall> = {
        status: normalizedStatus,
        recordingUrl: RecordingUrl || call.recordingUrl,
        exotelCallSid: CallSid || call.exotelCallSid,
        endedAt: normalizedStatus === 'completed' || normalizedStatus === 'failed' || normalizedStatus === 'cancelled'
          ? new Date()
          : call.endedAt,
        startedAt: call.startedAt || (StartTime ? new Date(StartTime) : undefined),
        metadata: {
          ...(call.metadata as Record<string, any> || {}),
          exotel: payload,
        },
      };

      if (parsedDuration !== undefined && !Number.isNaN(parsedDuration)) {
        updates.duration = parsedDuration;
      }

      if (Price) {
        updates.exotelCostPerMinute = Number(Price);
      }

      const updatedCall = await storage.updateCall(call.id, call.organizationId, updates);

      // Emit real-time updates
      if ((app as any).emitCallUpdate && updatedCall) {
        (app as any).emitCallUpdate(call.organizationId, updatedCall);
      }

      // Emit metrics update for dashboard
      if ((app as any).emitMetricsUpdate) {
        const metrics = await storage.getDashboardMetrics(call.organizationId);
        (app as any).emitMetricsUpdate(call.organizationId, metrics);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Exotel webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Call History routes
  app.get('/api/calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const calls = await storage.getCalls(user.organizationId);

      // Validate response: ensure all calls belong to user's organization (defensive)
      const validCalls = calls.filter(call => call.organizationId === user.organizationId);
      if (validCalls.length !== calls.length) {
        console.error("WARNING: Storage returned cross-tenant calls data");
      }

      res.json(validCalls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.get('/api/calls/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const call = await storage.getCall(req.params.id, user.organizationId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Validate response: ensure call belongs to user's organization (defensive)
      if (call.organizationId !== user.organizationId) {
        console.error("WARNING: Storage returned cross-tenant call data");
        return res.status(404).json({ message: "Call not found" });
      }

      res.json(call);
    } catch (error) {
      console.error("Error fetching call:", error);
      res.status(500).json({ message: "Failed to fetch call" });
    }
  });

  // Get call transcript and recording from Bolna
  app.get('/api/calls/:id/bolna-details', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const call = await storage.getCall(req.params.id, user.organizationId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Get details from Bolna if we have a bolnaCallId
      if (call.bolnaCallId) {
        const bolnaDetails = await bolnaClient.getCallDetails(call.bolnaCallId);
        res.json(bolnaDetails);
      } else {
        res.json({ message: "No Bolna call ID available" });
      }
    } catch (error) {
      console.error("Error fetching Bolna call details:", error);
      res.status(500).json({ message: "Failed to fetch call details from Bolna" });
    }
  });

  // Get polling statistics
  app.get('/api/calls/polling/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = getPollingStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching polling stats:", error);
      res.status(500).json({ message: "Failed to fetch polling stats" });
    }
  });

  // Stop active call
  app.post('/api/calls/:id/stop', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const call = await storage.getCall(req.params.id, user.organizationId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }

      // Stop polling if active
      if (call.bolnaCallId) {
        stopCallPolling(call.bolnaCallId);
      }

      // Stop the call in Bolna if it has a Bolna call ID
      if (call.bolnaCallId) {
        try {
          await bolnaClient.stopCall(call.bolnaCallId);
        } catch (bolnaError) {
          console.error("Error stopping Bolna call:", bolnaError);
        }
      }

      // Stop the call in Exotel if it has an Exotel call SID
      if (call.exotelCallSid) {
        try {
          // Exotel doesn't have a direct stop API, but we can update the status
          console.log("Exotel call termination requested:", call.exotelCallSid);
        } catch (exotelError) {
          console.error("Error stopping Exotel call:", exotelError);
        }
      }

      // Update call status in database
      const updatedCall = await storage.updateCall(req.params.id, user.organizationId, {
        status: 'cancelled',
        endedAt: new Date(),
      });

      // Emit real-time update
      if ((app as any).emitCallUpdate && updatedCall) {
        (app as any).emitCallUpdate(user.organizationId, updatedCall);
      }

      res.json({ success: true, call: updatedCall });
    } catch (error) {
      console.error("Error stopping call:", error);
      res.status(500).json({ message: "Failed to stop call" });
    }
  });

  // Bolna API routes - Voice & Model configuration
  app.get('/api/bolna/voices', isAuthenticated, async (req: any, res) => {
    try {
      const provider = req.query.provider as string | undefined;
      let voices = await bolnaClient.getAvailableVoices();

      // Filter by provider if specified (and not "all")
      if (provider && provider !== 'all') {
        voices = voices.filter(voice =>
          voice.provider?.toLowerCase() === provider.toLowerCase()
        );
      }

      res.json(voices);
    } catch (error) {
      console.error("Error fetching Bolna voices:", error);
      res.status(500).json({ message: "Failed to fetch available voices", error: (error as Error).message });
    }
  });

  app.get('/api/bolna/models', isAuthenticated, async (req: any, res) => {
    try {
      const models = await bolnaClient.getAvailableModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching Bolna models:", error);
      res.status(500).json({ message: "Failed to fetch available AI models", error: (error as Error).message });
    }
  });

  // Knowledge Base Management Routes
  // Create/Upload knowledge base to Bolna and sync to platform
  app.post('/api/knowledge-base/upload-to-bolna', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const { agentId, title, category, description } = req.body;
      const user = req.user;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Accept .pdf, .txt, .doc, .docx
      const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
      let pdfBuffer = null;
      let pdfFileName = req.file.originalname;
      let pdfSize = req.file.size;
      let converted = false;

      if (req.file.mimetype === 'application/pdf' || ext === 'pdf') {
        pdfBuffer = req.file.buffer;
      } else if (ext === 'txt') {
        // Convert text to PDF
        const { textToPdfBuffer } = require('./utils/fileToPdf');
        pdfBuffer = await textToPdfBuffer(req.file.buffer);
        pdfFileName = req.file.originalname.replace(/\.[^.]+$/, '') + '.pdf';
        pdfSize = pdfBuffer.length;
        converted = true;
      } else if (ext === 'doc' || ext === 'docx') {
        // Convert doc/docx to PDF
        const { docxToPdfBuffer } = require('./utils/fileToPdf');
        pdfBuffer = await docxToPdfBuffer(req.file.buffer);
        pdfFileName = req.file.originalname.replace(/\.[^.]+$/, '') + '.pdf';
        pdfSize = pdfBuffer.length;
        converted = true;
      } else {
        return res.status(400).json({
          message: "Unsupported file type. Only PDF, TXT, DOC, DOCX are accepted.",
          acceptedFormats: ["PDF", "TXT", "DOC", "DOCX"],
          uploadedFormat: req.file.mimetype
        });
      }

      console.log(`[KB Upload] Uploading ${pdfFileName} to Bolna for agent ${agentId}`);

      // Prepare file object for Bolna upload
      const fileForBolna = {
        ...req.file,
        buffer: pdfBuffer,
        originalname: pdfFileName,
        mimetype: 'application/pdf',
        size: pdfSize,
      };

      // Upload to Bolna
      const bolnaKB = await bolnaClient.createKnowledgeBase(fileForBolna, {
        fileName: pdfFileName,
        chunk_size: 512,
        similarity_top_k: 5,
        overlapping: 20,
      });

      console.log(`[KB Upload] ✅ Bolna KB created with ID: ${bolnaKB.rag_id}`);

      // Store in platform database
      const kbEntry = await storage.createKnowledgeBase({
        organizationId: user.organizationId,
        agentId: agentId || undefined,
        title: title || pdfFileName,
        content: `PDF Document: ${pdfFileName}`,
        contentType: 'pdf',
        category: category || 'document',
        description: description || `Uploaded PDF: ${pdfFileName}` + (converted ? ' (converted from original)' : ''),
        fileUrl: req.file.filename || pdfFileName,
        status: 'active',
        tags: ['bolna', 'pdf', 'knowledge-base'],
        metadata: {
          bolnaRagId: bolnaKB.rag_id,
          uploadedAt: new Date().toISOString(),
          fileName: pdfFileName,
          fileSize: pdfSize,
          originalFileName: req.file.originalname,
          originalMimeType: req.file.mimetype,
        }
      } as any);

      // Update agent with knowledge base ID
      if (agentId && bolnaKB.rag_id) {
        const agent = await storage.getAIAgent(agentId, user.organizationId);
        if (agent) {
          const existingKBIds = agent.knowledgeBaseIds || [];
          const updatedKBIds = Array.from(new Set([...existingKBIds, bolnaKB.rag_id]));

          await storage.updateAIAgent(agentId, user.organizationId, {
            knowledgeBaseIds: updatedKBIds,
          });

          console.log(`[KB Upload] ✅ Agent ${agentId} updated with KB: ${bolnaKB.rag_id}`);
        }
      }

      res.json({
        success: true,
        message: "Knowledge base uploaded successfully to Bolna",
        platformEntry: kbEntry,
        bolnaKnowledgeBase: bolnaKB,
      });
    } catch (error) {
      console.error("Error uploading knowledge base to Bolna:", error);
      res.status(500).json({
        message: "Failed to upload knowledge base",
        error: (error as Error).message
      });
    }
  });

  // Bulk upload multiple PDFs to knowledge base
  app.post('/api/knowledge-base/upload-batch', isAuthenticated, upload.array('files', 10), async (req: any, res) => {
    try {
      const { agentId, category, description } = req.body;
      const user = req.user;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      console.log(`[KB Batch Upload] Uploading ${req.files.length} files to Bolna for agent ${agentId}`);

      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          // Validate each file is PDF
          if (file.mimetype !== 'application/pdf') {
            errors.push({
              fileName: file.originalname,
              error: `Only PDF files accepted. Got ${file.mimetype}`
            });
            continue;
          }

          // Upload to Bolna
          const bolnaKB = await bolnaClient.createKnowledgeBase(file, {
            fileName: file.originalname,
            chunk_size: 512,
            similarity_top_k: 5,
            overlapping: 20,
          });

          // Store in platform database
          const kbEntry = await storage.createKnowledgeBase({
            organizationId: user.organizationId,
            agentId: agentId || undefined,
            title: file.originalname,
            content: `PDF Document: ${file.originalname}`,
            contentType: 'pdf',
            category: category || 'document',
            description: description || `Bulk uploaded PDF: ${file.originalname}`,
            fileUrl: file.filename || file.originalname,
            status: 'active',
            tags: ['bolna', 'pdf', 'knowledge-base', 'batch-upload'],
            metadata: {
              bolnaRagId: bolnaKB.rag_id,
              uploadedAt: new Date().toISOString(),
              fileName: file.originalname,
              fileSize: file.size,
            }
          } as any);

          results.push({
            fileName: file.originalname,
            success: true,
            platformId: kbEntry.id,
            bolnaRagId: bolnaKB.rag_id,
          });
        } catch (err) {
          errors.push({
            fileName: file.originalname,
            error: (err as Error).message
          });
        }
      }

      // Update agent with all knowledge base IDs
      if (agentId && results.length > 0) {
        const agent = await storage.getAIAgent(agentId, user.organizationId);
        if (agent) {
          const newKBIds = results.map(r => r.bolnaRagId);
          const existingKBIds = agent.knowledgeBaseIds || [];
          const updatedKBIds = Array.from(new Set([...existingKBIds, ...newKBIds]));

          await storage.updateAIAgent(agentId, user.organizationId, {
            knowledgeBaseIds: updatedKBIds,
          });
        }
      }

      res.json({
        success: true,
        message: `Uploaded ${results.length} knowledge bases. ${errors.length} failed.`,
        uploaded: results,
        failed: errors,
      });
    } catch (error) {
      console.error("Error bulk uploading knowledge bases:", error);
      res.status(500).json({
        message: "Failed to bulk upload knowledge bases",
        error: (error as Error).message
      });
    }
  });

  // Get all knowledge bases for organization/agent
  app.get('/api/knowledge-base', isAuthenticated, async (req: any, res) => {
    try {
      const { agentId } = req.query;
      const user = req.user;

      let kbs;
      if (agentId) {
        kbs = await storage.getKnowledgeBaseByAgent(agentId, user.organizationId);
      } else {
        kbs = await storage.getKnowledgeBase(user.organizationId);
      }

      res.json(kbs);
    } catch (error) {
      console.error("Error fetching knowledge bases:", error);
      res.status(500).json({ message: "Failed to fetch knowledge bases", error: (error as Error).message });
    }
  });

  // Get knowledge base details
  app.get('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const kb = await storage.getKnowledgeBaseItem(req.params.id, req.user.organizationId);

      if (!kb) {
        return res.status(404).json({ message: "Knowledge base not found" });
      }

      res.json(kb);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base", error: (error as Error).message });
    }
  });

  // Update knowledge base
  app.patch('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { title, description, category, tags, status } = req.body;

      const updates: Partial<InsertKnowledgeBase> = {};
      if (title) updates.title = title;
      if (description) updates.description = description;
      if (category) updates.category = category;
      if (tags) updates.tags = tags;
      if (status) updates.status = status;

      const result = await storage.updateKnowledgeBase(req.params.id, req.user.organizationId, updates);

      if (!result) {
        return res.status(404).json({ message: "Knowledge base not found" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating knowledge base:", error);
      res.status(500).json({ message: "Failed to update knowledge base", error: (error as Error).message });
    }
  });

  // Delete knowledge base
  app.delete('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const kb = await storage.getKnowledgeBaseItem(req.params.id, req.user.organizationId);

      if (!kb) {
        return res.status(404).json({ message: "Knowledge base not found" });
      }

      await storage.deleteKnowledgeBase(req.params.id, req.user.organizationId);

      res.json({ message: "Knowledge base deleted successfully" });
    } catch (error) {
      console.error("Error deleting knowledge base:", error);
      res.status(500).json({ message: "Failed to delete knowledge base", error: (error as Error).message });
    }
  });

  // Sync agent's knowledge bases to Bolna
  app.post('/api/knowledge-base/agent/:agentId/sync-to-bolna', isAuthenticated, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const user = req.user;

      const agent = await storage.getAIAgent(agentId, user.organizationId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Get all knowledge bases for this agent
      const kbs = await storage.getKnowledgeBaseByAgent(agentId, user.organizationId);

      if (kbs.length === 0) {
        return res.json({
          message: "No knowledge bases found for this agent",
          synced: [],
          failed: [],
          total: 0
        });
      }

      const synced = [];
      const failed = [];

      // Note: Bolna requires actual PDF files, not just text content
      // So we can only sync knowledge bases that have file URLs
      for (const kb of kbs) {
        if (!kb.fileUrl || kb.contentType !== 'pdf') {
          failed.push({
            kbId: kb.id,
            title: kb.title,
            reason: 'Bolna only supports PDF files. Please upload PDF documents.'
          });
          continue;
        }

        try {
          // Verify the knowledge base exists in Bolna
          // Prioritize Bolna RAG ID from metadata
          const metadata = (kb as any).metadata || {};
          let bolnaRagId = metadata.bolnaRagId;

          if (!bolnaRagId) {
            // Fallback or log error if needed
          }

          if (bolnaRagId) {
            const bolnaKb = await bolnaClient.getKnowledgeBase(bolnaRagId);
            synced.push({
              kbId: kb.id,
              title: kb.title,
              fileUrl: kb.fileUrl,
              bolnaRagId,
              status: 'synced'
            });
          } else {
            failed.push({
              kbId: kb.id,
              title: kb.title,
              reason: 'No Bolna RAG ID found. Please re-upload the document.'
            });
          }
        } catch (err) {
          failed.push({
            kbId: kb.id,
            title: kb.title,
            reason: (err as Error).message
          });
        }
      }

      // Update agent's knowledge base IDs in Bolna
      const syncedRagIds = synced.map(s => s.bolnaRagId);
      if (syncedRagIds.length > 0) {
        await storage.updateAIAgent(agentId, user.organizationId, {
          knowledgeBaseIds: syncedRagIds,
        });
      }

      res.json({
        message: "Knowledge base sync complete",
        agentId,
        total: kbs.length,
        synced,
        failed,
      });
    } catch (error) {
      console.error("Error syncing knowledge bases to Bolna:", error);
      res.status(500).json({
        message: "Failed to sync knowledge bases",
        error: (error as Error).message
      });
    }
  });

  // Create knowledgebase from URL for Bolna
  app.post('/api/bolna/knowledge-base/from-url', isAuthenticated, async (req: any, res) => {
    try {
      const { url, chunk_size, similarity_top_k, overlapping } = req.body;

      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      console.log(`[Bolna KB] Creating knowledgebase from URL: ${url}`);
      
      const result = await bolnaClient.createKnowledgeBaseFromUrl(url, {
        chunk_size: chunk_size || 512,
        similarity_top_k: similarity_top_k || 15,
        overlapping: overlapping || 128,
      });

      res.json({
        success: true,
        message: "Knowledgebase creation initiated",
        knowledgebase: result,
      });
    } catch (error) {
      console.error("Error creating Bolna knowledgebase from URL:", error);
      res.status(500).json({
        message: "Failed to create knowledgebase from URL",
        error: (error as Error).message
      });
    }
  });

  // Create knowledgebase from agent data (accumulates all agent info into a PDF)
  app.post('/api/bolna/knowledge-base/from-agent/:agentId', isAuthenticated, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const user = req.user;
      const { additionalInfo, customData } = req.body;

      const agent = await storage.getAIAgent(agentId, user.organizationId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      console.log(`[Bolna KB] Creating knowledgebase from agent data: ${agent.name}`);

      // Accumulate all agent data
      const agentKnowledgeData = {
        name: agent.name,
        description: agent.description || undefined,
        systemPrompt: agent.systemPrompt || undefined,
        firstMessage: agent.firstMessage || undefined,
        userPrompt: agent.userPrompt || undefined,
        additionalInfo: additionalInfo || undefined,
        customData: {
          ...(customData || {}),
          agentType: agent.agentType,
          model: agent.model,
          provider: agent.provider,
          language: agent.language,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          voiceProvider: agent.voiceProvider,
          voiceName: agent.voiceName,
        },
      };

      const result = await bolnaClient.createAgentKnowledgeBase(agentKnowledgeData);

      // Store the knowledgebase ID in agent's knowledgeBaseIds if not already there
      const existingIds = agent.knowledgeBaseIds || [];
      if (result.rag_id && !existingIds.includes(result.rag_id)) {
        await storage.updateAIAgent(agentId, user.organizationId, {
          knowledgeBaseIds: [...existingIds, result.rag_id],
        });
      }

      res.json({
        success: true,
        message: "Knowledgebase created from agent data",
        agentId,
        agentName: agent.name,
        knowledgebase: result,
      });
    } catch (error) {
      console.error("Error creating Bolna knowledgebase from agent:", error);
      res.status(500).json({
        message: "Failed to create knowledgebase from agent data",
        error: (error as Error).message
      });
    }
  });

  // Bolna Knowledge Base routes (existing endpoints)
  app.get('/api/bolna/knowledge-bases', isAuthenticated, async (req: any, res) => {
    try {
      const knowledgeBases = await bolnaClient.listKnowledgeBases();
      res.json(knowledgeBases);
    } catch (error) {
      console.error("Error fetching Bolna knowledge bases:", error);
      res.status(500).json({ message: "Failed to fetch knowledge bases", error: (error as Error).message });
    }
  });

  app.get('/api/bolna/knowledge-bases/:ragId', isAuthenticated, async (req: any, res) => {
    try {
      const knowledgeBase = await bolnaClient.getKnowledgeBase(req.params.ragId);
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error fetching Bolna knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base", error: (error as Error).message });
    }
  });

  app.post('/api/bolna/knowledge-bases', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file is PDF only
      if (req.file.mimetype !== 'application/pdf') {
        return res.status(400).json({
          message: "Bolna only accepts PDF files. Please upload a PDF document."
        });
      }

      const options = {
        chunk_size: req.body.chunk_size ? parseInt(req.body.chunk_size) : 512,
        similarity_top_k: req.body.similarity_top_k ? parseInt(req.body.similarity_top_k) : 5,
        overlapping: req.body.overlapping ? parseInt(req.body.overlapping) : 20,
        fileName: req.file.originalname,
      };

      const knowledgeBase = await bolnaClient.createKnowledgeBase(req.file, options);
      res.json(knowledgeBase);
    } catch (error) {
      console.error("Error creating Bolna knowledge base:", error);
      res.status(500).json({ message: "Failed to create knowledge base", error: (error as Error).message });
    }
  });

  // Bolna Inbound Setup
  app.post('/api/bolna/inbound/setup', isAuthenticated, async (req: any, res) => {
    try {
      const { agentId, phoneNumberId } = req.body;
      if (!agentId || !phoneNumberId) {
        return res.status(400).json({ message: "agentId and phoneNumberId are required" });
      }
      const result = await bolnaClient.setupInboundCall(agentId, phoneNumberId);
      res.json(result);
    } catch (error) {
      console.error("Error setting up inbound call:", error);
      res.status(500).json({ message: "Failed to setup inbound call", error: (error as Error).message });
    }
  });

  // Bolna Call Management
  app.post('/api/bolna/agents/:agentId/stop', isAuthenticated, async (req: any, res) => {
    try {
      const result = await bolnaClient.stopAgentCalls(req.params.agentId);
      res.json(result);
    } catch (error) {
      console.error("Error stopping agent calls:", error);
      res.status(500).json({ message: "Failed to stop agent calls", error: (error as Error).message });
    }
  });

  app.post('/api/bolna/calls/:executionId/stop', isAuthenticated, async (req: any, res) => {
    try {
      const result = await bolnaClient.stopCall(req.params.executionId);
      res.json(result);
    } catch (error) {
      console.error("Error stopping call:", error);
      res.status(500).json({ message: "Failed to stop call", error: (error as Error).message });
    }
  });

  app.get('/api/bolna/agents/:agentId/executions/:executionId', isAuthenticated, async (req: any, res) => {
    try {
      const result = await bolnaClient.getAgentExecution(req.params.agentId, req.params.executionId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching agent execution:", error);
      res.status(500).json({ message: "Failed to fetch agent execution", error: (error as Error).message });
    }
  });

  // Exotel API routes - Phone Numbers
  app.get('/api/exotel/phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumbers = await exotelClient.getPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching Exotel phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch phone numbers", error: (error as Error).message });
    }
  });

  app.get('/api/exotel/phone-numbers/:phoneSid', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumber = await exotelClient.getPhoneNumber(req.params.phoneSid);
      res.json(phoneNumber);
    } catch (error) {
      console.error("Error fetching Exotel phone number:", error);
      res.status(500).json({ message: "Failed to fetch phone number", error: (error as Error).message });
    }
  });

  app.post('/api/exotel/phone-numbers/:phoneSid', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumber = await exotelClient.updatePhoneNumber(req.params.phoneSid, req.body);
      res.json(phoneNumber);
    } catch (error) {
      console.error("Error updating Exotel phone number:", error);
      res.status(500).json({ message: "Failed to update phone number", error: (error as Error).message });
    }
  });

  // Exotel Available Phone Numbers
  app.get('/api/exotel/available-phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumbers = await exotelClient.getAvailablePhoneNumbers(req.query);
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Error fetching available phone numbers:", error);
      res.status(500).json({ message: "Failed to fetch available phone numbers", error: (error as Error).message });
    }
  });

  app.post('/api/exotel/provision-phone-number', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumber = await exotelClient.provisionPhoneNumber(req.body);
      res.json(phoneNumber);
    } catch (error) {
      console.error("Error provisioning phone number:", error);
      res.status(500).json({ message: "Failed to provision phone number", error: (error as Error).message });
    }
  });

  app.delete('/api/exotel/phone-numbers/:phoneSid', isAuthenticated, async (req: any, res) => {
    try {
      await exotelClient.releasePhoneNumber(req.params.phoneSid);
      res.json({ success: true });
    } catch (error) {
      console.error("Error releasing phone number:", error);
      res.status(500).json({ message: "Failed to release phone number", error: (error as Error).message });
    }
  });

  // Bolna Available Phone Numbers
  app.get('/api/bolna/available-phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const { country, pattern, type } = req.query;
      const phoneNumbers = await bolnaClient.searchAvailablePhoneNumbers({
        country,
        pattern,
        type,
      });
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching available phone numbers from Bolna:", error);
      res.status(500).json({
        message: "Failed to fetch available phone numbers from Bolna",
        error: error.message
      });
    }
  });

  // Bolna Registered Phone Numbers
  app.get('/api/bolna/phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumbers = await bolnaClient.listRegisteredPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching registered phone numbers from Bolna:", error);
      res.status(500).json({
        message: "Failed to fetch registered phone numbers from Bolna",
        error: error.message
      });
    }
  });

  // Plivo Available Phone Numbers
  app.get('/api/plivo/available-phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const { country_iso, type, pattern, region, services, limit, offset } = req.query;
      const phoneNumbers = await plivoClient.searchAvailablePhoneNumbers({
        country_iso,
        type: type as "local" | "tollfree" | "any" | undefined,
        pattern,
        region,
        services,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching available phone numbers from Plivo:", error);
      res.status(500).json({
        message: "Failed to fetch available phone numbers from Plivo",
        error: error.message
      });
    }
  });

  // Plivo Phone Numbers Management
  app.get('/api/plivo/phone-numbers', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumbers = await plivoClient.getPhoneNumbers();
      res.json(phoneNumbers);
    } catch (error: any) {
      console.error("Error fetching Plivo phone numbers:", error);
      res.status(500).json({
        message: "Failed to fetch Plivo phone numbers",
        error: error.message
      });
    }
  });

  app.get('/api/plivo/phone-numbers/:number', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumber = await plivoClient.getPhoneNumber(req.params.number);
      res.json(phoneNumber);
    } catch (error: any) {
      console.error("Error fetching Plivo phone number:", error);
      res.status(500).json({
        message: "Failed to fetch Plivo phone number",
        error: error.message
      });
    }
  });

  app.post('/api/plivo/phone-numbers/:number/buy', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumber = await plivoClient.buyPhoneNumber(req.params.number);
      res.json(phoneNumber);
    } catch (error: any) {
      console.error("Error buying Plivo phone number:", error);
      res.status(500).json({
        message: "Failed to buy Plivo phone number",
        error: error.message
      });
    }
  });

  app.delete('/api/plivo/phone-numbers/:number', isAuthenticated, async (req: any, res) => {
    try {
      await plivoClient.releasePhoneNumber(req.params.number);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error releasing Plivo phone number:", error);
      res.status(500).json({
        message: "Failed to release Plivo phone number",
        error: error.message
      });
    }
  });

  app.post('/api/plivo/phone-numbers/:number', isAuthenticated, async (req: any, res) => {
    try {
      const phoneNumber = await plivoClient.updatePhoneNumber(req.params.number, req.body);
      res.json(phoneNumber);
    } catch (error: any) {
      console.error("Error updating Plivo phone number:", error);
      res.status(500).json({
        message: "Failed to update Plivo phone number",
        error: error.message
      });
    }
  });

  // Unified endpoint to check available numbers from all providers
  app.get('/api/phone-numbers/available', isAuthenticated, async (req: any, res) => {
    try {
      const { country, country_iso, pattern, type, provider } = req.query;
      const results: any = {
        exotel: null,
        bolna: null,
        plivo: null,
      };

      // Check Exotel
      if (!provider || provider === 'exotel') {
        try {
          const exotelParams: any = {};
          if (country) exotelParams.Country = country;
          if (pattern) exotelParams.Contains = pattern;
          results.exotel = await exotelClient.getAvailablePhoneNumbers(exotelParams);
        } catch (error: any) {
          console.warn("Error fetching from Exotel:", error.message);
          results.exotel = { error: error.message };
        }
      }

      // Check Bolna
      if (!provider || provider === 'bolna') {
        try {
          results.bolna = await bolnaClient.searchAvailablePhoneNumbers({
            country: country || country_iso,
            pattern,
            type,
          });
        } catch (error: any) {
          console.warn("Error fetching from Bolna:", error.message);
          results.bolna = { error: error.message };
        }
      }

      // Check Plivo
      if (!provider || provider === 'plivo') {
        try {
          results.plivo = await plivoClient.searchAvailablePhoneNumbers({
            country_iso: country_iso || country,
            type: type as "local" | "tollfree" | "any" | undefined,
            pattern,
          });
        } catch (error: any) {
          console.warn("Error fetching from Plivo:", error.message);
          results.plivo = { error: error.message };
        }
      }

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching available phone numbers:", error);
      res.status(500).json({
        message: "Failed to fetch available phone numbers",
        error: error.message
      });
    }
  });

  // Exotel Calls
  app.get('/api/exotel/calls', isAuthenticated, async (req: any, res) => {
    try {
      const calls = await exotelClient.listCalls(req.query);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching Exotel calls:", error);
      res.status(500).json({ message: "Failed to fetch calls", error: (error as Error).message });
    }
  });

  app.get('/api/exotel/calls/:callSid', isAuthenticated, async (req: any, res) => {
    try {
      const call = await exotelClient.getCallDetails(req.params.callSid);
      res.json(call);
    } catch (error) {
      console.error("Error fetching Exotel call:", error);
      res.status(500).json({ message: "Failed to fetch call", error: (error as Error).message });
    }
  });

  app.post('/api/exotel/calls', isAuthenticated, async (req: any, res) => {
    try {
      const call = await exotelClient.makeCall(req.body);
      res.json(call);
    } catch (error) {
      console.error("Error making Exotel call:", error);
      res.status(500).json({ message: "Failed to make call", error: (error as Error).message });
    }
  });

  // Exotel SMS
  app.post('/api/exotel/sms', isAuthenticated, async (req: any, res) => {
    try {
      const result = await exotelClient.sendSMS(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: "Failed to send SMS", error: (error as Error).message });
    }
  });

  app.post('/api/exotel/sms/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const result = await exotelClient.sendBulkSMS(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error sending bulk SMS:", error);
      res.status(500).json({ message: "Failed to send bulk SMS", error: (error as Error).message });
    }
  });

  app.get('/api/exotel/sms', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await exotelClient.getSMSMessages(req.query.messageSid);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching SMS messages:", error);
      res.status(500).json({ message: "Failed to fetch SMS messages", error: (error as Error).message });
    }
  });

  // Exotel Customer Whitelist
  app.get('/api/exotel/whitelist', isAuthenticated, async (req: any, res) => {
    try {
      const whitelist = await exotelClient.getCustomerWhitelist(req.query.whitelistSid);
      res.json(whitelist);
    } catch (error) {
      console.error("Error fetching whitelist:", error);
      res.status(500).json({ message: "Failed to fetch whitelist", error: (error as Error).message });
    }
  });

  app.post('/api/exotel/whitelist', isAuthenticated, async (req: any, res) => {
    try {
      const result = await exotelClient.addToCustomerWhitelist(req.body);
      res.json(result);
    } catch (error) {
      console.error("Error adding to whitelist:", error);
      res.status(500).json({ message: "Failed to add to whitelist", error: (error as Error).message });
    }
  });

  app.delete('/api/exotel/whitelist/:whitelistSid', isAuthenticated, async (req: any, res) => {
    try {
      await exotelClient.removeFromCustomerWhitelist(req.params.whitelistSid);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from whitelist:", error);
      res.status(500).json({ message: "Failed to remove from whitelist", error: (error as Error).message });
    }
  });

  // Knowledge Base routes
  app.get('/api/knowledge-base', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const knowledge = await storage.getKnowledgeBase(user.organizationId);

      // Defensive validation
      const validKnowledge = knowledge.filter(k => k.organizationId === user.organizationId);
      if (validKnowledge.length !== knowledge.length) {
        console.error("WARNING: Storage returned cross-tenant knowledge base data");
      }

      res.json(validKnowledge);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base" });
    }
  });

  app.get('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const item = await storage.getKnowledgeBaseItem(req.params.id, user.organizationId);
      if (!item) {
        return res.status(404).json({ message: "Knowledge base item not found" });
      }

      // Defensive validation
      if (item.organizationId !== user.organizationId) {
        console.error("WARNING: Storage returned cross-tenant knowledge base item");
        return res.status(404).json({ message: "Knowledge base item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching knowledge base item:", error);
      res.status(500).json({ message: "Failed to fetch knowledge base item" });
    }
  });

  app.post('/api/knowledge-base', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate using strict schema that rejects organizationId
      const clientData: CreateKnowledgeBaseInput = createKnowledgeBaseSchema.parse(req.body);

      // Server-side: inject organizationId from authenticated user
      const knowledgeData: InsertKnowledgeBase = {
        ...clientData,
        organizationId: user.organizationId,
      };

      const item = await storage.createKnowledgeBase(knowledgeData);
      res.json(item);
    } catch (error) {
      console.error("Error creating knowledge base item:", error);
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid request data", errors: (error as any).issues });
      }
      res.status(500).json({ message: "Failed to create knowledge base item" });
    }
  });

  app.patch('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate using strict update schema that rejects organizationId
      const updateData: UpdateKnowledgeBaseInput = updateKnowledgeBaseSchema.parse(req.body);

      const item = await storage.updateKnowledgeBase(req.params.id, user.organizationId, updateData);
      if (!item) {
        return res.status(404).json({ message: "Knowledge base item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error updating knowledge base item:", error);
      if (error instanceof Error && 'issues' in error) {
        return res.status(400).json({ message: "Invalid request data", errors: (error as any).issues });
      }
      res.status(500).json({ message: "Failed to update knowledge base item" });
    }
  });

  app.delete('/api/knowledge-base/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const deleted = await storage.deleteKnowledgeBase(req.params.id, user.organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Knowledge base item not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledge base item:", error);
      res.status(500).json({ message: "Failed to delete knowledge base item" });
    }
  });

  // Campaign routes
  app.get('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const campaigns = await storage.getCampaigns(user.organizationId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const campaign = await storage.getCampaign(req.params.id, user.organizationId);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post('/api/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const campaignData: InsertCampaign = {
        ...req.body,
        organizationId: user.organizationId,
        createdBy: userId,
      };
      const campaign = await storage.createCampaign(campaignData);

      // Emit real-time update
      if ((app as any).emitCampaignCreated) {
        (app as any).emitCampaignCreated(user.organizationId, campaign);
      }

      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const campaign = await storage.updateCampaign(req.params.id, user.organizationId, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const deleted = await storage.deleteCampaign(req.params.id, user.organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  // Lead routes
  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const leads = await storage.getLeads(user.organizationId);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/leads/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const leads = await storage.getLeadsByAgent(userId, user.organizationId);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching my leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const lead = await storage.getLead(req.params.id, user.organizationId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const leadData: InsertLead = {
        ...req.body,
        organizationId: user.organizationId,
      };
      const lead = await storage.createLead(leadData);

      // Emit real-time update
      if ((app as any).emitLeadCreated) {
        (app as any).emitLeadCreated(user.organizationId, lead);
      }

      // Generate AI summary if notes exist
      if (lead.notes) {
        const aiSummary = await analyzeLeadQualification({
          name: lead.name,
          company: lead.company || undefined,
          notes: lead.notes,
        });
        await storage.updateLead(lead.id, user.organizationId, { aiSummary });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.post('/api/leads/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const { data } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

      const campaignId = req.body.campaignId;
      if (!campaignId) {
        return res.status(400).json({ message: "Campaign ID is required" });
      }

      const leadsData: InsertLead[] = (data as any[]).map((row: any) => ({
        organizationId: user.organizationId,
        campaignId,
        name: row.name || row.Name || '',
        email: row.email || row.Email || null,
        phone: row.phone || row.Phone || null,
        company: row.company || row.Company || null,
        status: 'new',
      })).filter(lead => lead.name); // Only include rows with names

      const leads = await storage.createLeadsBulk(leadsData, user.organizationId);

      // Update campaign lead count
      const campaign = await storage.getCampaign(campaignId, user.organizationId);
      if (campaign) {
        await storage.updateCampaign(campaignId, user.organizationId, {
          totalLeads: campaign.totalLeads + leads.length,
        });
      }

      res.json({
        message: "Leads uploaded successfully",
        count: leads.length,
        leads,
      });
    } catch (error) {
      console.error("Error uploading leads:", error);
      res.status(500).json({ message: "Failed to upload leads" });
    }
  });

  app.patch('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const lead = await storage.updateLead(req.params.id, user.organizationId, req.body);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Channel Partner routes
  app.get('/api/channel-partners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const partners = await storage.getChannelPartners(user.organizationId);
      res.json(partners);
    } catch (error) {
      console.error("Error fetching channel partners:", error);
      res.status(500).json({ message: "Failed to fetch channel partners" });
    }
  });

  app.get('/api/channel-partners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const partner = await storage.getChannelPartner(req.params.id, user.organizationId);
      if (!partner) {
        return res.status(404).json({ message: "Channel partner not found" });
      }
      res.json(partner);
    } catch (error) {
      console.error("Error fetching channel partner:", error);
      res.status(500).json({ message: "Failed to fetch channel partner" });
    }
  });

  app.post('/api/channel-partners', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const partnerData: InsertChannelPartner = {
        ...req.body,
        organizationId: user.organizationId,
      };
      const partner = await storage.createChannelPartner(partnerData);
      res.json(partner);
    } catch (error) {
      console.error("Error creating channel partner:", error);
      res.status(500).json({ message: "Failed to create channel partner" });
    }
  });

  app.post('/api/channel-partners/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const { data } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

      const partnersData: InsertChannelPartner[] = (data as any[]).map((row: any) => ({
        organizationId: user.organizationId,
        name: row.name || row.Name || '',
        email: row.email || row.Email || null,
        phone: row.phone || row.Phone || null,
        company: row.company || row.Company || null,
        category: row.category || row.Category || null,
        status: 'inactive',
      })).filter(partner => partner.name);

      const partners = await storage.createChannelPartnersBulk(partnersData, user.organizationId);

      res.json({
        message: "Channel partners uploaded successfully",
        count: partners.length,
        partners,
      });
    } catch (error) {
      console.error("Error uploading channel partners:", error);
      res.status(500).json({ message: "Failed to upload channel partners" });
    }
  });

  app.patch('/api/channel-partners/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const partner = await storage.updateChannelPartner(req.params.id, user.organizationId, req.body);
      if (!partner) {
        return res.status(404).json({ message: "Channel partner not found" });
      }
      res.json(partner);
    } catch (error) {
      console.error("Error updating channel partner:", error);
      res.status(500).json({ message: "Failed to update channel partner" });
    }
  });

  // Call routes
  app.get('/api/calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const calls = await storage.getCalls(user.organizationId);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.get('/api/calls/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const calls = await storage.getCallsByAgent(userId, user.organizationId);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching my calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.post('/api/calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const callData: InsertCall = {
        ...req.body,
        organizationId: user.organizationId,
      };
      const call = await storage.createCall(callData);

      // Generate AI summary if transcription exists
      if (call.transcription) {
        const aiSummary = await generateAISummary(call.transcription);
        await storage.updateCall(call.id, user.organizationId, { aiSummary });
      }

      res.json(call);
    } catch (error) {
      console.error("Error creating call:", error);
      res.status(500).json({ message: "Failed to create call" });
    }
  });

  app.patch('/api/calls/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const call = await storage.updateCall(req.params.id, user.organizationId, req.body);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      res.json(call);
    } catch (error) {
      console.error("Error updating call:", error);
      res.status(500).json({ message: "Failed to update call" });
    }
  });

  // Visit routes
  app.get('/api/visits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const visits = await storage.getVisits(user.organizationId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching visits:", error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.get('/api/visits/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const visits = await storage.getVisitsByManager(userId, user.organizationId);
      res.json(visits);
    } catch (error) {
      console.error("Error fetching my visits:", error);
      res.status(500).json({ message: "Failed to fetch visits" });
    }
  });

  app.post('/api/visits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const visitData: InsertVisit = {
        ...req.body,
        organizationId: user.organizationId,
      };
      const visit = await storage.createVisit(visitData);
      res.json(visit);
    } catch (error) {
      console.error("Error creating visit:", error);
      res.status(500).json({ message: "Failed to create visit" });
    }
  });

  app.patch('/api/visits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const visit = await storage.updateVisit(req.params.id, user.organizationId, req.body);

      // Generate summary if transcription exists
      if (visit && req.body.transcription && !visit.summary) {
        const summary = await generateMeetingSummary(req.body.transcription);
        await storage.updateVisit(req.params.id, user.organizationId, { summary });
      }

      if (!visit) {
        return res.status(404).json({ message: "Visit not found" });
      }
      res.json(visit);
    } catch (error) {
      console.error("Error updating visit:", error);
      res.status(500).json({ message: "Failed to update visit" });
    }
  });

  // Dashboard metrics route (AI Voice Agent platform)
  app.get('/api/dashboard/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const metrics = await storage.getDashboardMetrics(user.organizationId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const daysAgo = req.query.timeRange === '90d' ? 90 : req.query.timeRange === '30d' ? 30 : 7;
      const metrics = await storage.getAnalyticsMetrics(user.organizationId, daysAgo);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching analytics metrics:", error);
      res.status(500).json({ message: "Failed to fetch analytics metrics" });
    }
  });

  app.get('/api/analytics/calls', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const daysAgo = req.query.timeRange === '90d' ? 90 : req.query.timeRange === '30d' ? 30 : 7;
      const callMetrics = await storage.getCallMetrics(user.organizationId, daysAgo);
      res.json(callMetrics);
    } catch (error) {
      console.error("Error fetching call metrics:", error);
      res.status(500).json({ message: "Failed to fetch call metrics" });
    }
  });

  app.get('/api/analytics/agents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const daysAgo = req.query.timeRange === '90d' ? 90 : req.query.timeRange === '30d' ? 30 : 7;
      const agentPerformance = await storage.getAgentPerformance(user.organizationId, daysAgo);
      res.json(agentPerformance);
    } catch (error) {
      console.error("Error fetching agent performance:", error);
      res.status(500).json({ message: "Failed to fetch agent performance" });
    }
  });

  // Billing routes
  app.get('/api/billing/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const metrics = await storage.getBillingMetrics(user.organizationId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching billing metrics:", error);
      res.status(500).json({ message: "Failed to fetch billing metrics" });
    }
  });

  // Organization whitelabel routes
  app.get('/api/organization', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const organization = await storage.getOrganization(user.organizationId);
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.patch('/api/organization/whitelabel', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { companyName, logoUrl, primaryColor } = req.body;
      const organization = await storage.updateOrganizationWhitelabel(
        user.organizationId,
        { companyName, logoUrl, primaryColor }
      );

      // Emit real-time update
      if ((app as any).emitOrganizationUpdate && organization) {
        (app as any).emitOrganizationUpdate(user.organizationId, organization);
      }

      res.json(organization);
    } catch (error) {
      console.error("Error updating organization whitelabel:", error);
      res.status(500).json({ message: "Failed to update organization whitelabel" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // WebSocket connection handler with isolation verification
  io.on('connection', async (socket: any) => {
    console.log('Client connected:', socket.id);

    // Verify user's organization from session
    let userOrganizationId: string | null = null;

    try {
      // Get session from handshake (if available)
      const sessionId = socket.handshake.auth?.sessionId ||
        socket.handshake.headers.cookie?.match(/megna\.sid=([^;]+)/)?.[1];

      if (sessionId) {
        // Try to get user from session
        // Use dynamic import for ESM compatibility
        try {
          const connectPg = (await import('connect-pg-simple')).default;
          const expressSession = (await import('express-session')).default;
          const pgStore = connectPg(expressSession);
          const store = new pgStore({
            conString: process.env.DATABASE_URL,
            tableName: "sessions",
          });

          const session = await new Promise<any>((resolve, reject) => {
            store.get(sessionId, (err: any, sess: any) => {
              if (err) reject(err);
              else resolve(sess);
            });
          });

          if (session?.user?.claims?.sub) {
            const user = await storage.getUser(session.user.claims.sub);
            if (user) {
              userOrganizationId = user.organizationId;
              (socket as any).organizationId = userOrganizationId;
              (socket as any).userId = user.id;
            }
          }
        } catch (importError) {
          // If dynamic import fails, skip session verification
          console.warn(`[Socket.IO] Could not import session store for socket ${socket.id}:`, importError);
        }
      }
    } catch (error) {
      console.warn(`[Socket.IO] Could not verify session for socket ${socket.id}:`, error);
    }

    // Join organization-specific room for absolute multi-tenant isolation
    socket.on('join:organization', (organizationId: string) => {
      // Verify user can only join their own organization
      if (userOrganizationId && organizationId !== userOrganizationId) {
        console.warn(`[Socket.IO] Blocked attempt by socket ${socket.id} to join org ${organizationId} (user's org: ${userOrganizationId})`);
        return;
      }

      // If no userOrganizationId from session, allow join but log warning
      if (!userOrganizationId) {
        console.warn(`[Socket.IO] Socket ${socket.id} joining org ${organizationId} without verified session`);
      }

      socket.join(`org:${organizationId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined organization room: org:${organizationId}`);
    });

    socket.on('leave:organization', (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
      console.log(`[Socket.IO] Client ${socket.id} left organization room: org:${organizationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client ${socket.id} disconnected from organization ${userOrganizationId || 'unknown'}`);
    });
  });

  // Helper functions to emit real-time updates
  const emitCallUpdate = (organizationId: string, call: any) => {
    io.to(`org:${organizationId}`).emit('call:updated', call);
  };

  const emitCallCreated = (organizationId: string, call: any) => {
    io.to(`org:${organizationId}`).emit('call:created', call);
  };

  const emitCallDeleted = (organizationId: string, callId: string) => {
    io.to(`org:${organizationId}`).emit('call:deleted', callId);
  };

  const emitMetricsUpdate = (organizationId: string, metrics: any) => {
    io.to(`org:${organizationId}`).emit('metrics:updated', metrics);
  };

  const emitAgentUpdate = (organizationId: string, agent: any) => {
    io.to(`org:${organizationId}`).emit('agent:updated', agent);
  };

  const emitAgentCreated = (organizationId: string, agent: any) => {
    io.to(`org:${organizationId}`).emit('agent:created', agent);
  };

  const emitAgentDeleted = (organizationId: string, agentId: string) => {
    io.to(`org:${organizationId}`).emit('agent:deleted', agentId);
  };

  const emitLeadUpdate = (organizationId: string, lead: any) => {
    io.to(`org:${organizationId}`).emit('lead:updated', lead);
  };

  const emitLeadCreated = (organizationId: string, lead: any) => {
    io.to(`org:${organizationId}`).emit('lead:created', lead);
  };

  const emitLeadDeleted = (organizationId: string, leadId: string) => {
    io.to(`org:${organizationId}`).emit('lead:deleted', leadId);
  };

  const emitCampaignUpdate = (organizationId: string, campaign: any) => {
    io.to(`org:${organizationId}`).emit('campaign:updated', campaign);
  };

  const emitCampaignCreated = (organizationId: string, campaign: any) => {
    io.to(`org:${organizationId}`).emit('campaign:created', campaign);
  };

  const emitCampaignDeleted = (organizationId: string, campaignId: string) => {
    io.to(`org:${organizationId}`).emit('campaign:deleted', campaignId);
  };

  const emitContactCreated = (organizationId: string, contact: any) => {
    io.to(`org:${organizationId}`).emit('contact:created', contact);
  };

  const emitContactUpdated = (organizationId: string, contact: any) => {
    io.to(`org:${organizationId}`).emit('contact:updated', contact);
  };

  const emitKnowledgeBaseUpdate = (organizationId: string, item: any) => {
    io.to(`org:${organizationId}`).emit('knowledge:updated', item);
  };

  const emitKnowledgeBaseCreated = (organizationId: string, item: any) => {
    io.to(`org:${organizationId}`).emit('knowledge:created', item);
  };

  const emitKnowledgeBaseDeleted = (organizationId: string, itemId: string) => {
    io.to(`org:${organizationId}`).emit('knowledge:deleted', itemId);
  };

  const emitPhoneNumberUpdate = (organizationId: string, phone: any) => {
    io.to(`org:${organizationId}`).emit('phone:updated', phone);
  };

  const emitPhoneNumberCreated = (organizationId: string, phone: any) => {
    io.to(`org:${organizationId}`).emit('phone:created', phone);
  };

  const emitOrganizationUpdate = (organizationId: string, org: any) => {
    io.to(`org:${organizationId}`).emit('organization:updated', org);
  };

  const emitCreditsUpdate = (organizationId: string, credits: number) => {
    io.to(`org:${organizationId}`).emit('credits:updated', { credits });
  };

  // Store io instance and helper functions for use in other parts of the app
  (app as any).io = io;
  (app as any).emitCallUpdate = emitCallUpdate;
  (app as any).emitCallCreated = emitCallCreated;
  (app as any).emitCallDeleted = emitCallDeleted;
  (app as any).emitMetricsUpdate = emitMetricsUpdate;
  (app as any).emitAgentUpdate = emitAgentUpdate;
  (app as any).emitAgentCreated = emitAgentCreated;
  (app as any).emitAgentDeleted = emitAgentDeleted;
  (app as any).emitLeadUpdate = emitLeadUpdate;
  (app as any).emitLeadCreated = emitLeadCreated;
  (app as any).emitLeadDeleted = emitLeadDeleted;
  (app as any).emitCampaignUpdate = emitCampaignUpdate;
  (app as any).emitCampaignCreated = emitCampaignCreated;
  (app as any).emitCampaignDeleted = emitCampaignDeleted;
  (app as any).emitKnowledgeBaseUpdate = emitKnowledgeBaseUpdate;
  (app as any).emitKnowledgeBaseCreated = emitKnowledgeBaseCreated;
  (app as any).emitKnowledgeBaseDeleted = emitKnowledgeBaseDeleted;
  (app as any).emitPhoneNumberUpdate = emitPhoneNumberUpdate;
  (app as any).emitPhoneNumberCreated = emitPhoneNumberCreated;
  (app as any).emitOrganizationUpdate = emitOrganizationUpdate;
  (app as any).emitCreditsUpdate = emitCreditsUpdate;
  (app as any).emitContactCreated = emitContactCreated;
  (app as any).emitContactUpdated = emitContactUpdated;

  // Start automatic phone number syncing with WebSocket support

  // Start sync after a short delay to ensure everything is initialized
  setTimeout(() => {
    startPhoneNumberSync(emitPhoneNumberUpdate, emitPhoneNumberCreated);
  }, 2000);

  // Phone number sync API endpoints
  app.post('/api/phone-numbers/sync/manual', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await triggerManualSync(emitPhoneNumberUpdate, emitPhoneNumberCreated);
      res.json({
        success: true,
        message: 'Phone numbers synced successfully',
        stats
      });
    } catch (error: any) {
      console.error("Error in manual phone number sync:", error);
      res.status(500).json({ message: "Failed to sync phone numbers", error: error.message });
    }
  });

  app.get('/api/phone-numbers/sync/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = getSyncStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting sync stats:", error);
      res.status(500).json({ message: "Failed to get sync stats", error: error.message });
    }
  });

  // Auto-assign leads using "AI" (Simulated logic for now, or simple round-robin)
  app.post('/api/leads/auto-assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get unassigned leads
      const leads = await storage.getLeads(user.organizationId);
      const unassignedLeads = leads.filter(l => !l.assignedAgentId && l.status === 'new');

      if (unassignedLeads.length === 0) {
        return res.json({ message: "No new unassigned leads found", count: 0 });
      }

      // Get available agents
      const agents = await storage.getAIAgents(user.organizationId);
      if (agents.length === 0) {
        return res.status(400).json({ message: "No AI agents available for assignment" });
      }

      // Use AI to match leads to agents
      const sanitizedLeads = unassignedLeads.map(l => ({
        ...l,
        company: l.company || undefined,
        notes: l.notes || undefined
      }));
      const kbs = await storage.getKnowledgeBase(req.user.organizationId);
      // Filter by agent if needed, or if getKnowledgeBaseByAgent exists use that
      // But based on error, getKnowledgeBase takes 1 arg (orgId?)
      // Wait, 1328 uses req.params.id. So maybe getKnowledgeBase(id) ?
      // I will infer from storage.ts view.

      // Fixing sanitize
      const sanitizedAgents = agents.map(a => ({
        ...a,
        description: a.description || undefined,
        systemPrompt: a.systemPrompt || undefined
      }));
      const assignments = await matchLeadsToAgents(sanitizedLeads, sanitizedAgents);
      let assignedCount = 0;

      for (const lead of unassignedLeads) {
        const assignedAgentId = assignments[lead.id];
        if (assignedAgentId) {
          const agent = agents.find(a => a.id === assignedAgentId);
          if (agent) {
            await storage.updateLead(lead.id, user.organizationId, {
              assignedAgentId: agent.id,
              status: 'contacted',
              aiSummary: `Auto-assigned to ${agent.name} based on AI matching analysis.`,
              notes: (lead.notes || '') + `\n[System]: Auto-assigned to ${agent.name} at ${new Date().toISOString()}`
            });
            assignedCount++;
          }
        }
      }

      res.json({
        message: `Successfully auto-assigned ${assignedCount} leads using AI matching`,
        count: assignedCount
      });
    } catch (error) {
      console.error("Error auto-assigning leads:", error);
      res.status(500).json({ message: "Failed to auto-assign leads" });
    }
  });

  return httpServer;
}
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { companyName, logoUrl, primaryColor } = req.body;
      const organization = await storage.updateOrganizationWhitelabel(
        user.organizationId,
        { companyName, logoUrl, primaryColor }
      );

      // Emit real-time update
      if ((app as any).emitOrganizationUpdate && organization) {
        (app as any).emitOrganizationUpdate(user.organizationId, organization);
      }

      res.json(organization);
    } catch (error) {
      console.error("Error updating organization whitelabel:", error);
      res.status(500).json({ message: "Failed to update organization whitelabel" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // WebSocket connection handler with isolation verification
  io.on('connection', async (socket: any) => {
    console.log('Client connected:', socket.id);

    // Verify user's organization from session
    let userOrganizationId: string | null = null;

    try {
      // Get session from handshake (if available)
      const sessionId = socket.handshake.auth?.sessionId ||
        socket.handshake.headers.cookie?.match(/megna\.sid=([^;]+)/)?.[1];

      if (sessionId) {
        // Try to get user from session
        // Use dynamic import for ESM compatibility
        try {
          const connectPg = (await import('connect-pg-simple')).default;
          const expressSession = (await import('express-session')).default;
          const pgStore = connectPg(expressSession);
          const store = new pgStore({
            conString: process.env.DATABASE_URL,
            tableName: "sessions",
          });

          const session = await new Promise<any>((resolve, reject) => {
            store.get(sessionId, (err: any, sess: any) => {
              if (err) reject(err);
              else resolve(sess);
            });
          });

          if (session?.user?.claims?.sub) {
            const user = await storage.getUser(session.user.claims.sub);
            if (user) {
              userOrganizationId = user.organizationId;
              (socket as any).organizationId = userOrganizationId;
              (socket as any).userId = user.id;
            }
          }
        } catch (importError) {
          // If dynamic import fails, skip session verification
          console.warn(`[Socket.IO] Could not import session store for socket ${socket.id}:`, importError);
        }
      }
    } catch (error) {
      console.warn(`[Socket.IO] Could not verify session for socket ${socket.id}:`, error);
    }

    // Join organization-specific room for absolute multi-tenant isolation
    socket.on('join:organization', (organizationId: string) => {
      // Verify user can only join their own organization
      if (userOrganizationId && organizationId !== userOrganizationId) {
        console.warn(`[Socket.IO] Blocked attempt by socket ${socket.id} to join org ${organizationId} (user's org: ${userOrganizationId})`);
        return;
      }

      // If no userOrganizationId from session, allow join but log warning
      if (!userOrganizationId) {
        console.warn(`[Socket.IO] Socket ${socket.id} joining org ${organizationId} without verified session`);
      }

      socket.join(`org:${organizationId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined organization room: org:${organizationId}`);
    });

    socket.on('leave:organization', (organizationId: string) => {
      socket.leave(`org:${organizationId}`);
      console.log(`[Socket.IO] Client ${socket.id} left organization room: org:${organizationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client ${socket.id} disconnected from organization ${userOrganizationId || 'unknown'}`);
    });
  });

  // Helper functions to emit real-time updates
  const emitCallUpdate = (organizationId: string, call: any) => {
    io.to(`org:${organizationId}`).emit('call:updated', call);
  };

  const emitCallCreated = (organizationId: string, call: any) => {
    io.to(`org:${organizationId}`).emit('call:created', call);
  };

  const emitCallDeleted = (organizationId: string, callId: string) => {
    io.to(`org:${organizationId}`).emit('call:deleted', callId);
  };

  const emitMetricsUpdate = (organizationId: string, metrics: any) => {
    io.to(`org:${organizationId}`).emit('metrics:updated', metrics);
  };

  const emitAgentUpdate = (organizationId: string, agent: any) => {
    io.to(`org:${organizationId}`).emit('agent:updated', agent);
  };

  const emitAgentCreated = (organizationId: string, agent: any) => {
    io.to(`org:${organizationId}`).emit('agent:created', agent);
  };

  const emitAgentDeleted = (organizationId: string, agentId: string) => {
    io.to(`org:${organizationId}`).emit('agent:deleted', agentId);
  };

  const emitLeadUpdate = (organizationId: string, lead: any) => {
    io.to(`org:${organizationId}`).emit('lead:updated', lead);
  };

  const emitLeadCreated = (organizationId: string, lead: any) => {
    io.to(`org:${organizationId}`).emit('lead:created', lead);
  };

  const emitLeadDeleted = (organizationId: string, leadId: string) => {
    io.to(`org:${organizationId}`).emit('lead:deleted', leadId);
  };

  const emitCampaignUpdate = (organizationId: string, campaign: any) => {
    io.to(`org:${organizationId}`).emit('campaign:updated', campaign);
  };

  const emitCampaignCreated = (organizationId: string, campaign: any) => {
    io.to(`org:${organizationId}`).emit('campaign:created', campaign);
  };

  const emitCampaignDeleted = (organizationId: string, campaignId: string) => {
    io.to(`org:${organizationId}`).emit('campaign:deleted', campaignId);
  };

  const emitContactCreated = (organizationId: string, contact: any) => {
    io.to(`org:${organizationId}`).emit('contact:created', contact);
  };

  const emitContactUpdated = (organizationId: string, contact: any) => {
    io.to(`org:${organizationId}`).emit('contact:updated', contact);
  };

  const emitKnowledgeBaseUpdate = (organizationId: string, item: any) => {
    io.to(`org:${organizationId}`).emit('knowledge:updated', item);
  };

  const emitKnowledgeBaseCreated = (organizationId: string, item: any) => {
    io.to(`org:${organizationId}`).emit('knowledge:created', item);
  };

  const emitKnowledgeBaseDeleted = (organizationId: string, itemId: string) => {
    io.to(`org:${organizationId}`).emit('knowledge:deleted', itemId);
  };

  const emitPhoneNumberUpdate = (organizationId: string, phone: any) => {
    io.to(`org:${organizationId}`).emit('phone:updated', phone);
  };

  const emitPhoneNumberCreated = (organizationId: string, phone: any) => {
    io.to(`org:${organizationId}`).emit('phone:created', phone);
  };

  const emitOrganizationUpdate = (organizationId: string, org: any) => {
    io.to(`org:${organizationId}`).emit('organization:updated', org);
  };

  const emitCreditsUpdate = (organizationId: string, credits: number) => {
    io.to(`org:${organizationId}`).emit('credits:updated', { credits });
  };

  // Store io instance and helper functions for use in other parts of the app
  (app as any).io = io;
  (app as any).emitCallUpdate = emitCallUpdate;
  (app as any).emitCallCreated = emitCallCreated;
  (app as any).emitCallDeleted = emitCallDeleted;
  (app as any).emitMetricsUpdate = emitMetricsUpdate;
  (app as any).emitAgentUpdate = emitAgentUpdate;
  (app as any).emitAgentCreated = emitAgentCreated;
  (app as any).emitAgentDeleted = emitAgentDeleted;
  (app as any).emitLeadUpdate = emitLeadUpdate;
  (app as any).emitLeadCreated = emitLeadCreated;
  (app as any).emitLeadDeleted = emitLeadDeleted;
  (app as any).emitCampaignUpdate = emitCampaignUpdate;
  (app as any).emitCampaignCreated = emitCampaignCreated;
  (app as any).emitCampaignDeleted = emitCampaignDeleted;
  (app as any).emitKnowledgeBaseUpdate = emitKnowledgeBaseUpdate;
  (app as any).emitKnowledgeBaseCreated = emitKnowledgeBaseCreated;
  (app as any).emitKnowledgeBaseDeleted = emitKnowledgeBaseDeleted;
  (app as any).emitPhoneNumberUpdate = emitPhoneNumberUpdate;
  (app as any).emitPhoneNumberCreated = emitPhoneNumberCreated;
  (app as any).emitOrganizationUpdate = emitOrganizationUpdate;
  (app as any).emitCreditsUpdate = emitCreditsUpdate;
  (app as any).emitContactCreated = emitContactCreated;
  (app as any).emitContactUpdated = emitContactUpdated;

  // Start automatic phone number syncing with WebSocket support

  // Start sync after a short delay to ensure everything is initialized
  setTimeout(() => {
    startPhoneNumberSync(emitPhoneNumberUpdate, emitPhoneNumberCreated);
  }, 2000);

  // Phone number sync API endpoints
  app.post('/api/phone-numbers/sync/manual', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await triggerManualSync(emitPhoneNumberUpdate, emitPhoneNumberCreated);
      res.json({
        success: true,
        message: 'Phone numbers synced successfully',
        stats
      });
    } catch (error: any) {
      console.error("Error in manual phone number sync:", error);
      res.status(500).json({ message: "Failed to sync phone numbers", error: error.message });
    }
  });

  app.get('/api/phone-numbers/sync/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = getSyncStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error getting sync stats:", error);
      res.status(500).json({ message: "Failed to get sync stats", error: error.message });
    }
  });

  // Auto-assign leads using "AI" (Simulated logic for now, or simple round-robin)
  app.post('/api/leads/auto-assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Get unassigned leads
      const leads = await storage.getLeads(user.organizationId);
      const unassignedLeads = leads.filter(l => !l.assignedAgentId && l.status === 'new');

      if (unassignedLeads.length === 0) {
        return res.json({ message: "No new unassigned leads found", count: 0 });
      }

      // Get available agents
      const agents = await storage.getAIAgents(user.organizationId);
      if (agents.length === 0) {
        return res.status(400).json({ message: "No AI agents available for assignment" });
      }

      // Use AI to match leads to agents
      const sanitizedLeads = unassignedLeads.map(l => ({
        ...l,
        company: l.company || undefined,
        notes: l.notes || undefined
      }));
      const kbs = await storage.getKnowledgeBase(req.user.organizationId);
      // Filter by agent if needed, or if getKnowledgeBaseByAgent exists use that
      // But based on error, getKnowledgeBase takes 1 arg (orgId?)
      // Wait, 1328 uses req.params.id. So maybe getKnowledgeBase(id) ?
      // I will infer from storage.ts view.

      // Fixing sanitize
      const sanitizedAgents = agents.map(a => ({
        ...a,
        description: a.description || undefined,
        systemPrompt: a.systemPrompt || undefined
      }));
      const assignments = await matchLeadsToAgents(sanitizedLeads, sanitizedAgents);
      let assignedCount = 0;

      for (const lead of unassignedLeads) {
        const assignedAgentId = assignments[lead.id];
        if (assignedAgentId) {
          const agent = agents.find(a => a.id === assignedAgentId);
          if (agent) {
            await storage.updateLead(lead.id, user.organizationId, {
              assignedAgentId: agent.id,
              status: 'contacted',
              aiSummary: `Auto-assigned to ${agent.name} based on AI matching analysis.`,
              notes: (lead.notes || '') + `\n[System]: Auto-assigned to ${agent.name} at ${new Date().toISOString()}`
            });
            assignedCount++;
          }
        }
      }

      res.json({
        message: `Successfully auto-assigned ${assignedCount} leads using AI matching`,
        count: assignedCount
      });
    } catch (error) {
      console.error("Error auto-assigning leads:", error);
      res.status(500).json({ message: "Failed to auto-assign leads" });
    }
  });

  return httpServer;
}
