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
import { Card, CardContent } from "@/components/ui/card";

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
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      model: models[0]?.name || "gpt-4",
      language: "en-US",
      provider: providers[0] || "azuretts",
      temperature: 0.7,
      maxDuration: 600,
      maxTokens: 150,
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
        ...initialValues,
      });
      setActiveTab("basic");
    }
    // eslint-disable-next-line
  }, [open, initialValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Agent" : "Create Agent"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? "Update the agent configuration and settings." : "Configure your new AI agent with voice, model, and behavior settings."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="voice">Voice</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
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

                    <FormField
                      control={form.control}
                      name="assignedPhoneNumberId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Number" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Select Number</SelectItem>
                              {phoneNumbers.map((n) => (
                                <SelectItem key={n.id} value={n.id}>
                                  {n.number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {phoneNumbers.length === 0 ? "No phone numbers available. They will be synced automatically." : "Select a phone number for this agent"}
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
                          <Select onValueChange={(value) => field.onChange([value])} value={field.value?.[0] || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select knowledge base" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {knowledgeBaseItems.map((kb) => (
                                <SelectItem key={kb.id} value={kb.id}>
                                  {kb.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {knowledgeBaseItems.length === 0 ? "No knowledge bases available" : "Optional: Link a knowledge base to this agent"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Voice Tab */}
              <TabsContent value="voice" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {providers.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
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
                          <FormLabel>Voice</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Voice" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Select Voice</SelectItem>
                              {voices.map((v) => (
                                <SelectItem key={v.voice_id || v.id} value={v.voice_id || v.id || ""}>
                                  {v.voice_name || v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the voice for your AI agent
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
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Prompts Tab */}
              <TabsContent value="prompts" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
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

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <FormField
                      control={form.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature ({field.value})</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.1" min="0" max="2" />
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
                      name="maxTokens"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Tokens</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="50" max="1000" />
                          </FormControl>
                          <FormDescription>
                            Maximum response length per message
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
                          <FormLabel>Hangup After Silence (seconds)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="5" max="60" />
                          </FormControl>
                          <FormDescription>
                            Auto-hangup after silence duration
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4">
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