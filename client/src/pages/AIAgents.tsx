import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AgentFormDialog, AgentFormValues, agentFormSchema } from "@/components/AgentFormDialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Phone, Plus, Settings, Zap, Loader2, BookOpen, Mic, RefreshCw, Trash2, AlertTriangle, Search, Filter } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonCard } from "@/components/SkeletonTable";
import { Pagination } from "@/components/Pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWebSocketEvent } from "@/lib/useWebSocket";
import type { AiAgent, KnowledgeBase as KnowledgeBaseType, PhoneNumber } from "@shared/schema";
import { createAiAgentSchema } from "@shared/schema";
import { z } from "zod";

type BolnaVoice = {
  id?: string;
  voice_id?: string;
  name?: string;
  voice_name?: string;
  provider?: string;
};

type BolnaModel = {
  id?: string;
  name?: string;
};

export default function AIAgents() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create"|"edit">("create");
  const [formInitialValues, setFormInitialValues] = useState<Partial<AgentFormValues> | undefined>(undefined);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const { toast } = useToast();

  // Auto-open dialog from Quick Actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create') {
      setDialogMode("create");
      setFormInitialValues(undefined);
      setIsDialogOpen(true);
      params.delete('action');
      const newUrl = params.toString() ? 
        `${window.location.pathname}?${params.toString()}` : 
        window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  const {
    data: agents,
    isLoading,
    isError,
    error
  } = useQuery<AiAgent[]>({
    queryKey: ['/api/ai-agents'],
  });

  // Real-time updates via WebSocket
  useWebSocketEvent('agent:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
  }, []));

  useWebSocketEvent('agent:updated', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
  }, []));

  useWebSocketEvent('agent:deleted', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
  }, []));

  // Filter agents based on search and status
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    let filtered = agents;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent =>
        agent.name?.toLowerCase().includes(query) ||
        agent.description?.toLowerCase().includes(query) ||
        agent.voiceName?.toLowerCase().includes(query) ||
        agent.model?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(agent => agent.status === statusFilter);
    }

    return filtered;
  }, [agents, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const showingFrom = filteredAgents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, filteredAgents.length);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // State for voice provider filter
  const [voiceProviderFilter, setVoiceProviderFilter] = useState<string>('all');

  // Fetch Bolna voices and models
  const { data: bolnaVoices = [], isLoading: loadingVoices } = useQuery<BolnaVoice[]>({
    queryKey: ['/api/bolna/voices', voiceProviderFilter],
    enabled: isDialogOpen,
    queryFn: async () => {
      const url = voiceProviderFilter === 'all' 
        ? '/api/bolna/voices'
        : `/api/bolna/voices?provider=${voiceProviderFilter}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch voices');
      return response.json();
    },
  });

  // Get unique providers from voices
  const availableProviders = useMemo(() => {
    const providers = new Set<string>();
    bolnaVoices.forEach(voice => {
      if (voice.provider) {
        providers.add(voice.provider.toLowerCase());
      }
    });
    return Array.from(providers).sort();
  }, [bolnaVoices]);

  const { data: bolnaModels = [], isLoading: loadingModels } = useQuery<BolnaModel[]>({
    queryKey: ['/api/bolna/models'],
    enabled: isDialogOpen,
  });

  // Fetch Exotel phone numbers
  const { data: exotelPhoneNumbers = [], isLoading: loadingPhoneNumbers, refetch: refetchPhoneNumbers } = useQuery<PhoneNumber[]>({
    queryKey: ['/api/phone-numbers'],
    enabled: isDialogOpen,
  });

  // Auto-sync phone numbers from Exotel when dialog opens if none exist
  useEffect(() => {
    if (isDialogOpen && !loadingPhoneNumbers && exotelPhoneNumbers.length === 0) {
      // Trigger sync in background
      fetch('/api/phone-numbers/sync')
        .then(() => refetchPhoneNumbers())
        .catch(err => console.error('Failed to sync phone numbers:', err));
    }
  }, [isDialogOpen, loadingPhoneNumbers, exotelPhoneNumbers.length, refetchPhoneNumbers]);

  // Fetch knowledge base items
  const { data: knowledgeBaseItems = [], isLoading: loadingKnowledgeBase } = useQuery<KnowledgeBaseType[]>({
    queryKey: ['/api/knowledge-base'],
    enabled: isDialogOpen,
  });

  // Handler to open dialog for create
  const handleOpenCreate = (template?: Partial<AgentFormValues>) => {
    setDialogMode("create");
    setFormInitialValues(template);
    setIsDialogOpen(true);
    setSelectedAgent(null);
  };

  // Handler to open dialog for edit
  const handleOpenEdit = (agent: AiAgent) => {
    setDialogMode("edit");
    setFormInitialValues(agent);
    setSelectedAgent(agent);
    setIsDialogOpen(true);
  };

  // Reset voice provider filter when dialog opens
  useEffect(() => {
    if (isDialogOpen && dialogMode === "create") {
      setVoiceProviderFilter('all');
      // Don't set voiceProvider to 'all' - keep the default 'elevenlabs'
    }
  }, [isDialogOpen, dialogMode]);

  const createMutation = useMutation({
    mutationFn: async (data: AgentFormValues) => {
      // Send all form data to backend - backend will construct Bolna config
      const payload: any = {
        ...data,
        // Ensure required fields have defaults
        model: data.model || data.llmModel || "gpt-4",
        provider: data.provider || data.llmProvider || "openai",
        voiceProvider: data.voiceProvider || data.audioVoiceProvider || "elevenlabs",
        voiceId: data.voiceId || data.audioVoiceId,
        language: data.language || "en-US",
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens ?? 150,
        maxDuration: data.maxDuration ?? 600,
      };

      const res = await apiRequest('POST', '/api/ai-agents', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      setIsDialogOpen(false);
      setFormInitialValues(undefined);
      toast({
        title: "Success",
        description: "AI Agent created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create AI agent",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AgentFormValues) => {
      if (!selectedAgent) throw new Error("No agent selected");
      
      // Send all form data to backend - backend will construct Bolna config
      const payload: any = {
        ...data,
        // Ensure required fields have defaults
        model: data.model || data.llmModel || selectedAgent.model,
        provider: data.provider || data.llmProvider || selectedAgent.provider,
        voiceProvider: data.voiceProvider || data.audioVoiceProvider || selectedAgent.voiceProvider,
        voiceId: data.voiceId || data.audioVoiceId || selectedAgent.voiceId,
        language: data.language || selectedAgent.language,
      };

      const res = await apiRequest('PATCH', `/api/ai-agents/${selectedAgent.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      setIsDialogOpen(false);
      setSelectedAgent(null);
      setFormInitialValues(undefined);
      toast({
        title: "Success",
        description: "AI Agent updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update AI agent",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: AgentFormValues) => {
    if (dialogMode === "edit") {
      if (!selectedAgent) {
        toast({
          title: "Error",
          description: "No agent selected for editing",
          variant: "destructive",
        });
        return;
      }
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
    // Don't close dialog or clear state here - let mutation callbacks handle it
  };

  const syncMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest('POST', `/api/ai-agents/${agentId}/sync`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      toast({
        title: "Success",
        description: "Agent synced successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync agent",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await apiRequest('DELETE', `/api/ai-agents/${agentId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      toast({
        title: "Success",
        description: "AI Agent deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete AI agent",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-2">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Voice Agents</h1>
            <p className="text-muted-foreground mt-1">Manage your AI voice agents</p>
          </div>
          <Button data-testid="button-create-agent" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Create Agent
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <Bot className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Error loading AI Agents</h2>
        <p className="text-destructive mb-4">{error?.message || "Failed to load agents. Please try again later."}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-ai-agents">
            AI Voice Agents
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-subtitle">
            Manage your AI voice agents
          </p>
        </div>
        <Button onClick={() => handleOpenCreate()} data-testid="button-create-agent">
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Search and Filter Bar */}
      {agents.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents by name, description, voice, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {agents.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No AI Agents Yet"
          description="Create your first AI voice agent to start handling calls and automating conversations"
          action={
            <Button onClick={() => handleOpenCreate()} data-testid="button-create-first-agent">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          }
        />
      ) : filteredAgents.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No agents found"
          description={`No agents match your search "${searchQuery}"${statusFilter !== "all" ? ` and status "${statusFilter}"` : ""}`}
          action={
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedAgents.map((agent) => (
            <Card key={agent.id} className="hover-elevate" data-testid={`card-agent-${agent.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2" data-testid={`text-agent-name-${agent.id}`}>
                    {agent.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge
                      variant={agent.status === 'active' ? 'default' : 'secondary'}
                      className="text-xs"
                      data-testid={`badge-status-${agent.id}`}
                    >
                      {agent.status}
                    </Badge>
                    {!agent.bolnaAgentId && (
                      <Badge variant="destructive" className="text-xs">
                        Not Synced
                      </Badge>
                    )}
                  </div>
                </div>
                <Bot className="h-5 w-5 text-muted-foreground" />
              </CardHeader>

              <CardContent className="space-y-3">
                {!agent.bolnaAgentId && (!agent.voiceId || agent.voiceId === 'male' || agent.voiceId === 'female') && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="font-medium text-destructive mb-1">Configuration Error</p>
                      <p className="text-muted-foreground">
                        This agent has invalid voice configuration. Please delete and recreate with a valid voice from the voice library.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Voice</p>
                    <p className="font-medium" data-testid={`text-voice-${agent.id}`}>
                      {agent.voiceName || agent.voiceId || 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Language</p>
                    <p className="font-medium" data-testid={`text-language-${agent.id}`}>
                      {agent.language}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Model</p>
                    <p className="font-medium" data-testid={`text-model-${agent.id}`}>
                      {agent.model}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Provider</p>
                    <p className="font-medium" data-testid={`text-provider-${agent.id}`}>
                      {agent.provider}
                    </p>
                  </div>
                </div>

                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${agent.id}`}>
                    {agent.description}
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                {!agent.bolnaAgentId && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => syncMutation.mutate(agent.id)}
                    disabled={syncMutation.isPending}
                    data-testid={`button-sync-${agent.id}`}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Agent'}</span>
                  </Button>
                )}
                <div className="flex gap-2 w-full">
                  {agent.bolnaAgentId && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-call-${agent.id}`}
                      aria-label={`Initiate call with agent ${agent.name}`}
                    >
                      <Phone className="h-3 w-3 mr-1" aria-hidden="true" />
                      <span>Call</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenEdit(agent)}
                    data-testid={`button-settings-${agent.id}`}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${agent.name}"? This action cannot be undone.`)) {
                        deleteMutation.mutate(agent.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${agent.id}`}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          </div>
          {filteredAgents.length > itemsPerPage && (
            <div className="border-t pt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredAgents.length}
                showingFrom={showingFrom}
                showingTo={showingTo}
              />
            </div>
          )}
        </div>
      )}

      {agents && agents.length > 0 && (
        <div className="mt-8">
          <Card data-testid="card-stats">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-agents">
                    {agents.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Agents</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-active-agents">
                    {agents.filter(a => a.status === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-inactive-agents">
                    {agents.filter(a => a.status === 'inactive').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-testing-agents">
                    {agents.filter(a => a.status === 'testing').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Testing</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <AgentFormDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedAgent(null);
            setFormInitialValues(undefined);
          }
        }}
        initialValues={formInitialValues}
        onSubmit={handleSubmit}
        mode={dialogMode}
        loading={dialogMode === "edit" ? updateMutation.isLoading : createMutation.isLoading}
        models={bolnaModels}
        voices={bolnaVoices}
        providers={availableProviders}
        phoneNumbers={exotelPhoneNumbers}
        knowledgeBaseItems={knowledgeBaseItems}
        bolnaModels={bolnaModels}
        bolnaVoices={bolnaVoices}
      />
    </div>
  );
}
