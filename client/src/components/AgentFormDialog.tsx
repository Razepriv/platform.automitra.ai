import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Cpu, 
  Volume2, 
  Settings, 
  Phone, 
  Zap, 
  BarChart3,
  ExternalLink,
  Plus,
  Trash2,
  Play
} from "lucide-react";
import { z } from "zod";

// Comprehensive schema for all agent configuration fields
export const agentFormSchema = z.object({
  // Agent Tab
  name: z.string().min(1, "Agent name is required"),
  description: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  provider: z.string().min(1, "Provider is required"),
  voiceId: z.string().min(1, "Voice is required"),
  voiceProvider: z.string().optional(),
  assignedPhoneNumberId: z.string().optional(),
  knowledgeBaseIds: z.array(z.string()).default([]),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().optional(),
  firstMessage: z.string().optional(),
  
  // LLM Tab
  llmProvider: z.string().optional(),
  llmModel: z.string().optional(),
  maxTokens: z.number().min(1).max(4000).default(150),
  temperature: z.number().min(0).max(2).default(0.7),
  llmKnowledgeBaseIds: z.array(z.string()).default([]),
  
  // Audio Tab
  language: z.string().default("en-US"),
  transcriberProvider: z.string().default("deepgram"),
  transcriberModel: z.string().default("nova-2"),
  keywords: z.string().optional(),
  audioVoiceProvider: z.string().optional(),
  audioVoiceModel: z.string().optional(),
  audioVoiceId: z.string().optional(),
  bufferSize: z.number().default(181),
  speedRate: z.number().default(1),
  similarityBoost: z.number().min(0).max(1).default(0.5),
  stability: z.number().min(0).max(1).default(0.5),
  styleExaggeration: z.number().min(0).max(1).default(0),
  
  // Engine Tab
  generatePreciseTranscript: z.boolean().default(false),
  wordsBeforeInterrupting: z.number().default(2),
  responseRate: z.string().default("rapid"),
  checkUserOnline: z.boolean().default(false),
  userOnlineMessage: z.string().optional(),
  userOnlineCheckAfter: z.number().default(7),
  
  // Call Tab
  telephonyProvider: z.string().default("exotel"),
  enableDTMF: z.boolean().default(false),
  voicemailDetection: z.boolean().default(false),
  voicemailDetectionTime: z.number().default(2.5),
  hangupAfterSilence: z.boolean().default(true),
  hangupAfterSilenceTime: z.number().default(15),
  hangupUsingPrompt: z.boolean().default(false),
  hangupPrompt: z.string().optional(),
  hangupMessage: z.string().default("Call will now disconnect"),
  callTerminationTime: z.number().default(600),
  
  // Analytics Tab
  enableSummarization: z.boolean().default(false),
  enableExtraction: z.boolean().default(false),
  extractionPrompt: z.string().optional(),
  webhookUrl: z.string().optional(),
}).passthrough();

export type AgentFormValues = z.infer<typeof agentFormSchema>;

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<AgentFormValues>;
  onSubmit: (values: AgentFormValues) => void;
  mode: "create" | "edit";
  loading?: boolean;
  models: { id?: string; name?: string; provider?: string; family?: string }[];
  voices: { id?: string; voice_id?: string; name?: string; voice_name?: string; provider?: string }[];
  providers: string[];
  phoneNumbers: { id: string; number: string; provider?: string }[];
  knowledgeBaseItems: { id: string; title: string }[];
  bolnaModels?: { model: string; provider: string; family?: string }[];
  bolnaVoices?: { voice_id?: string; name?: string; provider?: string; model?: string }[];
}

export const AgentFormDialog: React.FC<AgentFormDialogProps> = ({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  mode,
  loading = false,
  models,
  voices,
  providers,
  phoneNumbers,
  knowledgeBaseItems,
  bolnaModels = [],
  bolnaVoices = [],
}) => {
  const [activeTab, setActiveTab] = useState("agent");

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      model: models[0]?.name || "gpt-4",
      provider: providers[0] || "openai",
      voiceId: "",
      voiceProvider: "elevenlabs",
      language: "en-US",
      transcriberProvider: "deepgram",
      transcriberModel: "nova-2",
      maxTokens: 150,
      temperature: 0.7,
      bufferSize: 181,
      speedRate: 1,
      similarityBoost: 0.5,
      stability: 0.5,
      styleExaggeration: 0,
      wordsBeforeInterrupting: 2,
      responseRate: "rapid",
      userOnlineCheckAfter: 7,
      telephonyProvider: "exotel",
      voicemailDetectionTime: 2.5,
      hangupAfterSilence: true,
      hangupAfterSilenceTime: 15,
      hangupMessage: "Call will now disconnect",
      callTerminationTime: 600,
      knowledgeBaseIds: [],
      llmKnowledgeBaseIds: [],
      ...initialValues,
    },
  });

  useEffect(() => {
    if (open && initialValues) {
      form.reset({
        name: "",
        description: "",
        model: models[0]?.name || "gpt-4",
        provider: providers[0] || "openai",
        voiceId: "",
        language: "en-US",
        knowledgeBaseIds: [],
        llmKnowledgeBaseIds: [],
        ...initialValues,
      });
    }
  }, [open, initialValues, form, models, providers]);

  // Filter voices by provider
  const filteredVoices = useMemo(() => {
    const voiceProvider = form.watch("voiceProvider") || form.watch("audioVoiceProvider");
    if (!voiceProvider || voiceProvider === "all") return voices;
    return voices.filter(v => v.provider?.toLowerCase() === voiceProvider.toLowerCase());
  }, [voices, form.watch("voiceProvider"), form.watch("audioVoiceProvider")]);

  // Get unique voice providers
  const availableVoiceProviders = useMemo(() => {
    const providers = new Set<string>();
    voices.forEach(v => {
      if (v.provider) providers.add(v.provider.toLowerCase());
    });
    return Array.from(providers);
  }, [voices]);

  const handleSubmit = (values: AgentFormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            Configure your AI agent with comprehensive settings. All changes sync to Bolna in real-time.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="agent" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Agent</span>
            </TabsTrigger>
            <TabsTrigger value="llm" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <span className="hidden sm:inline">LLM</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">Audio</span>
            </TabsTrigger>
            <TabsTrigger value="engine" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Engine</span>
            </TabsTrigger>
            <TabsTrigger value="call" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Call</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Tools</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
                {/* Agent Tab */}
                <TabsContent value="agent" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter agent name" />
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
                          <Textarea {...field} placeholder="Describe your agent" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {providers.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {models
                                .filter(m => !field.value || m.provider === form.watch("provider") || !m.provider)
                                .filter(m => m.name) // Filter out items without names
                                .map((m) => (
                                  <SelectItem key={m.id || m.name} value={m.name!}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="voiceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "elevenlabs"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableVoiceProviders.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="voiceId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select voice" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredVoices
                                .filter(v => v.voice_id || v.id) // Filter out items without IDs
                                .map((v) => (
                                  <SelectItem key={v.voice_id || v.id} value={v.voice_id || v.id!}>
                                    {v.voice_name || v.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assignedPhoneNumberId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <Select onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select phone number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__none__">No phone number</SelectItem>
                            {phoneNumbers.map((n) => (
                              <SelectItem key={n.id} value={n.id}>{n.number}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="knowledgeBaseIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Knowledge Base</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            const current = field.value || [];
                            if (!current.includes(value)) {
                              field.onChange([...current, value]);
                            }
                          }}
                          value=""
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select knowledge base (multi-select)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {knowledgeBaseItems
                              .filter(kb => !field.value?.includes(kb.id))
                              .map((kb) => (
                                <SelectItem key={kb.id} value={kb.id}>{kb.title}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {field.value.map((id) => {
                              const kb = knowledgeBaseItems.find(k => k.id === id);
                              return kb ? (
                                <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                  {kb.title}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      field.onChange(field.value?.filter(v => v !== id));
                                    }}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="firstMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agent Welcome Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Hello, this is a demo call from Bolna. I am [Agent Name]."
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription>
                          This will be the initial message from the agent. You can use variables here using {"{variable_name}"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Define your agent's personality and behavior..."
                            rows={8}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription>
                          You can define variables in the prompt using {"{variable_name}"}. Use `@` to mention function calling.
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
                        <FormLabel>User Prompt</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Optional user prompt template..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* LLM Tab */}
                <TabsContent value="llm" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Choose LLM model</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="llmProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Provider</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || form.watch("provider")}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select provider" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {providers.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="llmModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || form.watch("model")}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {models.map((m) => (
                                    <SelectItem key={m.id || m.name} value={m.name || ""}>
                                      {m.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tokens generated on each LLM output</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="maxTokens"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Max Tokens</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={1}
                                max={4000}
                                step={1}
                                value={[field.value || 150]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Increasing tokens enables longer responses to be queued for speech generation but increases latency
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Temperature</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="temperature"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Temperature</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={2}
                                step={0.1}
                                value={[field.value || 0.7]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Increasing temperature enables heightened creativity, but increases chance of deviation from prompt
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Add knowledge base (Multi-select)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="llmKnowledgeBaseIds"
                        render={({ field }) => (
                          <FormItem>
                            <Select 
                              onValueChange={(value) => {
                                const current = field.value || [];
                                if (!current.includes(value)) {
                                  field.onChange([...current, value]);
                                }
                              }}
                              value=""
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select knowledge bases" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {knowledgeBaseItems
                                  .filter(kb => !field.value?.includes(kb.id))
                                  .map((kb) => (
                                    <SelectItem key={kb.id} value={kb.id}>{kb.title}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {field.value && field.value.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {field.value.map((id) => {
                                  const kb = knowledgeBaseItems.find(k => k.id === id);
                                  return kb ? (
                                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                      {kb.title}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          field.onChange(field.value?.filter(v => v !== id));
                                        }}
                                        className="ml-1 hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Add FAQs & Guardrails</span>
                        <Button type="button" variant="link" size="sm" className="h-auto p-0">
                          Learn more <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Button type="button" variant="outline" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add a new block for FAQs & Guardrails
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Audio Tab - Continuing in next part due to length */}
                <TabsContent value="audio" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Language</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="hi-IN">Hindi</SelectItem>
                                <SelectItem value="es-ES">Spanish</SelectItem>
                                <SelectItem value="fr-FR">French</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Select transcriber</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                  <SelectItem value="google">Google</SelectItem>
                                  <SelectItem value="aws">AWS</SelectItem>
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
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="nova-2">nova-2</SelectItem>
                                  <SelectItem value="nova">nova</SelectItem>
                                  <SelectItem value="enhanced">enhanced</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Keywords</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="keywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="JEE: 20, Medical: 20, NEET: 20, Engineering: 20" />
                            </FormControl>
                            <FormDescription>
                              Enter certain keywords/proper nouns you'd want to boost while understanding user speech
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Select voice</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="audioVoiceProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Provider</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || form.watch("voiceProvider")}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableVoiceProviders.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="audioVoiceModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Model</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="eleven_turbo_v2_5">eleven_turbo_v2_5</SelectItem>
                                  <SelectItem value="eleven_multilingual_v2">eleven_multilingual_v2</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="audioVoiceId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Voice</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || form.watch("voiceId")}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {filteredVoices.map((v) => (
                                    <SelectItem key={v.voice_id || v.id} value={v.voice_id || v.id || ""}>
                                      {v.voice_name || v.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Play
                        </Button>
                        <Button type="button" variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add voices
                        </Button>
                      </div>

                      <Separator />

                      <FormField
                        control={form.control}
                        name="bufferSize"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Buffer Size</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={500}
                                step={1}
                                value={[field.value || 181]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Increasing buffer size lets the agent speak longer fluently, but raises latency
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="speedRate"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Speed rate</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0.5}
                                max={2}
                                step={0.1}
                                value={[field.value || 1]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              The speed control feature lets you adjust how fast or slow your agent speaks.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="similarityBoost"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Similarity Boost</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={[field.value || 0.5]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Controls how strictly the AI matches the original voice during replication
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stability"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Stability</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={[field.value || 0.5]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Controls voice stability and randomness between generations
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="styleExaggeration"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Style Exaggeration</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={1}
                                step={0.1}
                                value={[field.value || 0]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Controls the style exaggeration of the voice
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Engine Tab */}
                <TabsContent value="engine" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Transcription & interruptions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="generatePreciseTranscript"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Generate precise transcript</FormLabel>
                              <FormDescription>
                                Agent will try to generate more precise transcripts during interruptions.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="wordsBeforeInterrupting"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Number of words to wait for before interrupting</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={0}
                                max={10}
                                step={1}
                                value={[field.value || 2]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Agent will not consider interruptions until {field.value + 1} words are spoken (If recipient says "Stopwords" such as Stop, Wait, Hold On, agent will pause by default)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Voice Response Rate Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="responseRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Response Rate</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="rapid">Rapid</SelectItem>
                                <SelectItem value="balanced">Balanced</SelectItem>
                                <SelectItem value="deliberate">Deliberate</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Agent will try to answer with minimum latency, often interrupting humans if they are speaking with pauses
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>User Online Detection</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="checkUserOnline"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Check if user is online</FormLabel>
                              <FormDescription>
                                Agent will check if the user is online if there's no reply from the user
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch("checkUserOnline") && (
                        <>
                          <FormField
                            control={form.control}
                            name="userOnlineMessage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>User is online message</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Hello, are you still on the call or not?" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="userOnlineCheckAfter"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between mb-2">
                                  <FormLabel>Invoke message after (seconds)</FormLabel>
                                  <span className="text-sm text-muted-foreground">{field.value}</span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={1}
                                    max={60}
                                    step={1}
                                    value={[field.value || 7]}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Call Tab */}
                <TabsContent value="call" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Telephony Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="telephonyProvider"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="exotel">Exotel</SelectItem>
                                <SelectItem value="twilio">Twilio</SelectItem>
                                <SelectItem value="plivo">Plivo</SelectItem>
                                <SelectItem value="vonage">Vonage</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Enable Keypad Inputs (DTMF)</CardTitle>
                      <CardDescription>Allow caller to interact using keypad inputs.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="enableDTMF"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable DTMF</FormLabel>
                              <FormDescription>
                                When enabled, the agent can take input directly via the user's phone keypad during the call. Prompt the user to push inputs via keypad and ask them to finish by # for the agent to capture the input.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Voicemail detection</CardTitle>
                      <CardDescription>Automatically disconnect call on voicemail detection</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="voicemailDetection"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Enable Voicemail Detection</FormLabel>
                              <FormDescription>
                                Time allotted to analyze if the call has been answered by a machine. The default value is 2500 ms.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch("voicemailDetection") && (
                        <FormField
                          control={form.control}
                          name="voicemailDetectionTime"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between mb-2">
                                <FormLabel>Time (seconds)</FormLabel>
                                <span className="text-sm text-muted-foreground">{field.value}</span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0.5}
                                  max={10}
                                  step={0.1}
                                  value={[field.value || 2.5]}
                                  onValueChange={(vals) => field.onChange(vals[0])}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Call hangup modes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="hangupAfterSilence"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Hangup calls on user silence</FormLabel>
                                <FormDescription>
                                  Call will hangup if the user is not speaking
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                            {field.value && (
                              <FormField
                                control={form.control}
                                name="hangupAfterSilenceTime"
                                render={({ field: silenceField }) => (
                                  <FormItem>
                                    <div className="flex items-center justify-between mb-2">
                                      <FormLabel>Time (seconds)</FormLabel>
                                      <span className="text-sm text-muted-foreground">{silenceField.value}</span>
                                    </div>
                                    <FormControl>
                                      <Slider
                                        min={1}
                                        max={60}
                                        step={1}
                                        value={[silenceField.value || 15]}
                                        onValueChange={(vals) => silenceField.onChange(vals[0])}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <FormField
                        control={form.control}
                        name="hangupUsingPrompt"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Hangup calls using a prompt</FormLabel>
                                <FormDescription>
                                  Call will hangup as per the provided prompt
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                            {field.value && (
                              <FormField
                                control={form.control}
                                name="hangupPrompt"
                                render={({ field: promptField }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea
                                        {...promptField}
                                        placeholder="You are an AI assistant that determines whether a conversation is complete based on the transcript..."
                                        rows={6}
                                        className="font-mono text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Call hangup message</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="hangupMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Call will now disconnect" />
                            </FormControl>
                            <FormDescription>
                              Provide the final agent message just before hanging up.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Call Termination</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="callTerminationTime"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Time (seconds)</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={60}
                                max={3600}
                                step={30}
                                value={[field.value || 600]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              The call ends after {field.value} seconds of call time
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tools Tab */}
                <TabsContent value="tools" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Function Tools for LLM Models</span>
                        <Button type="button" variant="link" size="sm" className="h-auto p-0">
                          See examples and learn more <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Connect external tools or APIs that your language model can call during conversations. This allows the LLM to retrieve real-time data, perform calculations, or trigger actions dynamically.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Label>Choose functions</Label>
                        <div className="flex gap-2">
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select functions" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="transferCall">Transfer Call</SelectItem>
                              <SelectItem value="custom">Custom Function</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="default">
                            Add function
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Post call tasks</CardTitle>
                      <CardDescription>
                        Choose tasks to get executed after the agent conversation is complete
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="enableSummarization"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Summarization</FormLabel>
                              <FormDescription>
                                Generate a summary of the conversation automatically.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enableExtraction"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Extraction</FormLabel>
                                <FormDescription>
                                  Extract structured information from the conversation according to a custom prompt provided
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </div>
                            {field.value && (
                              <FormField
                                control={form.control}
                                name="extractionPrompt"
                                render={({ field: promptField }) => (
                                  <FormItem>
                                    <FormControl>
                                      <Textarea
                                        {...promptField}
                                        placeholder="user_name : Yield the name of the user.&#10;payment_mode : If user is paying by cash, yield cash. If they are paying by card yield card. Else yield NA"
                                        rows={6}
                                        className="font-mono text-sm"
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </FormItem>
                        )}
                      />

                      <div>
                        <Label className="text-base mb-2 block">Custom Analytics</Label>
                        <CardDescription className="mb-4">
                          Post call tasks to extract data from the call
                        </CardDescription>
                        <Button type="button" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Extract custom analytics
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Push all execution data to webhook</span>
                        <Button type="button" variant="link" size="sm" className="h-auto p-0">
                          See all events <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        Automatically receive all execution data for this agent using webhook
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="webhookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your webhook URL</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="https://your-webhook-url.com/endpoint" />
                            </FormControl>
                            <FormDescription>
                              Webhook URL will be automatically set to platform endpoint for real-time updates
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Agent"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
