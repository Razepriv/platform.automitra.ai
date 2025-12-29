import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
      if (initialValues) {
        // Reset form with initial values for edit mode
        form.reset({
          name: "",
          description: "",
          model: models[0]?.model || models[0]?.name || "gpt-4",
          language: "en-US",
          provider: "openai",
          voiceProvider: "elevenlabs",
          temperature: 0.7,
          maxDuration: 600,
          maxTokens: 150,
          callForwardingEnabled: false,
          ...initialValues,
        });
      } else {
        // Reset to defaults for create mode
        form.reset({
          name: "",
          description: "",
          model: models[0]?.model || models[0]?.name || "gpt-4",
          language: "en-US",
          provider: "openai",
          voiceProvider: "elevenlabs",
          temperature: 0.7,
          maxDuration: 600,
          maxTokens: 150,
          callForwardingEnabled: false,
        });
      }
    }
    // eslint-disable-next-line
  }, [open, initialValues, models]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Agent" : "Create Agent"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Agent Name */}
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
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Language */}
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
            {/* Model Dropdown */}
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
            {/* Provider Dropdown */}
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
            {/* Voice Provider Dropdown */}
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
            {/* Voice Dropdown */}
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
                        <option key={v.voice_id || v.id} value={v.voice_id || v.id}>{v.voice_name || v.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Phone Number Dropdown */}
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
            {/* Knowledge Base Multi-select */}
            <FormField
              control={form.control}
              name="knowledgeBaseIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Knowledge Base</FormLabel>
                  <FormControl>
                    <select {...field} multiple className="input">
                      {knowledgeBaseItems.map((kb) => (
                        <option key={kb.id} value={kb.id}>{kb.title}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Advanced LLM Settings */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Advanced LLM Settings</h3>
              <div className="grid grid-cols-2 gap-4">
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

            {/* Prompts */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Prompts</h3>
              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System Prompt</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={6} className="font-mono text-sm" />
                    </FormControl>
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
                      <Input {...field} />
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
                    <FormLabel>First Message</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Call Forwarding */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold">Call Forwarding</h3>
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
            <DialogFooter>
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
