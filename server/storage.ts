// ...existing code...
// Reference: javascript_log_in_with_replit and javascript_database integrations
import {
  users,
  organizations,
  aiAgents,
  phoneNumbers,
  leads,
  calls,
  knowledgeBase,
  usageTracking,
  campaigns,
  channelPartners,
  visits,
  type User,
  type UpsertUser,
  type AiAgent,
  type InsertAiAgent,
  type CreateAiAgentInput,
  type UpdateAiAgentInput,
  type PhoneNumber,
  type InsertPhoneNumber,
  type Lead,
  type InsertLead,
  type Call,
  type InsertCall,
  type KnowledgeBase,
  type InsertKnowledgeBase,
  type CreateKnowledgeBaseInput,
  type UpdateKnowledgeBaseInput,
  type UsageTracking,
  type InsertUsageTracking,
  type DashboardMetrics,
  type CallMetrics,
  type AgentPerformance,
  type AnalyticsMetrics,
  type BillingMetrics,
  type Campaign,
  type InsertCampaign,
  type ChannelPartner,
  type InsertChannelPartner,
  type Visit,
  type InsertVisit,
  type Organization,
} from "@shared/schema";
import { contacts, campaignContacts } from "@shared/contacts-schema";
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string, organizationId?: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByOrganization(organizationId: string): Promise<User[]>;

  // Organization operations
  upsertOrganization(org: { name: string; domain: string }): Promise<{ id: string; name: string; domain: string | null }>;
  getOrganization(organizationId: string): Promise<Organization | undefined>;
  updateOrganizationWhitelabel(organizationId: string, whitelabel: { companyName?: string; logoUrl?: string; primaryColor?: string }): Promise<Organization | undefined>;

  // Campaign operations
  getCampaigns(organizationId: string): Promise<Campaign[]>;
  getCampaign(id: string, organizationId: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, organizationId: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string, organizationId: string): Promise<boolean>;
  createAIAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAIAgent(id: string, organizationId: string, agent: UpdateAiAgentInput): Promise<AiAgent | undefined>;
  deleteAIAgent(id: string, organizationId: string): Promise<boolean>;
  getPhoneNumber(id: string, organizationId: string): Promise<PhoneNumber | undefined>;
  createPhoneNumber(phone: InsertPhoneNumber): Promise<PhoneNumber>;
  updatePhoneNumber(id: string, organizationId: string, phone: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined>;
  getLeads(organizationId: string): Promise<Lead[]>;
  getLead(id: string, organizationId: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  createLeadsBulk(leads: InsertLead[], organizationId: string): Promise<Lead[]>;
  updateLead(id: string, organizationId: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  getLeadsByAgent(agentId: string, organizationId: string): Promise<Lead[]>;
  getCalls(organizationId: string): Promise<Call[]>;
  getCallsByAgent(agentId: string, organizationId: string): Promise<Call[]>;
  getCall(id: string, organizationId: string): Promise<Call | undefined>;
  getCallByBolnaCallId(bolnaCallId: string): Promise<Call | undefined>;
  getCallByExotelSid(exotelSid: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, organizationId: string, call: Partial<InsertCall>): Promise<Call | undefined>;


  // Channel Partner operations
  getChannelPartners(organizationId: string): Promise<ChannelPartner[]>;
  getChannelPartner(id: string, organizationId: string): Promise<ChannelPartner | undefined>;
  createChannelPartner(partner: InsertChannelPartner): Promise<ChannelPartner>;
  createChannelPartnersBulk(partners: InsertChannelPartner[], organizationId: string): Promise<ChannelPartner[]>;
  updateChannelPartner(id: string, organizationId: string, partner: Partial<InsertChannelPartner>): Promise<ChannelPartner | undefined>;

  // Call operations
  getCalls(organizationId: string): Promise<Call[]>;
  getCallsByAgent(agentId: string, organizationId: string): Promise<Call[]>;
  getCall(id: string, organizationId: string): Promise<Call | undefined>;
  getCallByBolnaCallId(bolnaCallId: string): Promise<Call | undefined>;
  getCallByExotelSid(exotelSid: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, organizationId: string, call: Partial<InsertCall>): Promise<Call | undefined>;

  // Visit operations
  getVisits(organizationId: string): Promise<Visit[]>;
  getVisitsByManager(managerId: string, organizationId: string): Promise<Visit[]>;
  createVisit(visit: InsertVisit): Promise<Visit>;
  updateVisit(id: string, organizationId: string, visit: Partial<InsertVisit>): Promise<Visit | undefined>;

  // Knowledge Base operations (tenant-safe types)
  getKnowledgeBase(organizationId: string): Promise<KnowledgeBase[]>;
  getKnowledgeBaseByAgent(agentId: string, organizationId: string): Promise<KnowledgeBase[]>;
  getKnowledgeBaseItem(id: string, organizationId: string): Promise<KnowledgeBase | undefined>;
  createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase>;
  updateKnowledgeBase(id: string, organizationId: string, knowledge: UpdateKnowledgeBaseInput): Promise<KnowledgeBase | undefined>;
  deleteKnowledgeBase(id: string, organizationId: string): Promise<boolean>;

  // Usage Tracking operations
  getUsageTracking(organizationId: string, daysAgo?: number): Promise<UsageTracking[]>;
  createUsageTracking(usage: InsertUsageTracking): Promise<UsageTracking>;

  // Analytics operations
  getDashboardMetrics(organizationId: string): Promise<DashboardMetrics>;
  getAnalyticsMetrics(organizationId: string, daysAgo: number): Promise<AnalyticsMetrics>;
  getCallMetrics(organizationId: string, daysAgo: number): Promise<CallMetrics[]>;
  getAgentPerformance(organizationId: string, daysAgo: number): Promise<AgentPerformance[]>;

  // Billing operations
  getBillingMetrics(organizationId: string): Promise<BillingMetrics>;
}

export class DatabaseStorage implements IStorage {
  // AI Agent operations
  async createAIAgent(agent: InsertAiAgent): Promise<AiAgent> {
    const [created] = await db.insert(aiAgents).values(agent).returning();
    return created;
  }
  async updateAIAgent(id: string, organizationId: string, agent: UpdateAiAgentInput): Promise<AiAgent | undefined> {
    const [updated] = await db.update(aiAgents)
      .set({ ...agent, updatedAt: new Date() })
      .where(and(eq(aiAgents.id, id), eq(aiAgents.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }
  async deleteAIAgent(id: string, organizationId: string): Promise<boolean> {
    const result = await db.delete(aiAgents)
      .where(and(eq(aiAgents.id, id), eq(aiAgents.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }
  // Phone Number operations
  async getPhoneNumber(id: string, organizationId: string): Promise<PhoneNumber | undefined> {
    const [phone] = await db.select().from(phoneNumbers)
      .where(and(eq(phoneNumbers.id, id), eq(phoneNumbers.organizationId, organizationId)));
    return phone || undefined;
  }
  async createPhoneNumber(phone: InsertPhoneNumber): Promise<PhoneNumber> {
    const [created] = await db.insert(phoneNumbers).values(phone).returning();
    return created;
  }
  async updatePhoneNumber(id: string, organizationId: string, phone: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined> {
    const [updated] = await db.update(phoneNumbers)
      .set({ ...phone, updatedAt: new Date() })
      .where(and(eq(phoneNumbers.id, id), eq(phoneNumbers.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }
  // Lead operations
  async getLeads(organizationId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.organizationId, organizationId));
  }
  async getLead(id: string, organizationId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads)
      .where(and(eq(leads.id, id), eq(leads.organizationId, organizationId)));
    return lead || undefined;
  }
  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }
  async createLeadsBulk(leadsArr: InsertLead[], organizationId: string): Promise<Lead[]> {
    const created = await db.insert(leads).values(leadsArr.map(l => ({ ...l, organizationId }))).returning();
    return created;
  }
  async updateLead(id: string, organizationId: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
    const [updated] = await db.update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }
  async getLeadsByAgent(agentId: string, organizationId: string): Promise<Lead[]> {
    return await db.select().from(leads)
      .where(and(eq(leads.assignedAgentId, agentId), eq(leads.organizationId, organizationId)));
  }
  // Call operations
  async getCalls(organizationId: string): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.organizationId, organizationId));
  }
  async getCallsByAgent(agentId: string, organizationId: string): Promise<Call[]> {
    return await db.select().from(calls)
      .where(and(eq(calls.agentId, agentId), eq(calls.organizationId, organizationId)));
  }
  async getCall(id: string, organizationId: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls)
      .where(and(eq(calls.id, id), eq(calls.organizationId, organizationId)));
    return call || undefined;
  }
  // NOTE: These methods don't filter by organizationId because they're used in webhook contexts
  // where we only have the external ID. The calling code MUST validate organizationId after retrieval.
  async getCallByBolnaCallId(bolnaCallId: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls)
      .where(eq(calls.bolnaCallId, bolnaCallId));
    return call || undefined;
  }
  async getCallByExotelSid(exotelSid: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls)
      .where(eq(calls.exotelCallSid, exotelSid));
    return call || undefined;
  }
  async createCall(call: InsertCall): Promise<Call> {
    const [created] = await db.insert(calls).values(call).returning();
    return created;
  }
  async updateCall(id: string, organizationId: string, call: Partial<InsertCall>): Promise<Call | undefined> {
    const [updated] = await db.update(calls)
      .set({ ...call, updatedAt: new Date() })
      .where(and(eq(calls.id, id), eq(calls.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }
  // Contact operations

  // Phone Number operations
  async getPhoneNumbers(organizationId: string): Promise<PhoneNumber[]> {
    return await db.select().from(phoneNumbers).where(eq(phoneNumbers.organizationId, organizationId));
  }
  async createContact(contactData: { organizationId: string, name: string, email?: string, phone?: string, company?: string }) {
    const [contact] = await db.insert(contacts).values(contactData).returning();
    return contact;
  }

  async getContacts(organizationId: string) {
    // List all contacts for an organization
    return await db.select().from(contacts).where(eq(contacts.organizationId, organizationId));
  }
  // User operations
  async getUser(id: string, organizationId?: string): Promise<User | undefined> {
    if (organizationId) {
      const [user] = await db.select().from(users)
        .where(and(eq(users.id, id), eq(users.organizationId, organizationId)));
      return user || undefined;
    }
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByOrganization(organizationId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  // Organization operations
  async upsertOrganization(org: { name: string; domain: string }): Promise<{ id: string; name: string; domain: string | null }> {
    // For absolute isolation, each user gets their own organization
    // Domain is unique per user (user-{userId}), so this will create new org if domain doesn't exist
    const [existingOrg] = await db.select().from(organizations).where(eq(organizations.domain, org.domain));
    if (existingOrg) {
      return existingOrg;
    }
    // Create new organization - each user gets their own isolated workspace
    const [newOrg] = await db.insert(organizations).values(org).returning();
    console.log(`[Isolation] Created new isolated organization: ${newOrg.id} for domain: ${org.domain}`);
    return newOrg;
  }

  async getOrganization(organizationId: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations)
      .where(eq(organizations.id, organizationId));
    return org || undefined;
  }

  async updateOrganizationWhitelabel(
    organizationId: string,
    whitelabel: { companyName?: string; logoUrl?: string; primaryColor?: string }
  ): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ ...whitelabel, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning();
    return org || undefined;
  }

  // Campaign operations
  async getCampaigns(organizationId: string): Promise<Campaign[]> {
    return await db.select().from(campaigns)
      .where(eq(campaigns.organizationId, organizationId))
      .orderBy(desc(campaigns.createdAt));
  }
  async getCampaign(id: string, organizationId: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.organizationId, organizationId)));
    return campaign || undefined;
  }

  async createCampaign(campaignData: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(campaignData).returning();
    return campaign;
  }

  async updateCampaign(id: string, organizationId: string, campaignData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [campaign] = await db
      .update(campaigns)
      .set({ ...campaignData, updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), eq(campaigns.organizationId, organizationId)))
      .returning();
    return campaign || undefined;
  }

  async deleteCampaign(id: string, organizationId: string): Promise<boolean> {
    const result = await db
      .delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  async addContactToCampaign(campaignId: string, contactId: string): Promise<boolean> {
    // Add a contact to a campaign (campaign_contacts table)
    try {
      await db.insert(campaignContacts).values({ campaignId, contactId }).onConflictDoNothing();
      return true;
    } catch (e) {
      return false;
    }
  }

  async addContactToGlobalList(_campaignId: string, contactId: string): Promise<boolean> {
    // Add a contact to the global list (set status to active if not already)
    try {
      await db.update(contacts).set({ status: "active" }).where(eq(contacts.id, contactId));
      return true;
    } catch (e) {
      return false;
    }
  }

  // AI Agent operations
  async getAIAgents(organizationId: string): Promise<AiAgent[]> {
    // CRITICAL: Filter by organizationId for multi-tenant isolation
    return await db.select().from(aiAgents)
      .where(eq(aiAgents.organizationId, organizationId))
      .orderBy(desc(aiAgents.createdAt));
  }

  async getAIAgent(id: string, organizationId: string): Promise<AiAgent | undefined> {
    const [agent] = await db.select().from(aiAgents)
      .where(and(eq(aiAgents.id, id), eq(aiAgents.organizationId, organizationId)));
    return agent || undefined;
  }

  // Add a stub implementation for getDashboardMetrics
  async getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
    // Return dummy data or implement as needed
    return {
      totalCalls: 0,
      totalAgents: 0,
      activeAgents: 0,
      successRate: 0,
      conversationsToday: 0,
      usageCostToday: 0,
      avgCallDuration: 0,
    };
  }

  // --- STUBS for missing IStorage methods ---
  async getChannelPartners(organizationId: string): Promise<ChannelPartner[]> {
    return await db.select().from(channelPartners).where(eq(channelPartners.organizationId, organizationId));
  }
  async getChannelPartner(id: string, organizationId: string): Promise<ChannelPartner | undefined> {
    const [partner] = await db.select().from(channelPartners)
      .where(and(eq(channelPartners.id, id), eq(channelPartners.organizationId, organizationId)));
    return partner || undefined;
  }
  async createChannelPartner(partner: InsertChannelPartner): Promise<ChannelPartner> {
    const [created] = await db.insert(channelPartners).values(partner).returning();
    return created;
  }
  async createChannelPartnersBulk(partners: InsertChannelPartner[], organizationId: string): Promise<ChannelPartner[]> {
    const created = await db.insert(channelPartners)
      .values(partners.map(p => ({ ...p, organizationId })))
      .returning();
    return created;
  }
  async updateChannelPartner(id: string, organizationId: string, partner: Partial<InsertChannelPartner>): Promise<ChannelPartner | undefined> {
    const [updated] = await db.update(channelPartners)
      .set({ ...partner, updatedAt: new Date() })
      .where(and(eq(channelPartners.id, id), eq(channelPartners.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }

  async getVisits(organizationId: string): Promise<Visit[]> {
    return await db.select().from(visits).where(eq(visits.organizationId, organizationId));
  }
  async getVisitsByManager(managerId: string, organizationId: string): Promise<Visit[]> {
    return await db.select().from(visits)
      .where(and(eq(visits.managerId, managerId), eq(visits.organizationId, organizationId)));
  }
  async createVisit(visit: InsertVisit): Promise<Visit> {
    const [created] = await db.insert(visits).values(visit).returning();
    return created;
  }
  async updateVisit(id: string, organizationId: string, visit: Partial<InsertVisit>): Promise<Visit | undefined> {
    const [updated] = await db.update(visits)
      .set({ ...visit, updatedAt: new Date() })
      .where(and(eq(visits.id, id), eq(visits.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }
  async getKnowledgeBase(organizationId: string): Promise<KnowledgeBase[]> {
    return await db.select().from(knowledgeBase).where(eq(knowledgeBase.organizationId, organizationId));
  }
  async getKnowledgeBaseByAgent(agentId: string, organizationId: string): Promise<KnowledgeBase[]> {
    return await db.select().from(knowledgeBase)
      .where(and(eq(knowledgeBase.agentId, agentId), eq(knowledgeBase.organizationId, organizationId)));
  }
  async getKnowledgeBaseItem(id: string, organizationId: string): Promise<KnowledgeBase | undefined> {
    const [kb] = await db.select().from(knowledgeBase)
      .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.organizationId, organizationId)));
    return kb || undefined;
  }
  async createKnowledgeBase(knowledge: InsertKnowledgeBase): Promise<KnowledgeBase> {
    const [created] = await db.insert(knowledgeBase).values(knowledge).returning();
    return created;
  }
  async updateKnowledgeBase(id: string, organizationId: string, knowledge: UpdateKnowledgeBaseInput): Promise<KnowledgeBase | undefined> {
    const [updated] = await db.update(knowledgeBase)
      .set({ ...knowledge, updatedAt: new Date() })
      .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.organizationId, organizationId)))
      .returning();
    return updated || undefined;
  }
  async deleteKnowledgeBase(id: string, organizationId: string): Promise<boolean> {
    const result = await db.delete(knowledgeBase)
      .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.organizationId, organizationId)))
      .returning();
    return result.length > 0;
  }

  async getUsageTracking(organizationId: string, daysAgo?: number): Promise<UsageTracking[]> {
    return await db.select().from(usageTracking).where(eq(usageTracking.organizationId, organizationId));
  }
  async createUsageTracking(usage: InsertUsageTracking): Promise<UsageTracking> {
    const [created] = await db.insert(usageTracking).values(usage).returning();
    return created;
  }

  async getAnalyticsMetrics(organizationId: string, daysAgo: number): Promise<AnalyticsMetrics> {
    // Return zero-filled stub for now to prevent runtime errors
    return {
      totalCalls: 0,
      totalDuration: 0,
      totalCost: 0,
      averageCallDuration: 0,
      averageCostPerCall: 0,
      sentimentAnalysis: { positive: 0, neutral: 0, negative: 0 },
      callOutcomeDistribution: {},
      callVolumeByHour: []
    };
  }
  async getCallMetrics(organizationId: string, daysAgo: number): Promise<CallMetrics[]> {
    return [];
  }
  async getAgentPerformance(organizationId: string, daysAgo: number): Promise<AgentPerformance[]> {
    return [];
  }
  async getBillingMetrics(organizationId: string): Promise<BillingMetrics> {
    return {
      totalBalance: 0,
      totalSpent: 0,
      monthlySpending: [],
      costBreakdown: {
        telephony: 0,
        llm: 0,
        platform: 0
      }
    };
  }
}

// Export a singleton instance for use throughout the app
export const storage = new DatabaseStorage();
