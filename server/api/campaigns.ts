import type { NextApiRequest, NextApiResponse } from "express";
import { storage } from "../../server/storage";
import { db } from "../db";
import { contacts as contactsTable } from "@shared/contacts-schema";

// POST /api/campaigns - create campaign with contacts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { name, contacts, organizationId } = req.body;
  if (!name || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ message: "Name and contacts required" });
  }
  // Create campaign
  const campaign = await storage.createCampaign({ name, organizationId });
  // Add contacts to DB and campaign
  for (const contact of contacts) {
    let contactId = contact.id;
    if (!contactId) {
      // Insert new contact if not exists
      const [inserted] = await db.insert(contactsTable).values({
        organizationId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
      }).onConflictDoNothing().returning();
      contactId = inserted?.id;
    }
    if (contactId) {
      await storage.addContactToCampaign(campaign.id, contactId);
      await storage.addContactToGlobalList(campaign.id, contactId);
    }
  }
  res.json({ success: true, campaign });
}
