import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, Settings, Volume2, Cpu, Phone, Wrench, BarChart3, PhoneIncoming,
  MessageSquare, Brain, Mic, Radio, Webhook, Database, Zap
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  models: { id?: string; name?: string; model?: string; provider?: string; description?: string }[];
  voices: { id?: string; voice_id?: string; name?: string; voice_name?: string; provider?: string }[];
  providers: string[];
  phoneNumbers: { id: string; phoneNumber: string; provider?: string; friendlyName?: string }[];
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
  const [activeTab, setActiveTab] = useState("agent");
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      model: models[0]?.name || "gpt-4",
      language: "en-US",
      ...initialValues,
    },
    values: initialValues,
  });

  useEffect(() => {
    if (open) {
      // Use the same default values structure for both create and edit
      const defaults = {
        name: "",
        description: "",
        model: models[0]?.model || models[0]?.name || "gpt-4",
        language: "en-US",
        provider: "openai",
        voiceProvider: "elevenlabs",
        voiceId: "",
        voiceName: "",
        temperature: 0.7,
        maxDuration: 600,
        maxTokens: 150,
        systemPrompt: "",
        userPrompt: "",
        firstMessage: "",
        knowledgeBaseIds: [],
        assignedPhoneNumberId: "",
        callForwardingEnabled: false,
        callForwardingNumber: "",
        status: "active",
        webhookUrl: "",
        agentType: "other",
        // Conversation Config defaults
        hangupAfterSilence: 10,
        incrementalDelay: 400,
        numberOfWordsForInterruption: 2,
        hangupAfterLLMCall: false,
        callCancellationPrompt: "",
        backchanneling: false,
        backchannelingMessageGap: 5,
        backchannelingStartDelay: 5,
        ambientNoise: false,
        ambientNoiseTrack: "office-ambience",
        callTerminate: 90,
        voicemail: false,
        disallowUnknownNumbers: false,
        inboundLimit: -1,
        // Ingest Source Config
        ingestSourceType: "api",
        ingestSourceUrl: "",
        ingestSourceAuthToken: "",
        ingestSourceName: "",
        // Input/Output
        inputProvider: "plivo",
        outputProvider: "plivo",
      };

      if (initialValues) {
        // For edit mode: merge defaults with initial values, preserving all fields
        const editValues = {
          ...defaults,
          ...initialValues,
          // Ensure arrays are properly set
          knowledgeBaseIds: Array.isArray(initialValues.knowledgeBaseIds) 
            ? initialValues.knowledgeBaseIds 
            : (initialValues.knowledgeBaseIds ? [initialValues.knowledgeBaseIds] : []),
          // Ensure all fields from defaults are present
          temperature: initialValues.temperature ?? defaults.temperature,
          maxDuration: initialValues.maxDuration ?? defaults.maxDuration,
          maxTokens: initialValues.maxTokens ?? defaults.maxTokens,
          callForwardingEnabled: initialValues.callForwardingEnabled ?? defaults.callForwardingEnabled,
          status: initialValues.status ?? defaults.status,
        };
        form.reset(editValues);
      } else {
        // For create mode: use defaults
        form.reset(defaults);
      }
      setActiveTab("agent"); // Reset to first tab when dialog opens
    }
    // eslint-disable-next-line
  }, [open, initialValues, models]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="agent-form-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {mode === "edit" ? "Edit Agent" : "Create Voice AI Agent"}
          </DialogTitle>
        </DialogHeader>
        <p id="agent-form-description" className="sr-only">
          {mode === "edit" ? "Edit AI agent configuration" : "Create a new AI agent"}
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-muted/50">
                <TabsTrigger value="agent" className="flex items-center gap-2 text-xs px-3 py-2">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Agent</span>
                </TabsTrigger>
                <TabsTrigger value="prompts" className="flex items-center gap-2 text-xs px-3 py-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Prompts</span>
                </TabsTrigger>
                <TabsTrigger value="llm" className="flex items-center gap-2 text-xs px-3 py-2">
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">LLM</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2 text-xs px-3 py-2">
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Audio</span>
                </TabsTrigger>
                <TabsTrigger value="transcriber" className="flex items-center gap-2 text-xs px-3 py-2">
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Transcriber</span>
                </TabsTrigger>
                <TabsTrigger value="conversation" className="flex items-center gap-2 text-xs px-3 py-2">
                  <Radio className="w-4 h-4" />
                  <span className="hidden sm:inline">Conversation</span>
                </TabsTrigger>
                <TabsTrigger value="inbound" className="flex items-center gap-2 text-xs px-3 py-2">
                  <PhoneIncoming className="w-4 h-4" />
                  <span className="hidden sm:inline">Inbound</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4 px-1">
                {/* Agent Tab - Agent Config */}
                <TabsContent value="agent" className="space-y-6 mt-0">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Agent Name *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g., Customer Support Agent" className="h-10" />
                              </FormControl>
                              <FormDescription>
                                The name of your voice AI agent
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Description</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={2} placeholder="Brief description of the agent's purpose" />
                              </FormControl>
                              <FormDescription>
                                Optional description to help identify this agent
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Agent Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select agent type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="customer_support">Customer Support</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="appointment">Appointment</SelectItem>
                                    <SelectItem value="survey">Survey</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Category of the agent
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
                                <FormLabel className="text-sm font-medium">Language</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-10">
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
                                    <SelectItem value="ja-JP">Japanese</SelectItem>
                                    <SelectItem value="zh-CN">Chinese</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Primary language for the agent
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Welcome Message</h3>
                      <FormField
                        control={form.control}
                        name="firstMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Agent Welcome Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={3}
                                placeholder="Hello! How can I help you today?"
                                className="font-sans"
                              />
                            </FormControl>
                            <FormDescription>
                              Initial message from the agent. Use {"{variable_name}"} for dynamic variables.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Webhook Configuration</h3>
                      <FormField
                        control={form.control}
                        name="webhookUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Webhook URL</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="url"
                                placeholder="https://your-domain.com/webhook"
                                className="h-10 font-mono text-sm"
                              />
                            </FormControl>
                            <FormDescription>
                              URL to receive conversation data via get_execution API
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Prompts Tab */}
                <TabsContent value="prompts" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">System Prompt *</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={12}
                              className="font-mono text-sm"
                              placeholder="You are a helpful customer support agent. You will help customers with their queries and provide accurate information..."
                            />
                          </FormControl>
                          <FormDescription>
                            Define the agent's behavior and personality. Use {"{variable_name}"} for variables and `@` for function calling.
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
                          <FormLabel className="text-sm font-medium">User Prompt</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Additional context from the call" className="h-10" />
                          </FormControl>
                          <FormDescription>
                            Additional context or instructions for the user's input
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* LLM Tab */}
                <TabsContent value="llm" className="space-y-4 mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Model Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="provider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">LLM Provider</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
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
                              <FormLabel className="text-sm font-medium">Model</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select model" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {models.map((m) => (
                                    <SelectItem key={m.id || m.name || m.model} value={m.model || m.name || m.id}>
                                      {m.model || m.name || m.id} {m.description ? `- ${m.description}` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Model Parameters</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="temperature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Temperature</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1" 
                                  min="0" 
                                  max="2" 
                                  {...field}
                                  className="h-10"
                                  placeholder="0.7"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Controls randomness (0-2)
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
                              <FormLabel className="text-sm font-medium">Max Tokens</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  className="h-10"
                                  placeholder="150"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Maximum response length
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="maxDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Max Duration (s)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field}
                                  className="h-10"
                                  placeholder="600"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Maximum call duration
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Audio Tab - Synthesizer */}
                <TabsContent value="audio" className="space-y-4 mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Voice Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="voiceProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Voice Provider *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select provider" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                                  <SelectItem value="polly">Polly</SelectItem>
                                  <SelectItem value="deepgram">Deepgram</SelectItem>
                                  <SelectItem value="styletts">StyleTTS</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Voice synthesis provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="voiceId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Voice *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select voice" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">Select Voice</SelectItem>
                                  {voices.map((v) => (
                                    <SelectItem key={v.voice_id || v.id} value={v.voice_id || v.id}>
                                      {v.voice_name || v.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Voice to use for speech synthesis
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Audio Settings</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="synthesizerBufferSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Buffer Size</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="250"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Audio buffer size
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="synthesizerAudioFormat"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Audio Format</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select format" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="wav">WAV</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Audio output format
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Transcriber Tab */}
                <TabsContent value="transcriber" className="space-y-4 mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Transcriber Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="transcriberProvider"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Provider</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select provider" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="deepgram">Deepgram</SelectItem>
                                  <SelectItem value="bodhi">Bodhi</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Speech-to-text provider
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="transcriberModel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Model</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="nova-2" className="h-10" />
                              </FormControl>
                              <FormDescription>
                                Transcriber model (e.g., nova-2, nova-3)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Transcriber Settings</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="transcriberLanguage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Language</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="en" className="h-10" />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Language code (en, hi, es, fr)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="transcriberSamplingRate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Sampling Rate</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="16000"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Audio sampling rate (Hz)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="transcriberEndpointing"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Endpointing (ms)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="250"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Silence detection threshold
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Conversation Tab - ConversationConfig */}
                <TabsContent value="conversation" className="space-y-4 mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Call Behavior</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="hangupAfterSilence"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Hangup After Silence (s)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="10"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Wait time before hanging up if user doesn't speak
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
                              <FormLabel className="text-sm font-medium">Incremental Delay (ms)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="400"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Linear delay before speaking on partial transcript
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="numberOfWordsForInterruption"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Words for Interruption</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="2"
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Words to wait before interrupting
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="callTerminate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Call Terminate (seconds)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  className="h-10"
                                  placeholder="90"
                                />
                              </FormControl>
                              <FormDescription>
                                Automatically disconnect call after this duration
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="backchanneling"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium">Backchanneling</FormLabel>
                                  <FormDescription className="text-xs">
                                    Enable agent to acknowledge during long user sentences
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ambientNoise"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium">Ambient Noise</FormLabel>
                                  <FormDescription className="text-xs">
                                    Add ambient noise for naturalism
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        {form.watch("ambientNoise") && (
                          <FormField
                            control={form.control}
                            name="ambientNoiseTrack"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Ambient Noise Track</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-10">
                                      <SelectValue placeholder="Select track" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="office-ambience">Office Ambience</SelectItem>
                                    <SelectItem value="coffee-shop">Coffee Shop</SelectItem>
                                    <SelectItem value="call-center">Call Center</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="voicemail"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium">Voicemail Detection</FormLabel>
                                  <FormDescription className="text-xs">
                                    Auto-disconnect if voicemail detected
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
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
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-sm font-medium">Disallow Unknown Numbers</FormLabel>
                                  <FormDescription className="text-xs">
                                    Only allow calls from ingested source numbers
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        {form.watch("backchanneling") && (
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="backchannelingMessageGap"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Backchanneling Message Gap (s)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      className="h-10"
                                      placeholder="5"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="backchannelingStartDelay"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">Backchanneling Start Delay (s)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      {...field}
                                      className="h-10"
                                      placeholder="5"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                        <FormField
                          control={form.control}
                          name="callCancellationPrompt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Call Cancellation Prompt</FormLabel>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  rows={2}
                                  placeholder="Optional prompt for call cancellation"
                                />
                              </FormControl>
                              <FormDescription>
                                Prompt to use when cancelling calls (if hangup_after_LLMCall is enabled)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Phone Number & Forwarding</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="assignedPhoneNumberId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Phone Number</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Select phone number" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="">No phone number</SelectItem>
                                  {phoneNumbers.map((n) => (
                                    <SelectItem key={n.id} value={n.id}>
                                      {n.phoneNumber || n.number || n.id} {n.provider ? `(${n.provider})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Phone number to assign to this agent
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="callForwardingEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Enable Call Forwarding</FormLabel>
                                <FormDescription className="text-xs">
                                  Transfer calls to a human agent when needed
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {form.watch("callForwardingEnabled") && (
                          <FormField
                            control={form.control}
                            name="callForwardingNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Forwarding Number</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="+1234567890" className="h-10" />
                                </FormControl>
                                <FormDescription>
                                  Phone number to forward calls to (E.164 format)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Knowledge Base</h3>
                      <FormField
                        control={form.control}
                        name="knowledgeBaseIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Knowledge Base</FormLabel>
                            <FormControl>
                              <select 
                                {...field} 
                                multiple 
                                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={Array.isArray(field.value) ? field.value : []}
                                onChange={(e) => {
                                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                                  field.onChange(selected);
                                }}
                              >
                                {knowledgeBaseItems.map((kb) => (
                                  <option key={kb.id} value={kb.id}>{kb.title}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormDescription>
                              Hold Ctrl/Cmd to select multiple knowledge base items
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Inbound Tab - IngestSourceConfig */}
                <TabsContent value="inbound" className="space-y-4 mt-0">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Ingestion Source Configuration</h3>
                      <FormField
                        control={form.control}
                        name="ingestSourceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Source Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Select source type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="api">API</SelectItem>
                                <SelectItem value="csv">CSV</SelectItem>
                                <SelectItem value="google_sheet">Google Sheet</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Type of CRM ingestion source for inbound calls
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {form.watch("ingestSourceType") === "api" && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="ingestSourceUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">API URL *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="url"
                                    placeholder="https://example.com/api/data"
                                    className="h-10 font-mono text-sm"
                                  />
                                </FormControl>
                                <FormDescription>
                                  API endpoint URL for fetching data
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ingestSourceAuthToken"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Auth Token *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="password"
                                    placeholder="Bearer token for API authentication"
                                    className="h-10 font-mono text-sm"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Bearer token for API authentication
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {form.watch("ingestSourceType") === "csv" && (
                      <>
                        <Separator />
                        <FormField
                          control={form.control}
                          name="ingestSourceName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">CSV File Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  placeholder="leads_sheet_june.csv"
                                  className="h-10"
                                />
                              </FormControl>
                              <FormDescription>
                                Name of the CSV file
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {form.watch("ingestSourceType") === "google_sheet" && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="ingestSourceUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Google Sheet URL *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="url"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    className="h-10 font-mono text-sm"
                                  />
                                </FormControl>
                                <FormDescription>
                                  URL of the Google Sheet
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="ingestSourceName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">Sheet Name *</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Sheet1"
                                    className="h-10"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Name of the sheet within the Google Sheet
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <h3 className="text-lg font-semibold mb-4">Inbound Call Limits</h3>
                      <FormField
                        control={form.control}
                        name="inboundLimit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Inbound Limit</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                className="h-10"
                                placeholder="-1"
                              />
                            </FormControl>
                            <FormDescription>
                              Number of times each phone number is allowed to call. Use -1 for unlimited.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className="mt-6 border-t pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="min-w-[120px]">
                {loading ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "edit" ? "Saving..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {mode === "edit" ? "Save Changes" : "Create Agent"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
