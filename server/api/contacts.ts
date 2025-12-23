import type { NextApiRequest, NextApiResponse } from "express";
import { storage } from "../../server/storage";

// GET /api/contacts - list all contacts for org
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { organizationId } = req.query;
  if (!organizationId) {
    return res.status(400).json({ message: "organizationId required" });
  }
  // Use persistent DB-backed contacts table
  const contacts = await storage.getContacts(organizationId as string);
  res.json({ contacts });
}
