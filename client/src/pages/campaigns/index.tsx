import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonTable";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocketEvent } from "@/lib/useWebSocket";
import Papa from "papaparse";
import type { Campaign } from "@shared/schema";

export default function CampaignsPage() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch campaigns using proper API with authentication
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Real-time updates via WebSocket
  useWebSocketEvent('campaign:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
  }, []));

  useWebSocketEvent('campaign:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
  }, []));

  useWebSocketEvent('campaign:deleted', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
  }, []));

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

  const createCampaignMutation = useMutation({
    mutationFn: async (data: { name: string; contacts: any[] }) => {
      // Create campaign first
      const campaignRes = await apiRequest("POST", "/api/campaigns", {
        name: data.name,
        description: `Campaign with ${data.contacts.length} contacts`,
      });
      const campaign = await campaignRes.json();
      
      // Create leads from contacts
      if (data.contacts.length > 0) {
        const leadsData = data.contacts.map((contact: any) => ({
          name: contact.name || contact.Name || contact.contact_name || "Unknown",
          email: contact.email || contact.Email || contact.contact_email,
          phone: contact.phone || contact.Phone || contact.contact_phone,
          company: contact.company || contact.Company || contact.company_name,
          campaignId: campaign.id,
          status: "new",
        }));
        
        // Bulk create leads
        await apiRequest("POST", "/api/leads/upload", leadsData, {
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Success", description: "Campaign created and leads imported" });
      setCampaignName("");
      setFile(null);
      setLeads([]);
      setShowCreate(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create campaign", variant: "destructive" });
    },
  });

  const handleCreateCampaign = async () => {
    if (!campaignName || leads.length === 0) {
      toast({ title: "Error", description: "Campaign name and leads required", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      await createCampaignMutation.mutateAsync({ name: campaignName, contacts: leads });
    } finally {
      setIsUploading(false);
    }
  };

  const runCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", "/api/campaigns-run", { campaignId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Run Campaign", description: `Outbound calling started for campaign (${data.results?.length || 0} contacts)` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to start campaign", variant: "destructive" });
    },
  });

  const handleRunCampaign = async (campaignId: string) => {
    runCampaignMutation.mutate(campaignId);
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
            <Button 
              onClick={handleCreateCampaign} 
              disabled={isUploading || createCampaignMutation.isPending || !campaignName || leads.length === 0}
            >
              {(isUploading || createCampaignMutation.isPending) ? "Creating..." : "Create Campaign & Import Leads"}
            </Button>
          </CardContent>
        </Card>
      )}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No Campaigns Yet"
            description="Create your first campaign to start running automated outbound calls to your leads"
            action={
              <Button onClick={() => setShowCreate(true)}>
                Create Your First Campaign
              </Button>
            }
          />
        ) : (
          <ul>
            {campaigns.map((c) => (
              <li key={c.id} className="mb-4 border rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.totalLeads || 0} leads</div>
                </div>
                <Button 
                  className="mt-2 md:mt-0" 
                  onClick={() => handleRunCampaign(c.id)}
                  disabled={runCampaignMutation.isPending}
                >
                  {runCampaignMutation.isPending ? "Running..." : "Run Campaign"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
