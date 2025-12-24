import type { NextApiRequest, NextApiResponse } from "express";
import { storage } from "../../server/storage";
import { startCallPolling } from "../callPoller";
import { bolnaClient } from "../bolna";

// POST /api/campaigns-run - trigger outbound calls for a campaign
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
  const { campaignId, organizationId } = req.body;
  if (!campaignId || !organizationId) {
    return res.status(400).json({ message: "campaignId and organizationId required" });
  }
  // Get campaign and contacts
  const campaign = await storage.getCampaign(campaignId, organizationId);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  const contacts = campaign.contacts || [];
  if (contacts.length === 0) return res.status(400).json({ message: "No contacts in campaign" });

  // For each contact, trigger outbound call (simulate or use bolnaClient)
  const results = [];
  for (const contact of contacts) {
    try {
      // Replace with real outbound call logic
      const callResult = await bolnaClient.initiateOutboundCall({
        to: contact.phone,
        organizationId,
        campaignId,
        contactId: contact.id,
      });
      // Start polling for call status
      startCallPolling(callResult.bolnaCallId, callResult.callId, organizationId);
      results.push({ contactId: contact.id, status: "initiated", callId: callResult.callId });
    } catch (e: any) {
      results.push({ contactId: contact.id, status: "failed", error: e.message });
    }
  }
  res.json({ success: true, results });
}
