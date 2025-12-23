import type { AiAgent } from "@shared/schema";

const BOLNA_API_URL = "https://api.bolna.ai";
const BOLNA_API_KEY = process.env.BOLNA_API_KEY;

if (!BOLNA_API_KEY) {
  console.error("BOLNA_API_KEY environment variable is not set");
}

// Bolna API v2 Types - Matching exact API structure
interface BolnaAgentConfigV2 {
  agent_config: {
    agent_name: string;
    agent_welcome_message?: string;
    webhook_url?: string | null;
    agent_type: string;
    tasks: Array<{
      task_type: string;
      tools_config?: {
        llm_agent?: {
          agent_type: string;
          agent_flow_type: string;
          routes?: {
            embedding_model?: string;
            routes?: Array<{
              route_name: string;
              utterances: string[];
              response: string;
              score_threshold: number;
            }>;
          };
        };
        llm_config?: {
          agent_flow_type: string;
          provider: string;
          family: string;
          model: string;
          summarization_details?: any;
          extraction_details?: any;
          max_tokens: number;
          presence_penalty: number;
          frequency_penalty: number;
          base_url: string;
          top_p: number;
          min_p: number;
          top_k: number;
          temperature: number;
          request_json: boolean;
        };
        synthesizer?: {
          provider: string;
          provider_config: {
            voice: string;
            engine?: string;
            sampling_rate?: string;
            language: string;
          };
          stream: boolean;
          buffer_size: number;
          audio_format: string;
        };
        transcriber?: {
          provider: string;
          model: string;
          language: string;
          stream: boolean;
          sampling_rate: number;
          encoding: string;
          endpointing: number;
        };
        input?: {
          provider: string;
          format: string;
        };
        output?: {
          provider: string;
          format: string;
        };
        api_tools?: any;
      };
      toolchain?: {
        execution: string;
        pipelines: string[][];
      };
      task_config?: {
        hangup_after_silence?: number;
        incremental_delay?: number;
        number_of_words_for_interruption?: number;
        hangup_after_LLMCall?: boolean;
        call_cancellation_prompt?: string | null;
        backchanneling?: boolean;
        backchanneling_message_gap?: number;
        backchanneling_start_delay?: number;
        ambient_noise?: boolean;
        ambient_noise_track?: string;
        call_terminate?: number;
        voicemail?: boolean;
        inbound_limit?: number;
        whitelist_phone_numbers?: string[];
        disallow_unknown_numbers?: boolean;
      };
    }>;
    ingest_source_config?: {
      source_type: string;
      source_url: string;
      source_auth_token?: string;
      source_name?: string;
    };
    agent_prompts?: Record<string, { system_prompt: string }>;
  };
}

interface BolnaVoice {
  voice_id?: string;
  id?: string;
  name?: string;
  voice_name?: string;
  provider?: string;
  language?: string;
  gender?: string;
  description?: string;
}

interface BolnaModel {
  model: string;
  provider: string;
  family?: string;
  description?: string;
}

interface BolnaKnowledgeBase {
  rag_id: string;
  name?: string;
  created_at?: string;
  status?: string;
}

interface BolnaAgentConfig {
  agent_name: string;
  agent_type: string;
  agent_welcome_message?: string;
  tasks: BolnaTask[];
  llm_config?: {
    model?: string;
    provider?: string;
    temperature?: number;
    max_tokens?: number;
  };
  voice_config?: {
    provider?: string;
    voice_id?: string;
    language?: string;
  };
}

interface BolnaTask {
  task_type: string;
  toolchain?: {
    execution: string;
    pipelines: any[];
  };
}

interface BolnaAgent {
  agent_id: string;
  agent_name: string;
  agent_type: string;
  created_at: string;
  updated_at: string;
}

interface BolnaCallRequest {
  agent_id: string;
  recipient_phone_number: string;
  from?: string;
  metadata?: Record<string, any>;
}

interface BolnaCallResponse {
  call_id: string;
  status: string;
  agent_id: string;
  recipient_phone_number: string;
  created_at: string;
}

interface BolnaWebhookPayload {
  call_id: string;
  status: string;
  duration?: number;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, any>;
}

export class BolnaClient {
  private apiKey: string | null;
  private baseUrl: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = BOLNA_API_KEY || null;
    this.baseUrl = BOLNA_API_URL;
    this.isConfigured = !!BOLNA_API_KEY;
    
    if (!this.isConfigured) {
      console.warn("⚠️  Bolna API is not configured. AI agent Bolna integration will be disabled.");
      console.warn("   Set BOLNA_API_KEY environment variable to enable Bolna features.");
    }
  }
  
  private ensureConfigured(): void {
    if (!this.isConfigured || !this.apiKey) {
      throw new Error("Bolna API is not configured. Set BOLNA_API_KEY to use Bolna features.");
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bolna API error (${response.status}): ${errorText}`
        );
      }

      // Check if response is actually JSON
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(
          `Bolna API returned non-JSON response (${contentType || 'unknown'}): ${text.substring(0, 200)}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Bolna API request failed:", error);
      throw error;
    }
  }

  async configureProvider(providerName: string, providerValue: string): Promise<any> {
    this.ensureConfigured();
    
    console.log(`[Bolna] Configuring provider: ${providerName}`);
    
    try {
      return await this.request<any>("/providers", {
        method: "POST",
        body: JSON.stringify({
          provider_name: providerName,
          provider_value: providerValue,
        }),
      });
    } catch (error) {
      console.error(`Failed to configure provider ${providerName}:`, error);
      throw error;
    }
  }

  async registerPhoneNumber(phoneNumber: string, provider: string = "exotel"): Promise<any> {
    this.ensureConfigured();
    
    console.log(`[Bolna] Registering phone number: ${phoneNumber} with provider: ${provider}`);
    
    try {
      return await this.request<any>("/phone-numbers", {
        method: "POST",
        body: JSON.stringify({
          phone_number: phoneNumber,
          provider: provider,
        }),
      });
    } catch (error) {
      console.error(`Failed to register phone number ${phoneNumber}:`, error);
      throw error;
    }
  }

  async createAgent(agentData: AiAgent): Promise<BolnaAgent> {
    this.ensureConfigured();
    
    // If full Bolna config is provided, use it directly
    if (agentData.bolnaConfig) {
      console.log('[Bolna] Creating agent using provided full configuration');
      const config = agentData.bolnaConfig as BolnaAgentConfigV2;
      
      // Ensure webhook URL is set if not provided
      if (!config.agent_config.webhook_url && process.env.PUBLIC_WEBHOOK_URL) {
        config.agent_config.webhook_url = `${process.env.PUBLIC_WEBHOOK_URL}/api/webhooks/bolna/call-status`;
      }
      
      // Ensure prompts are set
      if (agentData.systemPrompt) {
        config.agent_config.agent_prompts = {
          task_1: {
            system_prompt: agentData.systemPrompt
          }
        };
      }

      return await this.request<BolnaAgent>("/v2/agent", {
        method: "POST",
        body: JSON.stringify(config),
      });
    }
    
    console.log('[Bolna] Creating agent with data:', JSON.stringify({
      name: agentData.name,
      voiceId: agentData.voiceId,
      voiceProvider: agentData.voiceProvider,
      model: agentData.model,
      provider: agentData.provider,
    }, null, 2));
    
    // Validate required fields
    if (!agentData.voiceId) {
      throw new Error("Voice ID is required to create a Bolna agent. Please select a voice first.");
    }
    
    // Determine voice provider from voiceProvider field
    const voiceProvider = agentData.voiceProvider && agentData.voiceProvider !== 'all' 
      ? agentData.voiceProvider 
      : "elevenlabs";
    
    // Build synthesizer config - Bolna requires specific fields per provider
    let synthesizerConfig: any;
    
    if (voiceProvider === "elevenlabs") {
      // ElevenLabs requires voice, voice_id, and model per API docs
      synthesizerConfig = {
        provider: "elevenlabs",
        provider_config: {
          voice: agentData.voiceId,
          voice_id: agentData.voiceId,
          model: "eleven_turbo_v2_5",
          sampling_rate: "16000",
        },
        stream: true,
        audio_format: "wav",
        buffer_size: 400,
      };
    } else if (voiceProvider === "polly") {
      synthesizerConfig = {
        provider: "polly",
        provider_config: {
          voice: agentData.voiceId,
          engine: "generative",
          sampling_rate: "8000",
          language: agentData.language || "en-US",
        },
        stream: true,
        audio_format: "wav",
        buffer_size: 150,
      };
    } else {
      // Default config for other providers
      synthesizerConfig = {
        provider: voiceProvider,
        provider_config: {
          voice: agentData.voiceId,
          language: agentData.language || "en-US",
        },
        stream: true,
        audio_format: "wav",
        buffer_size: 400,
      };
    }

    // Build minimal required config for Bolna v2 API
    const webhookUrl = process.env.PUBLIC_WEBHOOK_URL 
      ? `${process.env.PUBLIC_WEBHOOK_URL}/api/webhooks/bolna/call-status`
      : null;
    
    // Construct API tools if call forwarding is enabled
    let apiTools = null;
    let systemPrompt = agentData.systemPrompt || "You are a helpful AI voice assistant.";

    if (agentData.callForwardingEnabled && agentData.callForwardingNumber) {
      apiTools = {
        tools: [
          {
            type: "function",
            function: {
              name: "transferCall",
              description: "Transfers the call to a human agent or another department.",
              parameters: {
                type: "object",
                properties: {
                  phoneNumber: {
                    type: "string",
                    description: "The phone number to transfer to."
                  }
                },
                required: ["phoneNumber"]
              }
            }
          }
        ]
      };

      systemPrompt += `\n\nIf the user asks to speak to a human or if you cannot help them, use the transferCall tool to transfer the call to ${agentData.callForwardingNumber}.`;
    }

    const config: BolnaAgentConfigV2 = {
      agent_config: {
        agent_name: agentData.name,
        agent_welcome_message: agentData.firstMessage || "Hello! How can I help you today?",
        webhook_url: webhookUrl,
        agent_type: "other",
        tasks: [
          {
            task_type: "conversation",
            tools_config: {
              llm_agent: {
                agent_type: "simple_llm_agent",
                agent_flow_type: "streaming",
                llm_config: {
                  agent_flow_type: "streaming",
                  provider: agentData.provider || "openai",
                  family: agentData.provider || "openai",
                  model: agentData.model || "gpt-3.5-turbo",
                  max_tokens: agentData.maxTokens || 150,
                  temperature: agentData.temperature || 0.7,
                  presence_penalty: 0,
                  frequency_penalty: 0,
                  base_url: "https://api.openai.com/v1",
                  top_p: 0.9,
                  min_p: 0.1,
                  top_k: 0,
                  request_json: true,
                  summarization_details: null,
                  extraction_details: null,
                },
              },
              synthesizer: synthesizerConfig,
              transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: (agentData.language || "en").split('-')[0] || "en",
                stream: true,
                sampling_rate: 16000,
                encoding: "linear16",
                endpointing: 100,
              },
              input: {
                provider: agentData.telephonyProvider || "plivo",
                format: "wav",
              },
              output: {
                provider: agentData.telephonyProvider || "plivo",
                format: "wav",
              },
              api_tools: apiTools,
            },
            toolchain: {
              execution: "parallel",
              pipelines: [["transcriber", "llm", "synthesizer"]],
            },
            task_config: {
              hangup_after_silence: 10,
              incremental_delay: 400,
              number_of_words_for_interruption: 2,
              hangup_after_LLMCall: false,
              call_cancellation_prompt: null,
              backchanneling: false,
              backchanneling_message_gap: 5,
              backchanneling_start_delay: 5,
              ambient_noise: false,
              ambient_noise_track: "office-ambience",
              call_terminate: agentData.maxDuration || 90,
              voicemail: false,
              inbound_limit: -1,
              whitelist_phone_numbers: ["<any>"],
              disallow_unknown_numbers: false,
            },
          },
        ],
      },
      agent_prompts: {
        task_1: {
          system_prompt: systemPrompt,
        },
      },
    };

    console.log('[Bolna] Sending config to Bolna API:', JSON.stringify(config, null, 2));

    const response = await this.request<{ agent_id: string; agent_name: string; agent_type: string; created_at: string; updated_at: string }>("/v2/agent", {
      method: "POST",
      body: JSON.stringify(config),
    });

    return {
      agent_id: response.agent_id,
      agent_name: response.agent_name,
      agent_type: response.agent_type,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  }

  async updateAgent(
    agentId: string,
    updates: Partial<AiAgent>
  ): Promise<BolnaAgent> {
    this.ensureConfigured();
    
    // Build partial v2 config for updates
    const webhookUrl = process.env.PUBLIC_WEBHOOK_URL 
      ? `${process.env.PUBLIC_WEBHOOK_URL}/api/webhooks/bolna/call-status`
      : null;
    
    const config: Partial<BolnaAgentConfigV2> = {
      agent_config: {} as any,
    };

    if (updates.name) {
      config.agent_config!.agent_name = updates.name;
    }
    if (updates.firstMessage || updates.systemPrompt) {
      config.agent_config!.agent_welcome_message = updates.firstMessage || updates.systemPrompt || undefined;
    }
    
    // Always update webhook URL to ensure it's current
    config.agent_config!.webhook_url = webhookUrl;
    if (updates.agentType) {
      config.agent_config!.agent_type = updates.agentType;
    }

    // Update tasks if any LLM or voice config changes OR call forwarding changes
    if (updates.model || updates.provider || updates.temperature || updates.maxTokens || 
        updates.voiceId || updates.voiceProvider || updates.language || updates.maxDuration ||
        updates.callForwardingEnabled !== undefined || updates.callForwardingNumber !== undefined) {
      
      const voiceProvider = updates.voiceProvider && updates.voiceProvider !== 'all' 
        ? updates.voiceProvider 
        : "elevenlabs";

      let synthesizerConfig: any = null;
      if (updates.voiceId) {
        if (voiceProvider === "elevenlabs") {
          // ElevenLabs requires voice, voice_id, and model per API docs
          synthesizerConfig = {
            provider: "elevenlabs",
            provider_config: {
              voice: updates.voiceId,
              voice_id: updates.voiceId,
              model: "eleven_turbo_v2_5",
              sampling_rate: "16000",
            },
            stream: true,
            audio_format: "wav",
            buffer_size: 400,
          };
        } else if (voiceProvider === "polly") {
          synthesizerConfig = {
            provider: "polly",
            provider_config: {
              voice: updates.voiceId,
              engine: "generative",
              sampling_rate: "8000",
              language: updates.language || "en-US",
            },
            stream: true,
            audio_format: "wav",
            buffer_size: 150,
          };
        } else {
          // Default config for other providers
          synthesizerConfig = {
            provider: voiceProvider,
            provider_config: {
              voice: updates.voiceId,
              language: updates.language || "en-US",
            },
            stream: true,
            audio_format: "wav",
            buffer_size: 400,
          };
        }
      }

      // Construct API tools if call forwarding is enabled
      let apiTools = null;
      if (updates.callForwardingEnabled && updates.callForwardingNumber) {
        apiTools = {
          tools: [
            {
              type: "function",
              function: {
                name: "transferCall",
                description: "Transfers the call to a human agent or another department.",
                parameters: {
                  type: "object",
                  properties: {
                    phoneNumber: {
                      type: "string",
                      description: "The phone number to transfer to."
                    }
                  },
                  required: ["phoneNumber"]
                }
              }
            }
          ]
        };
      }

      config.agent_config!.tasks = [{
        task_type: "conversation",
        tools_config: {
          llm_agent: {
            agent_type: "simple_llm_agent",
            agent_flow_type: "streaming",
            llm_config: {
              agent_flow_type: "streaming",
              provider: updates.provider || "openai",
              family: updates.provider || "openai",
              model: updates.model || "gpt-3.5-turbo",
              max_tokens: updates.maxTokens || 150,
              temperature: updates.temperature || 0.7,
              presence_penalty: 0,
              frequency_penalty: 0,
              base_url: "https://api.openai.com/v1",
              top_p: 0.9,
              min_p: 0.1,
              top_k: 0,
              request_json: true,
              summarization_details: null,
              extraction_details: null,
            },
          },
          synthesizer: synthesizerConfig,
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: (updates.language || "en").split('-')[0] || "en",
            stream: true,
            sampling_rate: 16000,
            encoding: "linear16",
            endpointing: 100,
          },
          input: {
            provider: updates.telephonyProvider || "plivo",
            format: "wav",
          },
          output: {
            provider: updates.telephonyProvider || "plivo",
            format: "wav",
          },
          api_tools: apiTools,
        },
        toolchain: {
          execution: "parallel",
          pipelines: [["transcriber", "llm", "synthesizer"]],
        },
        task_config: {
          hangup_after_silence: 10,
          incremental_delay: 400,
          number_of_words_for_interruption: 2,
          hangup_after_LLMCall: false,
          call_cancellation_prompt: null,
          backchanneling: false,
          backchanneling_message_gap: 5,
          backchanneling_start_delay: 5,
          ambient_noise: false,
          ambient_noise_track: "office-ambience",
          call_terminate: updates.maxDuration || 90,
          voicemail: false,
          inbound_limit: -1,
          whitelist_phone_numbers: ["<any>"],
          disallow_unknown_numbers: false,
        },
      }];
    }

    if (updates.systemPrompt || (updates.callForwardingEnabled && updates.callForwardingNumber)) {
      let systemPrompt = updates.systemPrompt || "You are a helpful AI voice assistant.";
      
      if (updates.callForwardingEnabled && updates.callForwardingNumber) {
         systemPrompt += `\n\nIf the user asks to speak to a human or if you cannot help them, use the transferCall tool to transfer the call to ${updates.callForwardingNumber}.`;
      }

      config.agent_prompts = {
        task_1: {
          system_prompt: systemPrompt,
        },
      };
    }

    return await this.request<BolnaAgent>(`/v2/agent/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(config),
    });
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.ensureConfigured();
    await this.request<void>(`/v2/agent/${agentId}`, {
      method: "DELETE",
    });
  }

  async getAgent(agentId: string): Promise<BolnaAgent> {
    this.ensureConfigured();
    return await this.request<BolnaAgent>(`/v2/agent/${agentId}`);
  }

  async listAgents(): Promise<BolnaAgent[]> {
    this.ensureConfigured();
    // Try v2 first, fallback to v1
    try {
      const response = await this.request<{ agents?: BolnaAgent[] } | BolnaAgent[]>("/v2/agents");
      if (Array.isArray(response)) {
        return response;
      }
      if (response && typeof response === 'object' && 'agents' in response) {
        return (response as any).agents || [];
      }
      return [];
    } catch (error) {
      // Fallback to v1
      const response = await this.request<{ agents: BolnaAgent[] }>("/v1/agents");
      return response.agents || [];
    }
  }

  async initiateCall(callData: BolnaCallRequest): Promise<BolnaCallResponse> {
    this.ensureConfigured();
    return await this.request<BolnaCallResponse>("/v1/calls", {
      method: "POST",
      body: JSON.stringify(callData),
    });
  }

  async getCallStatus(callId: string): Promise<any> {
    this.ensureConfigured();
    return await this.request<any>(`/v1/calls/${callId}`);
  }

  async getCallTranscript(callId: string): Promise<string> {
    this.ensureConfigured();
    const response = await this.request<{ transcript: string }>(
      `/v1/calls/${callId}/transcript`
    );
    return response.transcript;
  }

  async getCallDetails(callId: string): Promise<{ transcript?: string; recording_url?: string; status?: string; duration?: number }> {
    this.ensureConfigured();
    
    const endpoints = [
      `/call/${callId}`,           // Main endpoint
      `/v2/call/${callId}`,         // V2 endpoint
      `/agent/execution/${callId}`, // Execution endpoint
      `/calls/${callId}`,           // Alternative calls endpoint
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`[Bolna] Trying endpoint: ${endpoint}`);
        const response = await this.request<any>(endpoint);
        
        console.log(`[Bolna] ✓ Success with ${endpoint}:`, JSON.stringify(response, null, 2));
        
        // Extract data from various possible field names
        const transcript = response.transcript || 
                          response.transcription || 
                          response.conversation_transcript ||
                          response.messages?.map((m: any) => `${m.role}: ${m.content}`).join('\n') ||
                          response.conversation?.map((c: any) => `${c.speaker}: ${c.text}`).join('\n');
        
        const recording_url = response.recording_url || 
                             response.recordingUrl || 
                             response.recording || 
                             response.audio_url ||
                             response.call_recording;
        
        const status = response.status || 
                      response.call_status || 
                      response.state;
        
        const duration = response.duration || 
                        response.call_duration ||
                        response.length;
        
        if (transcript || recording_url || status) {
          return {
            transcript,
            recording_url,
            status,
            duration
          };
        }
      } catch (error: any) {
        console.log(`[Bolna] ✗ Failed with ${endpoint}: ${error.message}`);
        continue; // Try next endpoint
      }
    }
    
    // If all endpoints fail, try to get transcript and recording separately
    console.log(`[Bolna] Trying separate transcript/recording endpoints for ${callId}`);
    const result: any = {};
    
    try {
      const transcriptResp = await this.request<any>(`/call/${callId}/transcript`);
      result.transcript = transcriptResp.transcript || transcriptResp.text || transcriptResp.content;
    } catch (e) {
      console.log(`[Bolna] No transcript available`);
    }
    
    try {
      const recordingResp = await this.request<any>(`/call/${callId}/recording`);
      result.recording_url = recordingResp.recording_url || recordingResp.url || recordingResp.audio_url;
    } catch (e) {
      console.log(`[Bolna] No recording available`);
    }
    
    return result;
  }

  async getAvailableVoices(): Promise<BolnaVoice[]> {
    this.ensureConfigured();
    try {
      // Use Bolna's correct endpoint: GET /me/voices
      const response = await this.request<BolnaVoice[] | { data?: BolnaVoice[]; voices?: BolnaVoice[] }>("/me/voices");
      // Handle both array and object responses
      if (Array.isArray(response)) {
        return response;
      }
      if (response && typeof response === 'object') {
        // Check for 'data' field (Bolna v2 format)
        if ('data' in response && Array.isArray((response as any).data)) {
          return (response as any).data;
        }
        // Check for 'voices' field (alternative format)
        if ('voices' in response && Array.isArray((response as any).voices)) {
          return (response as any).voices;
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching Bolna voices:", error);
      return [];
    }
  }

  async getAvailableModels(): Promise<BolnaModel[]> {
    // Bolna doesn't have a models endpoint, so we return a curated list
    // of commonly used models that work with Bolna's API
    return [
      // OpenAI Models
      { model: "gpt-4o", provider: "openai", family: "openai", description: "Most advanced GPT-4 model" },
      { model: "gpt-4o-mini", provider: "openai", family: "openai", description: "Faster, more affordable GPT-4" },
      { model: "gpt-4-turbo", provider: "openai", family: "openai", description: "GPT-4 Turbo with Vision" },
      { model: "gpt-4", provider: "openai", family: "openai", description: "GPT-4 base model" },
      { model: "gpt-3.5-turbo", provider: "openai", family: "openai", description: "Fast and efficient" },
      
      // Anthropic Models
      { model: "claude-3-5-sonnet-20241022", provider: "anthropic", family: "anthropic", description: "Most capable Claude model" },
      { model: "claude-3-opus-20240229", provider: "anthropic", family: "anthropic", description: "Claude Opus" },
      { model: "claude-3-sonnet-20240229", provider: "anthropic", family: "anthropic", description: "Claude Sonnet" },
      { model: "claude-3-haiku-20240307", provider: "anthropic", family: "anthropic", description: "Fast Claude model" },
      
      // Google Models
      { model: "gemini-1.5-pro", provider: "google", family: "google", description: "Advanced Gemini Pro" },
      { model: "gemini-1.5-flash", provider: "google", family: "google", description: "Fast Gemini model" },
      { model: "gemini-pro", provider: "google", family: "google", description: "Gemini Pro" },
      
      // Meta Models  
      { model: "llama-3.1-70b-instruct", provider: "meta", family: "meta", description: "Llama 3.1 70B" },
      { model: "llama-3.1-8b-instruct", provider: "meta", family: "meta", description: "Llama 3.1 8B" },
      { model: "llama-3-70b-instruct", provider: "meta", family: "meta", description: "Llama 3 70B" },
      { model: "llama-3-8b-instruct", provider: "meta", family: "meta", description: "Llama 3 8B" },
      
      // Mistral Models
      { model: "mistral-large-latest", provider: "mistral", family: "mistral", description: "Mistral Large" },
      { model: "mistral-medium-latest", provider: "mistral", family: "mistral", description: "Mistral Medium" },
      { model: "mistral-small-latest", provider: "mistral", family: "mistral", description: "Mistral Small" },
    ];
  }

  // Knowledge Base Management
  async createKnowledgeBase(file: File | Buffer | any, options?: {
    chunk_size?: number;
    similarity_top_k?: number;
    overlapping?: number;
    fileName?: string;
  }): Promise<BolnaKnowledgeBase> {
    this.ensureConfigured();
    
    // Use form-data package for Node.js FormData support
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    if (options?.chunk_size) formData.append('chunk_size', options.chunk_size.toString());
    if (options?.similarity_top_k) formData.append('similarity_top_k', options.similarity_top_k.toString());
    if (options?.overlapping) formData.append('overlapping', options.overlapping.toString());
    
    if (Buffer.isBuffer(file)) {
      formData.append('file', file, options?.fileName || 'file');
    } else if (file && typeof file === 'object' && 'buffer' in file) {
      // Handle multer file object
      formData.append('file', file.buffer, file.originalname || options?.fileName || 'file');
    } else {
      throw new Error('Invalid file type. Expected Buffer or multer file object.');
    }

    const url = `${this.baseUrl}/knowledgebase`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      ...formData.getHeaders(),
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bolna API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  async getKnowledgeBase(ragId: string): Promise<BolnaKnowledgeBase> {
    this.ensureConfigured();
    return await this.request<BolnaKnowledgeBase>(`/knowledgebase/${ragId}`);
  }

  async listKnowledgeBases(): Promise<BolnaKnowledgeBase[]> {
    this.ensureConfigured();
    try {
      const response = await this.request<BolnaKnowledgeBase[] | { knowledge_bases?: BolnaKnowledgeBase[] }>("/knowledgebase/all");
      if (Array.isArray(response)) {
        return response;
      }
      if (response && typeof response === 'object' && 'knowledge_bases' in response) {
        return Array.isArray((response as any).knowledge_bases) ? (response as any).knowledge_bases : [];
      }
      return [];
    } catch (error) {
      console.error("Error fetching knowledge bases:", error);
      return [];
    }
  }

  // Inbound Setup
  async setupInboundCall(agentId: string, phoneNumber: string, provider: string = "exotel"): Promise<any> {
    this.ensureConfigured();
    return await this.request("/inbound/setup", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentId,
        phone_number: phoneNumber,
        provider: provider,
      }),
    });
  }

  // Call Management
  async stopAgentCalls(agentId: string): Promise<any> {
    this.ensureConfigured();
    return await this.request(`/v2/agent/${agentId}/stop`, {
      method: "POST",
    });
  }

  async stopCall(executionId: string): Promise<any> {
    this.ensureConfigured();
    return await this.request(`/call/${executionId}/stop`, {
      method: "POST",
    });
  }

  async getAgentExecution(agentId: string, executionId: string): Promise<any> {
    this.ensureConfigured();
    return await this.request(`/agent/${agentId}/execution/${executionId}`);
  }

  // Enhanced call initiation with v2 features
  async initiateCallV2(callData: {
    agent_id: string;
    recipient_phone_number: string;
    from_phone_number?: string;
    scheduled_at?: string;
    user_data?: Record<string, any>;
  }): Promise<any> {
    this.ensureConfigured();
    return await this.request("/call", {
      method: "POST",
      body: JSON.stringify(callData),
    });
  }
}

export const bolnaClient = new BolnaClient();
