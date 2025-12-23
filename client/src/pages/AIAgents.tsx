import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bot, Phone, Plus, Settings, Zap, Loader2, BookOpen, Mic, RefreshCw, Trash2, AlertTriangle } from "lucide-react";
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

// Form schema with numeric coercion - extends shared schema for alignment
// z.coerce handles HTML number input strings → numbers automatically
const agentFormSchema = createAiAgentSchema.extend({
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  maxDuration: z.coerce.number().int().positive().default(600),
  maxTokens: z.coerce.number().int().positive().default(150),

  // Advanced Bolna Config Fields
  webhookUrl: z.string().optional(),
  agentType: z.string().default("other"),
  
  // Transcriber
  transcriberProvider: z.string().default("deepgram"),
  transcriberModel: z.string().default("nova-2"),
  transcriberLanguage: z.string().default("en"),
  transcriberStream: z.boolean().default(true),
  transcriberSamplingRate: z.coerce.number().default(16000),
  transcriberEncoding: z.string().default("linear16"),
  transcriberEndpointing: z.coerce.number().default(100),
  
  // Synthesizer (extra)
  synthesizerStream: z.boolean().default(true),
  synthesizerBufferSize: z.coerce.number().default(150),
  synthesizerAudioFormat: z.string().default("wav"),
  
  // Task Config
  hangupAfterSilence: z.coerce.number().default(10),
  incrementalDelay: z.coerce.number().default(400),
  numberOfWordsForInterruption: z.coerce.number().default(2),
  hangupAfterLLMCall: z.boolean().default(false),
  callCancellationPrompt: z.string().optional(),
  backchanneling: z.boolean().default(false),
  backchannelingMessageGap: z.coerce.number().default(5),
  backchannelingStartDelay: z.coerce.number().default(5),
  ambientNoise: z.boolean().default(false),
  ambientNoiseTrack: z.string().default("office-ambience"),
  callTerminate: z.coerce.number().default(90),
  voicemail: z.boolean().default(false),
  disallowUnknownNumbers: z.boolean().default(false),
  
  // Ingest Source Config
  ingestSourceType: z.string().default("api"),
  ingestSourceUrl: z.string().optional(),
  ingestSourceAuthToken: z.string().optional(),
  ingestSourceName: z.string().optional(),
}).partial({
  description: true,
  voiceId: true,
  voiceName: true,
  systemPrompt: true,
  userPrompt: true,
  firstMessage: true,
  provider: true,
  voiceProvider: true,
  status: true,
  createdBy: true,
  bolnaAgentId: true,
  bolnaConfig: true,
  avgRating: true,
  knowledgeBaseIds: true,
  assignedPhoneNumberId: true,
  callForwardingEnabled: true,
  callForwardingNumber: true,
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

export default function AIAgents() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AiAgent | null>(null);
  const { toast } = useToast();

  // Auto-open dialog from Quick Actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create') {
      setIsCreateDialogOpen(true);
      // Clean URL: remove action param while preserving base path
      params.delete('action');
      const newUrl = params.toString() ? 
        `${window.location.pathname}?${params.toString()}` : 
        window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  const { data: agents, isLoading } = useQuery<AiAgent[]>({
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

  // State for voice provider filter
  const [voiceProviderFilter, setVoiceProviderFilter] = useState<string>('all');

  // Fetch Bolna voices and models
  const { data: bolnaVoices = [], isLoading: loadingVoices } = useQuery<BolnaVoice[]>({
    queryKey: ['/api/bolna/voices', voiceProviderFilter],
    enabled: isCreateDialogOpen || isEditDialogOpen,
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
    enabled: isCreateDialogOpen || isEditDialogOpen,
  });

  // Fetch Exotel phone numbers
  const { data: exotelPhoneNumbers = [], isLoading: loadingPhoneNumbers, refetch: refetchPhoneNumbers } = useQuery<PhoneNumber[]>({
    queryKey: ['/api/phone-numbers'],
    enabled: isCreateDialogOpen || isEditDialogOpen,
  });

  // Auto-sync phone numbers from Exotel when dialog opens if none exist
  useEffect(() => {
    if ((isCreateDialogOpen || isEditDialogOpen) && !loadingPhoneNumbers && exotelPhoneNumbers.length === 0) {
      // Trigger sync in background
      fetch('/api/phone-numbers/sync')
        .then(() => refetchPhoneNumbers())
        .catch(err => console.error('Failed to sync phone numbers:', err));
    }
  }, [isCreateDialogOpen, isEditDialogOpen, loadingPhoneNumbers, exotelPhoneNumbers.length, refetchPhoneNumbers]);

  // Fetch knowledge base items
  const { data: knowledgeBaseItems = [], isLoading: loadingKnowledgeBase } = useQuery<KnowledgeBaseType[]>({
    queryKey: ['/api/knowledge-base'],
    enabled: isCreateDialogOpen || isEditDialogOpen,
  });

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      model: "gpt-4",
      language: "en-US",
      voiceId: "",
      voiceName: "",
      systemPrompt: "",
      userPrompt: "",
      firstMessage: "",
      temperature: 0.7,
      maxDuration: 600,
      status: "active",
      provider: "openai",
      voiceProvider: "elevenlabs", // Default to elevenlabs instead of 'all'
      maxTokens: 150,
      knowledgeBaseIds: [],
      assignedPhoneNumberId: "",
      callForwardingEnabled: false,
      callForwardingNumber: "",
    },
  });

  // Reset voice provider filter when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen) {
      setVoiceProviderFilter('all');
      // Don't set voiceProvider to 'all' - keep the default 'elevenlabs'
    }
  }, [isCreateDialogOpen, form]);

  const createMutation = useMutation({
    mutationFn: async (data: AgentFormValues) => {
      // Build payload - only include defined fields from schema
      const payload: any = {
        name: data.name,
        model: data.model,
        language: data.language,
        temperature: data.temperature ?? 0.7,
        maxDuration: data.maxDuration ?? 600,
        maxTokens: data.maxTokens ?? 150,
        provider: data.provider ?? "openai",
        voiceProvider: data.voiceProvider ?? "elevenlabs",
        status: data.status ?? "active",
        callForwardingEnabled: data.callForwardingEnabled ?? false,
      };
      
      // Only add optional fields if they have values
      if (data.description) payload.description = data.description;
      if (data.voiceId) payload.voiceId = data.voiceId;
      if (data.voiceName) payload.voiceName = data.voiceName;
      if (data.systemPrompt) payload.systemPrompt = data.systemPrompt;
      if (data.userPrompt) payload.userPrompt = data.userPrompt;
      if (data.firstMessage) payload.firstMessage = data.firstMessage;
      if (data.knowledgeBaseIds && data.knowledgeBaseIds.length > 0) {
        payload.knowledgeBaseIds = data.knowledgeBaseIds;
      }
      if (data.assignedPhoneNumberId) payload.assignedPhoneNumberId = data.assignedPhoneNumberId;
      if (data.callForwardingNumber) payload.callForwardingNumber = data.callForwardingNumber;

      // Construct Bolna Config
      const bolnaConfig = {
        agent_config: {
          agent_name: data.name,
          agent_welcome_message: data.firstMessage,
          webhook_url: data.webhookUrl,
          agent_type: data.agentType,
          tasks: [{
            task_type: "conversation",
            tools_config: {
              llm_agent: {
                agent_type: "simple_llm_agent",
                agent_flow_type: "streaming",
                llm_config: {
                  agent_flow_type: "streaming",
                  provider: data.provider,
                  model: data.model,
                  max_tokens: data.maxTokens,
                  temperature: data.temperature,
                  request_json: true
                }
              },
              synthesizer: {
                provider: data.voiceProvider,
                provider_config: {
                  voice: data.voiceId,
                  language: data.language
                },
                stream: data.synthesizerStream,
                buffer_size: data.synthesizerBufferSize,
                audio_format: data.synthesizerAudioFormat
              },
              transcriber: {
                provider: data.transcriberProvider,
                model: data.transcriberModel,
                language: data.transcriberLanguage,
                stream: data.transcriberStream,
                sampling_rate: data.transcriberSamplingRate,
                encoding: data.transcriberEncoding,
                endpointing: data.transcriberEndpointing
              }
            },
            task_config: {
              hangup_after_silence: data.hangupAfterSilence,
              incremental_delay: data.incrementalDelay,
              number_of_words_for_interruption: data.numberOfWordsForInterruption,
              hangup_after_LLMCall: data.hangupAfterLLMCall,
              call_cancellation_prompt: data.callCancellationPrompt,
              backchanneling: data.backchanneling,
              backchanneling_message_gap: data.backchannelingMessageGap,
              backchanneling_start_delay: data.backchannelingStartDelay,
              ambient_noise: data.ambientNoise,
              ambient_noise_track: data.ambientNoiseTrack,
              call_terminate: data.callTerminate,
              voicemail: data.voicemail,
              disallow_unknown_numbers: data.disallowUnknownNumbers
            }
          }],
          ingest_source_config: data.ingestSourceUrl ? {
            source_type: data.ingestSourceType,
            source_url: data.ingestSourceUrl,
            source_auth_token: data.ingestSourceAuthToken,
            source_name: data.ingestSourceName
          } : undefined
        }
      };
      
      payload.bolnaConfig = bolnaConfig;
      
      const res = await apiRequest('POST', '/api/ai-agents', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      setIsCreateDialogOpen(false);
      form.reset();
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
      
      // Build payload - only include defined fields from schema
      const payload: any = {
        name: data.name,
        model: data.model,
        language: data.language,
        temperature: data.temperature ?? 0.7,
        maxDuration: data.maxDuration ?? 600,
        maxTokens: data.maxTokens ?? 150,
        provider: data.provider ?? "openai",
        voiceProvider: data.voiceProvider ?? "elevenlabs",
        status: data.status ?? "active",
        callForwardingEnabled: data.callForwardingEnabled ?? false,
      };
      
      // Only add optional fields if they have values
      if (data.description) payload.description = data.description;
      if (data.voiceId) payload.voiceId = data.voiceId;
      if (data.voiceName) payload.voiceName = data.voiceName;
      if (data.systemPrompt) payload.systemPrompt = data.systemPrompt;
      if (data.userPrompt) payload.userPrompt = data.userPrompt;
      if (data.firstMessage) payload.firstMessage = data.firstMessage;
      if (data.knowledgeBaseIds && data.knowledgeBaseIds.length > 0) {
        payload.knowledgeBaseIds = data.knowledgeBaseIds;
      }
      if (data.assignedPhoneNumberId) payload.assignedPhoneNumberId = data.assignedPhoneNumberId;
      if (data.callForwardingNumber) payload.callForwardingNumber = data.callForwardingNumber;

      // Construct Bolna Config
      const bolnaConfig = {
        agent_config: {
          agent_name: data.name,
          agent_welcome_message: data.firstMessage,
          webhook_url: data.webhookUrl,
          agent_type: data.agentType,
          tasks: [{
            task_type: "conversation",
            tools_config: {
              llm_agent: {
                agent_type: "simple_llm_agent",
                agent_flow_type: "streaming",
                llm_config: {
                  agent_flow_type: "streaming",
                  provider: data.provider,
                  model: data.model,
                  max_tokens: data.maxTokens,
                  temperature: data.temperature,
                  request_json: true
                }
              },
              synthesizer: {
                provider: data.voiceProvider,
                provider_config: {
                  voice: data.voiceId,
                  language: data.language
                },
                stream: data.synthesizerStream,
                buffer_size: data.synthesizerBufferSize,
                audio_format: data.synthesizerAudioFormat
              },
              transcriber: {
                provider: data.transcriberProvider,
                model: data.transcriberModel,
                language: data.transcriberLanguage,
                stream: data.transcriberStream,
                sampling_rate: data.transcriberSamplingRate,
                encoding: data.transcriberEncoding,
                endpointing: data.transcriberEndpointing
              }
            },
            task_config: {
              hangup_after_silence: data.hangupAfterSilence,
              incremental_delay: data.incrementalDelay,
              number_of_words_for_interruption: data.numberOfWordsForInterruption,
              hangup_after_LLMCall: data.hangupAfterLLMCall,
              call_cancellation_prompt: data.callCancellationPrompt,
              backchanneling: data.backchanneling,
              backchanneling_message_gap: data.backchannelingMessageGap,
              backchanneling_start_delay: data.backchannelingStartDelay,
              ambient_noise: data.ambientNoise,
              ambient_noise_track: data.ambientNoiseTrack,
              call_terminate: data.callTerminate,
              voicemail: data.voicemail,
              disallow_unknown_numbers: data.disallowUnknownNumbers
            }
          }],
          ingest_source_config: data.ingestSourceUrl ? {
            source_type: data.ingestSourceType,
            source_url: data.ingestSourceUrl,
            source_auth_token: data.ingestSourceAuthToken,
            source_name: data.ingestSourceName
          } : undefined
        }
      };
      
      payload.bolnaConfig = bolnaConfig;
      
      const res = await apiRequest('PATCH', `/api/ai-agents/${selectedAgent.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-agents'] });
      setIsEditDialogOpen(false);
      setSelectedAgent(null);
      form.reset();
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
    if (isEditDialogOpen && selectedAgent) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
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
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-32 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-4 w-3/4 bg-muted rounded" />
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-10 w-full bg-muted rounded" />
              </CardFooter>
            </Card>
          ))}
        </div>
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
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-agent">
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {!agents || agents.length === 0 ? (
        <Card className="p-12 text-center" data-testid="card-empty-state">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-muted rounded-full">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1" data-testid="heading-empty-title">
                No AI Agents Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4" data-testid="text-empty-description">
                Create your first AI voice agent to start handling calls
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-agent">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Agent
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
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
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncMutation.isPending ? 'Syncing...' : 'Sync Agent'}
                  </Button>
                )}
                <div className="flex gap-2 w-full">
                  {agent.bolnaAgentId && (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-call-${agent.id}`}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedAgent(agent);
                      setIsEditDialogOpen(true);
                      // Populate form with agent data
                      form.reset({
                        name: agent.name,
                        description: agent.description || "",
                        model: agent.model,
                        language: agent.language,
                        voiceId: agent.voiceId || "",
                        voiceName: agent.voiceName || "",
                        systemPrompt: agent.systemPrompt || "",
                        userPrompt: agent.userPrompt || "",
                        firstMessage: agent.firstMessage || "",
                        temperature: agent.temperature ?? 0.7,
                        maxDuration: agent.maxDuration ?? 600,
                        maxTokens: agent.maxTokens ?? 150,
                        provider: agent.provider ?? "openai",
                        voiceProvider: agent.voiceProvider ?? "elevenlabs",
                        status: agent.status ?? "active",
                        knowledgeBaseIds: agent.knowledgeBaseIds || [],
                        assignedPhoneNumberId: agent.assignedPhoneNumberId || "",
                        callForwardingEnabled: agent.callForwardingEnabled ?? false,
                        callForwardingNumber: agent.callForwardingNumber || "",
                      });
                      // Set voice provider filter to match agent's voice
                      if (agent.voiceProvider) {
                        setVoiceProviderFilter(agent.voiceProvider);
                      }
                    }}
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

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-create-agent">
          <DialogHeader>
            <DialogTitle>Create AI Agent</DialogTitle>
            <DialogDescription>
              Comprehensive AI voice agent configuration
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
              <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="basic" data-testid="tab-basic">Basic</TabsTrigger>
                  <TabsTrigger value="ai" data-testid="tab-ai">AI Model</TabsTrigger>
                  <TabsTrigger value="voice" data-testid="tab-voice">Voice</TabsTrigger>
                  <TabsTrigger value="prompts" data-testid="tab-prompts">Prompts</TabsTrigger>
                  <TabsTrigger value="integration" data-testid="tab-integration">Integration</TabsTrigger>
                  <TabsTrigger value="advanced" data-testid="tab-advanced">Advanced</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto pr-4 min-h-0">
                  <TabsContent value="basic" className="space-y-4 mt-4" data-testid="content-basic">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Sales Assistant" {...field} data-testid="input-agent-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what this agent does..." 
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        data-testid="input-agent-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="en-GB">English (UK)</SelectItem>
                          <SelectItem value="es-ES">Spanish</SelectItem>
                          <SelectItem value="fr-FR">French</SelectItem>
                          <SelectItem value="de-DE">German</SelectItem>
                          <SelectItem value="hi-IN">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-4 mt-4" data-testid="content-ai">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Model *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-model">
                                <SelectValue placeholder="Select AI model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingModels ? (
                                <SelectItem value="loading" disabled>Loading models...</SelectItem>
                              ) : bolnaModels.length > 0 ? (
                                bolnaModels.map((model: any) => (
                                  <SelectItem key={model.model} value={model.model}>
                                    {model.model} {model.description && `- ${model.description}`}
                                  </SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Select the AI model from available models
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-provider">
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                              <SelectItem value="meta">Meta (Llama)</SelectItem>
                              <SelectItem value="mistral">Mistral</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                max="2" 
                                value={field.value ?? 0.7}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0.7 : parseFloat(e.target.value);
                                  field.onChange(val);
                                }}
                                data-testid="input-temperature"
                              />
                            </FormControl>
                            <FormDescription className="text-xs">0.0 - 2.0</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Tokens</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value ?? 150}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 150 : parseInt(e.target.value, 10);
                                  field.onChange(val);
                                }}
                                data-testid="input-max-tokens"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Duration (s)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                value={field.value ?? 600}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 600 : parseInt(e.target.value, 10);
                                  field.onChange(val);
                                }}
                                data-testid="input-max-duration"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="voice" className="space-y-4 mt-4" data-testid="content-voice">
                    <FormItem>
                      <FormLabel>Voice Provider Filter</FormLabel>
                      <Select 
                        value={voiceProviderFilter}
                        onValueChange={(value) => {
                          setVoiceProviderFilter(value);
                          // Only set voiceProvider if it's not 'all' (which is just a filter)
                          if (value !== 'all') {
                            form.setValue('voiceProvider', value);
                          }
                          // Clear voice selection when provider changes
                          form.setValue('voiceId', undefined);
                          form.setValue('voiceName', undefined);
                        }}
                      >
                        <SelectTrigger data-testid="select-voice-provider">
                          <SelectValue placeholder="Filter by provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Providers (Show All)</SelectItem>
                          <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                          <SelectItem value="google">Google TTS</SelectItem>
                          <SelectItem value="polly">Amazon Polly</SelectItem>
                          <SelectItem value="azure">Azure TTS</SelectItem>
                          <SelectItem value="deepgram">Deepgram</SelectItem>
                          <SelectItem value="playht">PlayHT</SelectItem>
                          {availableProviders
                            .filter(p => !['elevenlabs', 'google', 'polly', 'azure', 'deepgram', 'playht'].includes(p))
                            .map(provider => (
                              <SelectItem key={provider} value={provider}>
                                {provider.charAt(0).toUpperCase() + provider.slice(1)}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        Filter voices by provider. Select "All Providers" to see all available voices.
                      </FormDescription>
                    </FormItem>

                    <FormField
                      control={form.control}
                      name="voiceName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice Selection</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              // Find the selected voice by name
                              const selectedVoice = bolnaVoices.find((v) => 
                                (v.name || v.voice_name) === value
                              );
                              
                              if (selectedVoice) {
                                // Set voice name (visible to user)
                                field.onChange(value);
                                // Auto-set voice ID (used for API)
                                form.setValue('voiceId', selectedVoice.voice_id || selectedVoice.id || '');
                                // Set the actual provider from the selected voice
                                if (selectedVoice.provider) {
                                  form.setValue('voiceProvider', selectedVoice.provider.toLowerCase());
                                  // Update filter to show voices from this provider
                                  setVoiceProviderFilter(selectedVoice.provider.toLowerCase());
                                }
                              }
                            }} 
                            value={field.value ?? undefined}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-voice-name">
                                <SelectValue placeholder="Select voice from library" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingVoices ? (
                                <SelectItem value="loading" disabled>Loading voices...</SelectItem>
                              ) : bolnaVoices.length > 0 ? (
                                bolnaVoices.map((voice, index) => {
                                  const voiceName = voice.name || voice.voice_name;
                                  if (!voiceName) {
                                    return null;
                                  }
                                  return (
                                    <SelectItem key={`${voiceName}-${index}`} value={voiceName}>
                                      {voiceName}
                                      {voice.provider && voiceProviderFilter === 'all' && ` (${voice.provider})`}
                                    </SelectItem>
                                  );
                                }).filter(Boolean)
                              ) : (
                                <SelectItem value="none" disabled>No voices available</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            {loadingVoices 
                              ? 'Loading voices...'
                              : bolnaVoices.length > 0 
                                ? `${bolnaVoices.length} voice${bolnaVoices.length !== 1 ? 's' : ''} available${voiceProviderFilter !== 'all' ? ` from ${voiceProviderFilter}` : ' from all providers'}`
                                : voiceProviderFilter !== 'all'
                                  ? `No voices found for ${voiceProviderFilter}. Try "All Providers".`
                                  : 'Voice library will load when configured'
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="prompts" className="space-y-4 mt-4" data-testid="content-prompts">
                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Prompt</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="You are a helpful sales assistant..." 
                              rows={4}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              data-testid="input-system-prompt"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Instructions for how the AI agent should behave
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="userPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>User Prompt (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional context or constraints..." 
                              rows={3}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              data-testid="input-user-prompt"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Additional prompting or context for the user interaction
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Message / Greeting</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Hello! How can I help you today?" 
                              rows={2}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              data-testid="input-first-message"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            The initial message the agent says when starting a conversation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div>
                      <FormLabel className="flex items-center gap-2 mb-3">
                        <BookOpen className="h-4 w-4" />
                        Knowledge Base Integration
                      </FormLabel>
                      <FormDescription className="text-xs mb-3">
                        Select knowledge base items to enhance the agent's responses
                      </FormDescription>
                      
                      {loadingKnowledgeBase ? (
                        <div className="text-sm text-muted-foreground">Loading knowledge base...</div>
                      ) : knowledgeBaseItems.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          No knowledge base items available. Create some in the Knowledge Base page.
                        </div>
                      ) : (
                        <ScrollArea className="h-40 border rounded-md p-3">
                          <div className="space-y-2">
                            {knowledgeBaseItems.map((item) => {
                              const currentKbIds = form.watch('knowledgeBaseIds') || [];
                              return (
                                <div key={item.id} className="flex items-start space-x-2">
                                  <Checkbox
                                    id={`kb-${item.id}`}
                                    checked={currentKbIds.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      const currentIds = form.getValues('knowledgeBaseIds') || [];
                                      if (checked) {
                                        form.setValue('knowledgeBaseIds', [...currentIds, item.id]);
                                      } else {
                                        form.setValue('knowledgeBaseIds', currentIds.filter((id) => id !== item.id));
                                      }
                                    }}
                                    data-testid={`checkbox-kb-${item.id}`}
                                  />
                                  <label
                                    htmlFor={`kb-${item.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    <div>{item.title}</div>
                                    {item.description && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {item.description}
                                      </div>
                                    )}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}
                      
                      {(form.watch('knowledgeBaseIds') || []).length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {(form.watch('knowledgeBaseIds') || []).length} item(s) selected
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="integration" className="space-y-4 mt-4" data-testid="content-integration">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="h-4 w-4" />
                      <FormLabel className="text-base">Phone Number</FormLabel>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="assignedPhoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Phone Number</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                              <SelectTrigger data-testid="select-phone-number">
                                <SelectValue placeholder="Select phone number" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingPhoneNumbers ? (
                                <SelectItem value="loading" disabled>Syncing phone numbers...</SelectItem>
                              ) : exotelPhoneNumbers.length > 0 ? (
                                exotelPhoneNumbers.map((phone) => (
                                  <SelectItem key={phone.id} value={phone.id}>
                                    {phone.friendlyName || phone.phoneNumber}
                                    {phone.status && ` (${phone.status})`}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>Syncing phone numbers...</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Select a phone number to assign to this agent
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="callForwardingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={!!field.value}
                                onCheckedChange={(checked) => field.onChange(checked === true)}
                                data-testid="checkbox-call-forwarding"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Enable Call Forwarding
                              </FormLabel>
                              <FormDescription className="text-xs">
                                Allow customer-initiated call transfers during active calls
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch("callForwardingEnabled") && (
                        <FormField
                          control={form.control}
                          name="callForwardingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Forwarding Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="+1234567890" 
                                  value={field.value ?? ""}
                                  onChange={field.onChange}
                                  data-testid="input-forwarding-number"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Phone number to forward calls to when requested by customer
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Separator />

                    <div className="bg-muted p-3 rounded-md text-sm">
                      <div className="font-medium mb-1">Integration Summary</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Voice powered by <strong>Agent Provider</strong></div>
                        <div>• Telephony via <strong>Number Provider</strong></div>
                        <div>• Call transcripts & recordings automatically captured</div>
                        <div>• Real-time call status updates via WebSocket</div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-4 mt-4" data-testid="content-advanced">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="webhookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Webhook URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription className="text-xs">Override default webhook</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agent Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="other">Other</SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="font-medium">Transcriber Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transcriberProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provider</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="deepgram">Deepgram</SelectItem>
                                <SelectItem value="assemblyai">AssemblyAI</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="transcriberModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="transcriberLanguage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Language Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="transcriberSamplingRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sampling Rate</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="font-medium">Task Configuration</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="hangupAfterSilence"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hangup Silence (s)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="incrementalDelay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Incremental Delay (ms)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="numberOfWordsForInterruption"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interruption Words</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="callTerminate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Call Duration (s)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="backchanneling"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Backchanneling</FormLabel>
                              <FormDescription>Enable filler words</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ambientNoise"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Ambient Noise</FormLabel>
                              <FormDescription>Background noise</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="voicemail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Voicemail Detection</FormLabel>
                              <FormDescription>Detect voicemail</FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />
                    <h4 className="font-medium">Ingest Source (Knowledge Base)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="ingestSourceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="api">API</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ingestSourceUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ingestSourceAuthToken"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Auth Token</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ingestSourceName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Source Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Agent
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Agent Dialog - Reuses the same form structure */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setSelectedAgent(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-edit-agent">
          <DialogHeader>
            <DialogTitle>Edit AI Agent</DialogTitle>
            <DialogDescription>
              Update your AI voice agent configuration
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto pr-4 min-h-0">
                <div className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="voiceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Voice *</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            // Find the selected voice by name
                            const selectedVoice = bolnaVoices.find((v) => 
                              (v.name || v.voice_name) === value
                            );
                            
                            if (selectedVoice) {
                              // Set voice name (visible to user)
                              field.onChange(value);
                              // Auto-set voice ID (used for API)
                              form.setValue('voiceId', selectedVoice.voice_id || selectedVoice.id || '');
                              // Set the actual provider from the selected voice
                              if (selectedVoice.provider) {
                                form.setValue('voiceProvider', selectedVoice.provider.toLowerCase());
                              }
                            }
                          }} 
                          value={field.value ?? undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice from library" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {loadingVoices ? (
                              <SelectItem value="loading" disabled>Loading voices...</SelectItem>
                            ) : bolnaVoices.length > 0 ? (
                              bolnaVoices.map((voice, index) => {
                                const voiceName = voice.name || voice.voice_name;
                                if (!voiceName) {
                                  return null;
                                }
                                return (
                                  <SelectItem key={`${voiceName}-${index}`} value={voiceName}>
                                    {voiceName}
                                    {voice.provider && ` (${voice.provider})`}
                                  </SelectItem>
                                );
                              }).filter(Boolean)
                            ) : (
                              <SelectItem value="none" disabled>No voices available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Change the voice for this agent. Will require re-sync.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedPhoneNumberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned Phone Number</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            // Handle "none" as undefined/null for no phone number
                            field.onChange(value === "none" ? undefined : value);
                          }} 
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select phone number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No phone number</SelectItem>
                            {loadingPhoneNumbers ? (
                              <SelectItem value="loading" disabled>Loading phone numbers...</SelectItem>
                            ) : exotelPhoneNumbers.length > 0 ? (
                              exotelPhoneNumbers.map((phone) => (
                                <SelectItem key={phone.id} value={phone.id}>
                                  {phone.phoneNumber} {phone.friendlyName && `- ${phone.friendlyName}`}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-numbers" disabled>No phone numbers available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Change the phone number assigned to this agent. Will require re-sync.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                {selectedAgent && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      syncMutation.mutate(selectedAgent.id);
                    }}
                    disabled={syncMutation.isPending}
                  >
                    {syncMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync Agent'
                    )}
                  </Button>
                )}
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Agent'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
