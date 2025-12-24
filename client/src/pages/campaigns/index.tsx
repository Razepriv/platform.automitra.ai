import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";

export default function CampaignsPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch campaigns (replace with real orgId logic)
  const fetchCampaigns = () => {
    fetch(`/api/campaigns-list?organizationId=org-demo`)
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []));
  };

  // Initial fetch
  useState(() => { fetchCampaigns(); }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (f) {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setLeads(results.data as any[]);
        },
        error: () => {
          toast({ title: "Error", description: "Failed to parse file", variant: "destructive" });
        },
      });
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName || leads.length === 0) {
      toast({ title: "Error", description: "Campaign name and leads required", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName, contacts: leads, organizationId: "org-demo" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create campaign");
      toast({ title: "Success", description: "Campaign created and leads imported" });
      setCampaignName("");
      setFile(null);
      setLeads([]);
      setShowCreate(false);
      fetchCampaigns();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunCampaign = async (campaignId: string) => {
    try {
      const res = await fetch("/api/campaigns-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, organizationId: "org-demo" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to start outbound calling");
      const data = await res.json();
      toast({ title: "Run Campaign", description: `Outbound calling started for campaign ${campaignId} (${data.results.length} contacts)` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Campaigns</h1>
      <Button className="mb-4" onClick={() => setShowCreate(true)}>
        + Create Campaign
      </Button>
      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Enter campaign name" />
            </div>
            <div>
              <Label>Upload Leads (CSV/Excel)</Label>
              <Input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} />
            </div>
            {leads.length > 0 && (
              <div className="border rounded p-2 max-h-40 overflow-auto">
                <div className="font-bold mb-1">Preview ({leads.length} leads)</div>
                <table className="text-xs w-full">
                  <thead>
                    <tr>
                      {Object.keys(leads[0]).map((k) => <th key={k} className="px-1 text-left">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((v, j) => <td key={j} className="px-1">{v as string}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leads.length > 10 && <div className="text-muted-foreground text-xs">...and {leads.length - 10} more</div>}
              </div>
            )}
            <Button onClick={handleCreateCampaign} disabled={isUploading || !campaignName || leads.length === 0}>
              {isUploading ? "Creating..." : "Create Campaign & Import Leads"}
            </Button>
          </CardContent>
        </Card>
      )}
      <div>
        {campaigns.length === 0 ? (
          <div className="text-gray-500">No campaigns yet.</div>
        ) : (
          <ul>
            {campaigns.map((c) => (
              <li key={c.id} className="mb-4 border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.contacts?.length || 0} contacts</div>
                </div>
                <Button className="mt-2 md:mt-0" onClick={() => handleRunCampaign(c.id)}>
                  Run Campaign
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
