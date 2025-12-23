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
  addContactToCampaign(campaignId: string, contactId: string): Promise<boolean>;
  addContactToGlobalList(campaignId: string, contactId: string): Promise<boolean>;

  // AI Agent operations (tenant-safe types - never accept organizationId from client)
  getAIAgents(organizationId: string): Promise<AiAgent[]>;
  getAIAgent(id: string, organizationId: string): Promise<AiAgent | undefined>;
  createAIAgent(agent: InsertAiAgent): Promise<AiAgent>;
  updateAIAgent(id: string, organizationId: string, agent: UpdateAiAgentInput): Promise<AiAgent | undefined>;
  deleteAIAgent(id: string, organizationId: string): Promise<boolean>;

  // Phone Number operations
  getPhoneNumbers(organizationId: string): Promise<PhoneNumber[]>;
  getPhoneNumber(id: string, organizationId: string): Promise<PhoneNumber | undefined>;
  createPhoneNumber(phone: InsertPhoneNumber): Promise<PhoneNumber>;
  updatePhoneNumber(id: string, organizationId: string, phone: Partial<InsertPhoneNumber>): Promise<PhoneNumber | undefined>;

  // Lead operations
  getLeads(organizationId: string): Promise<Lead[]>;
  getLead(id: string, organizationId: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  createLeadsBulk(leads: InsertLead[], organizationId: string): Promise<Lead[]>;
  updateLead(id: string, organizationId: string, lead: Partial<InsertLead>): Promise<Lead | undefined>;
  getLeadsByAgent(agentId: string, organizationId: string): Promise<Lead[]>;

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
    const [existingOrg] = await db.select().from(organizations).where(eq(organizations.domain, org.domain));
    if (existingOrg) {
      return existingOrg;
    }
    const [newOrg] = await db.insert(organizations).values(org).returning();
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
      await db.update(contacts).set({ status: "active" }).where(contacts.id.eq(contactId));
      return true;
    } catch (e) {
      return false;
    }
  }

  // AI Agent operations
  async getAIAgents(organizationId: string): Promise<AiAgent[]> {
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
      totalLeads: 0,
      totalMinutes: 0,
      // ...add other fields as needed
    };
  }
}

// Export a singleton instance for use throughout the app
export const storage = new DatabaseStorage();
