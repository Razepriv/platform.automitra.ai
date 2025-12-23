import React, { useState, useEffect, useCallback } from "react";
import BulkContactsForm from "./BulkContactsForm";
import ContactsList from "./ContactsList";
import { useSocketEvent } from "./useSocket";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: "", contacts: [] });

  const orgId = "org-demo"; // Replace with real orgId
  const fetchCampaigns = useCallback(() => {
    fetch(`/api/campaigns-list?organizationId=${orgId}`)
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []));
  }, [orgId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useSocketEvent('campaign:created', fetchCampaigns, orgId);
  useSocketEvent('campaign:updated', fetchCampaigns, orgId);
  useSocketEvent('contact:created', fetchCampaigns, orgId);
  useSocketEvent('contact:updated', fetchCampaigns, orgId);

  function handleAddContacts(contacts) {
    setNewCampaign((prev) => ({ ...prev, contacts: [...prev.contacts, ...contacts] }));
  }

  function handleCreateCampaign() {
    // API call to create campaign and add contacts
    fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCampaign.name,
        contacts: newCampaign.contacts,
        organizationId: "org-demo", // Replace with real orgId
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCampaigns((prev) => [...prev, data.campaign]);
        setShowCreate(false);
        setNewCampaign({ name: "", contacts: [] });
      });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Campaigns</h1>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={() => setShowCreate(true)}
      >
        + Create Campaign
      </button>
      {showCreate && (
        <div className="border p-4 rounded bg-white mb-6">
          <h2 className="text-lg font-semibold mb-2">New Campaign</h2>
          <input
            className="border rounded p-2 mb-2 w-full"
            placeholder="Campaign Name"
            value={newCampaign.name}
            onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))}
          />
          <BulkContactsForm onAdd={handleAddContacts} />
          {newCampaign.contacts.length > 0 && (
            <div className="mb-2">
              <div className="font-medium mb-1">Contacts to Add:</div>
              <ul className="list-disc ml-6 text-sm">
                {newCampaign.contacts.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mt-2"
            onClick={handleCreateCampaign}
            disabled={!newCampaign.name || newCampaign.contacts.length === 0}
          >
            Create Campaign
          </button>
        </div>
      )}
      <div>
        {campaigns.length === 0 ? (
          <div className="text-gray-500">No campaigns yet.</div>
        ) : (
          <ul>
            {campaigns.map((c) => (
              <li key={c.id}>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-500">{c.contacts.length} contacts</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ContactsList />
    </div>
  );
}
