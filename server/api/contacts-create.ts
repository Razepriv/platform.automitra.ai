import type { NextApiRequest, NextApiResponse } from "express";
import { storage } from "../../server/storage";

// POST /api/contacts - create a new contact and emit real-time event
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { organizationId, name, email, phone, company } = req.body;
  if (!organizationId || !name) {
    return res.status(400).json({ message: "organizationId and name required" });
  }
  // Insert contact
  const contact = await storage.createContact({ organizationId, name, email, phone, company });
  // Emit real-time event
  if (req.app && (req.app as any).emitContactCreated) {
    (req.app as any).emitContactCreated(organizationId, contact);
  }
  res.json({ contact });
}
