import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Settings, Volume2, Cpu, Phone, Wrench, BarChart3, PhoneIncoming } from "lucide-react";

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
      };

      if (initialValues) {
        // For edit mode: merge defaults with initial values, preserving all fields
        form.reset({
          ...defaults,
          ...initialValues,
          // Ensure arrays are properly set
          knowledgeBaseIds: initialValues.knowledgeBaseIds || [],
        });
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="agent-form-description">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Agent" : "Create Agent"}</DialogTitle>
        </DialogHeader>
        <p id="agent-form-description" className="sr-only">
          {mode === "edit" ? "Edit AI agent configuration" : "Create a new AI agent"}
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="grid w-full grid-cols-8 h-auto p-1">
                <TabsTrigger value="agent" className="flex items-center gap-2 text-xs">
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Agent</span>
                </TabsTrigger>
                <TabsTrigger value="llm" className="flex items-center gap-2 text-xs">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">LLM</span>
                </TabsTrigger>
                <TabsTrigger value="audio" className="flex items-center gap-2 text-xs">
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Audio</span>
                </TabsTrigger>
                <TabsTrigger value="engine" className="flex items-center gap-2 text-xs">
                  <Cpu className="w-4 h-4" />
                  <span className="hidden sm:inline">Engine</span>
                </TabsTrigger>
                <TabsTrigger value="call" className="flex items-center gap-2 text-xs">
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex items-center gap-2 text-xs">
                  <Wrench className="w-4 h-4" />
                  <span className="hidden sm:inline">Tools</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="inbound" className="flex items-center gap-2 text-xs">
                  <PhoneIncoming className="w-4 h-4" />
                  <span className="hidden sm:inline">Inbound</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                {/* Agent Tab */}
                <TabsContent value="agent" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Textarea {...field} rows={3} />
                          </FormControl>
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
                          <FormControl>
                            <select {...field} className="input">
                              <option value="en-US">English (US)</option>
                              <option value="en-GB">English (UK)</option>
                              <option value="es-ES">Spanish</option>
                              <option value="fr-FR">French</option>
                              <option value="de-DE">German</option>
                              <option value="hi-IN">Hindi</option>
                              <option value="ja-JP">Japanese</option>
                              <option value="zh-CN">Chinese</option>
                            </select>
                          </FormControl>
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
                              rows={3}
                              placeholder="This will be the initial message from the agent. You can use variables here using {variable_name}"
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-muted-foreground mt-1">
                            This will be the initial message from the agent. You can use variables here using {"{variable_name}"}
                          </p>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="systemPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Agent Prompt</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={8}
                              className="font-mono text-sm"
                              placeholder="You are a helpful agent. You will help the customer with their queries and doubts."
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-muted-foreground mt-1">
                            You can define variables in the prompt using {"{variable_name}"}. Use `@` to mention function calling.
                          </p>
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
                            <Input {...field} placeholder="Additional context or instructions" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* LLM Tab */}
                <TabsContent value="llm" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <select {...field} className="input">
                              {models.map((m) => (
                                <option key={m.id || m.name || m.model} value={m.model || m.name || m.id}>
                                  {m.model || m.name || m.id} {m.description ? `- ${m.description}` : ''}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LLM Provider</FormLabel>
                          <FormControl>
                            <select {...field} className="input">
                              {providers.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </FormControl>
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
                            <FormLabel>Temperature (0-2)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" min="0" max="2" {...field} />
                            </FormControl>
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
                              <Input type="number" min="1" {...field} />
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
                            <FormLabel>Max Duration (seconds)</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Audio Tab */}
                <TabsContent value="audio" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="voiceProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voice Provider</FormLabel>
                          <FormControl>
                            <select {...field} className="input">
                              <option value="elevenlabs">ElevenLabs</option>
                              <option value="polly">Polly</option>
                              <option value="google">Google</option>
                              <option value="azure">Azure</option>
                            </select>
                          </FormControl>
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
                          <FormControl>
                            <select {...field} className="input">
                              <option value="">Select Voice</option>
                              {voices.map((v) => (
                                <option key={v.voice_id || v.id} value={v.voice_id || v.id}>
                                  {v.voice_name || v.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Engine Tab */}
                <TabsContent value="engine" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="transcriberProvider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transcriber Provider</FormLabel>
                          <FormControl>
                            <select {...field} className="input">
                              <option value="deepgram">Deepgram</option>
                              <option value="whisper">Whisper</option>
                              <option value="google">Google</option>
                            </select>
                          </FormControl>
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
                            <Input {...field} placeholder="nova-2" />
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
                          <FormLabel>Transcriber Language</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="en" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Call Tab */}
                <TabsContent value="call" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="assignedPhoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <select {...field} className="input">
                              <option value="">Select Number</option>
                              {phoneNumbers.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.phoneNumber || n.number || n.id} {n.provider ? `(${n.provider})` : ''} {n.friendlyName ? `- ${n.friendlyName}` : ''}
                                </option>
                              ))}
                            </select>
                          </FormControl>
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
                            <FormLabel className="text-base">Enable Call Forwarding</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Transfer calls to a human agent when needed
                            </div>
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
                            <FormLabel>Forwarding Number</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="+1234567890" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </TabsContent>

                {/* Tools Tab */}
                <TabsContent value="tools" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="knowledgeBaseIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Knowledge Base</FormLabel>
                          <FormControl>
                            <select 
                              {...field} 
                              multiple 
                              className="input min-h-[200px]"
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
                          <FormMessage />
                          <p className="text-sm text-muted-foreground mt-1">
                            Hold Ctrl/Cmd to select multiple knowledge base items
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Analytics configuration will be available here. This includes settings for tracking agent performance, call metrics, and reporting.
                    </p>
                  </div>
                </TabsContent>

                {/* Inbound Tab */}
                <TabsContent value="inbound" className="space-y-4 mt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Inbound call configuration will be available here. This includes settings for handling incoming calls, IVR configuration, and routing rules.
                    </p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={loading}>
                {mode === "edit" ? "Save Changes" : "Create Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
