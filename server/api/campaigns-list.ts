import type { NextApiRequest, NextApiResponse } from "express";
import { storage } from "../../server/storage";

// GET /api/campaigns - list all campaigns for org
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { organizationId } = req.query;
  if (!organizationId) {
    return res.status(400).json({ message: "organizationId required" });
  }
  const campaigns = await storage.getCampaigns(organizationId);
  res.json({ campaigns });
}
