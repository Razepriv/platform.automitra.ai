import { db } from "../db";
import { notifications, type InsertNotification } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function createNotification(
  notification: InsertNotification
): Promise<typeof notifications.$inferSelect> {
  const [created] = await db.insert(notifications).values(notification).returning();
  return created;
}

export async function createWelcomeNotification(userId: string, organizationId: string) {
  return createNotification({
    userId,
    organizationId,
    type: "welcome",
    title: "Welcome to the Platform! 🎉",
    message: "Thank you for joining! Get started by creating your first AI agent or making a call.",
    read: false,
  });
}

export async function createCallNotification(
  userId: string,
  organizationId: string,
  callId: string,
  direction: "inbound" | "outbound",
  contactName?: string
) {
  return createNotification({
    userId,
    organizationId,
    type: "call",
    title: direction === "inbound" ? "Incoming Call" : "Outbound Call Completed",
    message: direction === "inbound" 
      ? `New incoming call from ${contactName || "Unknown"}`
      : `Call completed with ${contactName || "contact"}`,
    read: false,
    metadata: { callId, direction },
  });
}

export async function createBillingNotification(
  userId: string,
  organizationId: string,
  message: string,
  metadata?: any
) {
  return createNotification({
    userId,
    organizationId,
    type: "billing",
    title: "Billing Update",
    message,
    read: false,
    metadata,
  });
}

export async function createUpdateNotification(
  userId: string,
  organizationId: string,
  title: string,
  message: string,
  metadata?: any
) {
  return createNotification({
    userId,
    organizationId,
    type: "update",
    title,
    message,
    read: false,
    metadata,
  });
}

export async function createLeadAssignedNotification(
  userId: string,
  organizationId: string,
  leadId: string,
  leadName: string,
  pipelineStage?: string
) {
  return createNotification({
    userId,
    organizationId,
    type: "lead_assigned",
    title: "Lead Assigned",
    message: pipelineStage
      ? `Lead "${leadName}" assigned to ${pipelineStage} pipeline`
      : `Lead "${leadName}" has been assigned`,
    read: false,
    metadata: { leadId, pipelineStage },
  });
}

