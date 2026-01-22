import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Mic, 
  Volume2, 
  Settings, 
  Phone, 
  Wrench, 
  BarChart3, 
  PhoneIncoming,
  Loader2
} from "lucide-react";

// AgentFormValues is now provided by the parent (AIAgents.tsx) via props, so we use 'any' for generic typing here
type AgentFormValues = any;

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: Partial<AgentFormValues>;
  onSubmit: (values: AgentFormValues) => void;
  mode: "create" | "edit";
  loading?: boolean;
  agentFormSchema: any;
  models: { id?: string; name?: string }[];
  voices: { id?: string; voice_id?: string; name?: string; voice_name?: string; provider?: string }[];
  providers: string[];
  phoneNumbers: { id: string; number: string }[];
  knowledgeBaseItems: { id: string; title: string }[];
}

export const AgentFormDialog: React.FC<AgentFormDialogProps> = ({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  mode,
  loading = false,
  agentFormSchema,
  models,
  voices,
  providers,
  phoneNumbers,
  knowledgeBaseItems,
}) => {
  const [activeTab, setActiveTab] = useState("basic");
  
  // Debug logging
  useEffect(() => {
    if (open) {
      console.log("📊 AgentFormDialog Data:", {
        models: models.length,
        voices: voices.length,
        providers: providers.length,
        phoneNumbers: phoneNumbers.length,
        knowledgeBaseItems: knowledgeBaseItems.length
      });
      console.log("Models:", models);
      console.log("Voices:", voices);
      console.log("Providers:", providers);
    }
  }, [open, models, voices, providers, phoneNumbers, knowledgeBaseItems]);
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      model: models.length > 0 ? models[0].name : "gpt-4",
      language: "en-US",
      provider: providers.length > 0 ? providers[0] : "azuretts",
      temperature: 0.7,
      maxDuration: 600,
      maxTokens: 150,
      hangupAfterSilence: 10,
      numberOfWordsForInterruption: 2,
      transcriberEndpointing: 100,
      incrementalDelay: 400,
      backchannelingMessageGap: 5,
      backchannelingStartDelay: 5,
      callTerminate: 90,
      webhookUrl: "https://platform.automitra.ai/api/webhooks/bolna/call-status",
      ...initialValues,
    },
    values: initialValues,
  });

  useEffect(() => {
    if (open && initialValues) {
      form.reset({
        name: "",
        description: "",
        model: "gpt-4",
        language: "en-US",
        provider: "azuretts",
        temperature: 0.7,
        maxDuration: 600,
        maxTokens: 150,
        hangupAfterSilence: 10,
        numberOfWordsForInterruption: 2,
        transcriberEndpointing: 100,
        incrementalDelay: 400,
        backchannelingMessageGap: 5,
        backchannelingStartDelay: 5,
        callTerminate: 90,
        ...initialValues,
      });
      setActiveTab("basic");
    }
    // eslint-disable-next-line
  }, [open, initialValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update the agent configuration and settings." : "Configure your new AI agent with voice, model, and behavior settings."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-8 h-auto">
                <TabsTrigger value="basic" className="flex items-center gap-1 text-xs py-2">
                  <FileText className="h-3 w-3" />
                  <span className="hidden sm:inline">Agent</span>
                </TabsTrigger>
                <TabsTrigger value="llm" className="flex items-center gap-1 text-xs py-2">
                  <Settings className="h-3 w-3" />
                  <span className="hidden sm:inline">LLM</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-1 text-xs py-2">
                  <Volume2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Audio</span>
                </TabsTrigger>
                <TabsTrigger value="engine" className="flex items-center gap-1 text-xs py-2">
                  <Mic className="h-3 w-3" />
                  <span className="hidden sm:inline">Engine</span>
                </TabsTrigger>
                <TabsTrigger value="call" className="flex items-center gap-1 text-xs py-2">
                  <Phone className="h-3 w-3" />
                  <span className="hidden sm:inline">Call</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex items-center gap-1 text-xs py-2">
                  <Wrench className="h-3 w-3" />
                  <span className="hidden sm:inline">Tools</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1 text-xs py-2">
                  <BarChart3 className="h-3 w-3" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="inbound" className="flex items-center gap-1 text-xs py-2">
                  <PhoneIncoming className="h-3 w-3" />
                  <span className="hidden sm:inline">Inbound</span>
                </TabsTrigger>
              </TabsList>

              {/* Agent Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Core agent settings and identification</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Name</FormLabel>
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
                            <Textarea {...field} placeholder="Brief description of the agent" rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assignedPhoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "_none_" ? "" : value)} value={field.value || "_none_"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Number" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="_none_">Select Number</SelectItem>
                              {phoneNumbers.length === 0 ? (
                                <SelectItem value="_empty_" disabled>
                                  <span className="text-muted-foreground">No phone numbers available</span>
                                </SelectItem>
                              ) : (
                                phoneNumbers.map((n) => (
                                  <SelectItem key={n.id} value={n.id}>
                                    {n.number}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {phoneNumbers.length === 0 ? "No phone numbers available. They will be synced automatically." : `Select a phone number for this agent (${phoneNumbers.length} available)`}
                          </FormDescription>
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
                          <Select onValueChange={(value) => field.onChange(value === "_none_" ? [] : [value])} value={field.value?.[0] || "_none_"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select knowledge base" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="_none_">None</SelectItem>
                              {knowledgeBaseItems.length === 0 ? (
                                <SelectItem value="_empty_" disabled>
                                  <span className="text-muted-foreground">No knowledge bases available</span>
                                </SelectItem>
                              ) : (
                                knowledgeBaseItems.map((kb) => (
                                  <SelectItem key={kb.id} value={kb.id}>
                                    {kb.title}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {knowledgeBaseItems.length === 0 ? "No knowledge bases available" : `Optional: Link a knowledge base to this agent (${knowledgeBaseItems.length} available)`}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Prompts & Messages</CardTitle>
                    <CardDescription>Define agent behavior and conversation flow</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Prompt</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="System instructions for the agent" rows={4} />
                          </FormControl>
                          <FormDescription>
                            Define the agent's behavior and personality
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
                            <Textarea {...field} placeholder="User context or instructions" rows={3} />
                          </FormControl>
                          <FormDescription>
                            Additional context for user interactions
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
                          <FormLabel>First Message</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Hello! How can I help you today?" rows={2} />
                          </FormControl>
                          <FormDescription>
                            The agent's opening message when call starts
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* LLM Tab */}
              <TabsContent value="llm" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Language Model Configuration</CardTitle>
                    <CardDescription>Configure the AI model settings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {models.length === 0 ? (
                                <SelectItem value="_loading_" disabled>
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading models...
                                  </div>
                                </SelectItem>
                              ) : (
                                models.map((m) => (
                                  <SelectItem key={m.id || m.name} value={m.name || "_unknown_"}>
                                    {m.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>Choose the language model</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
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
                              className="w-full"
                            />
                          </FormControl>
                          <FormDescription>
                            Controls randomness (0 = focused, 2 = creative)
                          </FormDescription>
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
                            <Input {...field} type="number" min="50" max="2000" />
                          </FormControl>
                          <FormDescription>
                            Maximum response length per message
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Audio Tab */}
              <TabsContent value="audio" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Voice & Audio Settings</CardTitle>
                    <CardDescription>Configure text-to-speech and audio parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {providers.length === 0 ? (
                                <SelectItem value="_loading_" disabled>
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading providers...
                                  </div>
                                </SelectItem>
                              ) : (
                                providers.map((p) => (
                                  <SelectItem key={p} value={p}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                  </SelectItem>
                                ))
                              )}
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
                          <FormLabel>Voice</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "_none_" ? "" : value)} value={field.value || "_none_"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Voice" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              <SelectItem value="_none_">Select Voice</SelectItem>
                              {voices.length === 0 ? (
                                <SelectItem value="_loading_" disabled>
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Loading voices...
                                  </div>
                                </SelectItem>
                              ) : (
                                voices.map((v) => (
                                  <SelectItem key={v.voice_id || v.id} value={v.voice_id || v.id || "_unknown_"}>
                                    <div className="flex flex-col">
                                      <span>{v.voice_name || v.name}</span>
                                      {v.provider && <span className="text-xs text-muted-foreground">{v.provider}</span>}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the voice for your AI agent ({voices.length} voices available)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en-US">English (US)</SelectItem>
                              <SelectItem value="en-GB">English (GB)</SelectItem>
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
                      name="synthesizerStream"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Stream Audio</FormLabel>
                            <FormDescription>
                              Enable real-time audio streaming
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
                      name="synthesizerBufferSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buffer Size</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="50" max="500" />
                          </FormControl>
                          <FormDescription>
                            Audio buffer size in milliseconds
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Engine Tab - Transcription & Interruptions */}
              <TabsContent value="engine" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Transcription & Interruptions</CardTitle>
                    <CardDescription>Control how speech is captured and processed</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">Transcription Settings</h4>
                      
                      <FormField
                        control={form.control}
                        name="transcriberProvider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transcriber Provider</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "deepgram"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="deepgram">Deepgram</SelectItem>
                                <SelectItem value="google">Google</SelectItem>
                                <SelectItem value="azure">Azure</SelectItem>
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
                            <FormLabel>Transcriber Model</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., nova-2" />
                            </FormControl>
                            <FormDescription>Model variant for transcription</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transcriberEndpointing"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Endpointing (ms)</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value || 100}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={50}
                                max={500}
                                step={50}
                                value={[field.value || 100]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Wait time before generating response
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">Interruption Handling</h4>
                      
                      <FormField
                        control={form.control}
                        name="numberOfWordsForInterruption"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Words Before Interrupting</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value || 2}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[field.value || 2]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Agent will not consider interruptions until this many words are spoken
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="incrementalDelay"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Linear Delay (ms)</FormLabel>
                              <span className="text-sm text-muted-foreground">{field.value || 400}</span>
                            </div>
                            <FormControl>
                              <Slider
                                min={100}
                                max={1000}
                                step={100}
                                value={[field.value || 400]}
                                onValueChange={(vals) => field.onChange(vals[0])}
                              />
                            </FormControl>
                            <FormDescription>
                              Linear delay accounts for long pauses mid-sentence
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Response Latency</CardTitle>
                    <CardDescription>Configure agent response timing</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="responseRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Rate</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "custom"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rate" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fast">Fast</SelectItem>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="slow">Slow</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Call Tab */}
              <TabsContent value="call" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Call Management</CardTitle>
                    <CardDescription>Configure call behavior and termination</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="maxDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Call Duration (seconds)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="30" max="3600" />
                          </FormControl>
                          <FormDescription>
                            Maximum length of a call in seconds
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hangupAfterSilence"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Hangup After Silence (seconds)</FormLabel>
                            <span className="text-sm text-muted-foreground">{field.value || 10}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={5}
                              max={60}
                              step={5}
                              value={[field.value || 10]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-hangup after silence duration
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="callTerminate"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Call Terminate (seconds)</FormLabel>
                            <span className="text-sm text-muted-foreground">{field.value || 90}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={30}
                              max={300}
                              step={10}
                              value={[field.value || 90]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            Maximum time before forced termination
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hangupAfterLLMCall"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Hangup After LLM Call</FormLabel>
                            <FormDescription>
                              Automatically end call after agent response
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
                      name="voicemail"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Voicemail</FormLabel>
                            <FormDescription>
                              Leave voicemail if call goes unanswered
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
                      name="callCancellationPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Call Cancellation Prompt</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Message when call is cancelled" rows={2} />
                          </FormControl>
                          <FormDescription>
                            Optional message to play when cancelling
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
                    <CardDescription>Check if user is still on the call</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="backchannelingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Backchanneling</FormLabel>
                            <FormDescription>
                              Check if user is still on the call with periodic messages
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
                      name="backchannelingMessageGap"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Invoke Message After (seconds)</FormLabel>
                            <span className="text-sm text-muted-foreground">{field.value || 5}</span>
                          </div>
                          <FormControl>
                            <Slider
                              min={3}
                              max={30}
                              step={1}
                              value={[field.value || 5]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                            />
                          </FormControl>
                          <FormDescription>
                            Time interval for detection messages
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="backchannelingStartDelay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Detection Message</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Hey, are you still there?" />
                          </FormControl>
                          <FormDescription>
                            Message to check if user is still listening
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tools Tab */}
              <TabsContent value="tools" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Tools & Functions</CardTitle>
                    <CardDescription>Configure agent capabilities and integrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="toolsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Tools</FormLabel>
                            <FormDescription>
                              Allow agent to use external functions and APIs
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

                    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      <p>Tools integration allows your agent to:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Make API calls</li>
                        <li>Query databases</li>
                        <li>Access external systems</li>
                        <li>Execute custom functions</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Analytics & Monitoring</CardTitle>
                    <CardDescription>Configure data collection and reporting</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="analyticsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Analytics</FormLabel>
                            <FormDescription>
                              Collect call metrics and conversation data
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value !== false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="webhookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook URL (Pre-configured)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              disabled 
                              placeholder="https://platform.automitra.ai/api/webhooks/bolna/call-status" 
                            />
                          </FormControl>
                          <FormDescription>
                            Webhook URL is automatically configured for real-time updates
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      <p>Analytics provides insights into:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Call duration and outcomes</li>
                        <li>Conversation quality metrics</li>
                        <li>Agent performance statistics</li>
                        <li>User satisfaction indicators</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Inbound Tab */}
              <TabsContent value="inbound" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Inbound Call Settings</CardTitle>
                    <CardDescription>Configure how agent handles incoming calls</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="inboundEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Accept Inbound Calls</FormLabel>
                            <FormDescription>
                              Allow this agent to receive incoming calls
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
                      name="disallowUnknownNumbers"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Block Unknown Numbers</FormLabel>
                            <FormDescription>
                              Only accept calls from known contacts
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
                      name="callForwardingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Call Forwarding</FormLabel>
                            <FormDescription>
                              Forward calls to another number if needed
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
                      name="callForwardingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forward To Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+1234567890" type="tel" />
                          </FormControl>
                          <FormDescription>
                            Phone number to forward calls to
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export type { AgentFormValues };