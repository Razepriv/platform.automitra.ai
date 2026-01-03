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
          llm_config?: {
            agent_flow_type: string;
            provider: string;
            family?: string;
            model: string;
            summarization_details?: any;
            extraction_details?: any;
            max_tokens: number;
            presence_penalty: number;
            frequency_penalty: number;
            base_url?: string;
            top_p: number;
            min_p: number;
            top_k: number;
            temperature: number;
            request_json: boolean;
          };
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
  };
}

// Bolna API v2 Request structure - agent_prompts is at top level, not inside agent_config
interface BolnaAgentRequestV2 {
  agent_config: BolnaAgentConfigV2['agent_config'];
  agent_prompts: {
    task_1: {
      system_prompt: string;
    };
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

  /**
   * Normalize webhook URL to ensure it has a protocol
   * If the URL doesn't start with http:// or https://, add https://
   */
  private normalizeWebhookUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    
    // If URL already has protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Add https:// if missing
    return `https://${url}`;
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
        let errorData: any = null;
        
        // Try to parse error as JSON
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, use the text as is
          errorData = { message: errorText };
        }
        
        // Create error with full details
        const error = new Error(
          `Bolna API error (${response.status}): ${errorData.message || errorText}`
        ) as any;
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw error;
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

  async searchAvailablePhoneNumbers(params?: {
    country?: string;
    pattern?: string;
    type?: string;
  }): Promise<any> {
    this.ensureConfigured();

    try {
      const queryParams = new URLSearchParams();
      if (params?.country) queryParams.append('country', params.country);
      if (params?.pattern) queryParams.append('pattern', params.pattern);
      if (params?.type) queryParams.append('type', params.type);

      const queryString = queryParams.toString();
      const endpoint = `/phone-numbers/search${queryString ? `?${queryString}` : ''}`;

      return await this.request<any>(endpoint);
    } catch (error) {
      console.error('Failed to search available phone numbers from Bolna:', error);
      throw error;
    }
  }

  /**
   * List all phone numbers registered in Bolna account
   * Returns numbers with telephony provider (twilio, plivo, vonage, etc.)
   */
  async listRegisteredPhoneNumbers(): Promise<Array<{
    id: string;
    phone_number: string;
    agent_id: string | null;
    telephony_provider: string;
    price: string;
    rented: boolean;
    created_at: string;
    updated_at: string;
    renewal_at: string;
    humanized_created_at: string;
    humanized_updated_at: string;
  }>> {
    this.ensureConfigured();

    try {
      return await this.request<Array<{
        id: string;
        phone_number: string;
        agent_id: string | null;
        telephony_provider: string;
        price: string;
        rented: boolean;
        created_at: string;
        updated_at: string;
        renewal_at: string;
        humanized_created_at: string;
        humanized_updated_at: string;
      }>>("/phone-numbers/all");
    } catch (error) {
      console.error('Failed to list registered phone numbers from Bolna:', error);
      throw error;
    }
  }

  async createAgent(agentData: AiAgent): Promise<BolnaAgent> {
    this.ensureConfigured();

    // If full Bolna config is provided, use it directly but validate/ensure required fields
    if (agentData.bolnaConfig) {
      console.log('[Bolna] Creating agent using provided full configuration');
      const config = agentData.bolnaConfig as BolnaAgentConfigV2;

      // Ensure webhook URL is set if not provided
      if (!config.agent_config.webhook_url && process.env.PUBLIC_WEBHOOK_URL) {
        const baseUrl = this.normalizeWebhookUrl(process.env.PUBLIC_WEBHOOK_URL);
        config.agent_config.webhook_url = baseUrl ? `${baseUrl}/api/webhooks/bolna/call-status` : null;
      } else if (config.agent_config.webhook_url) {
        // Normalize existing webhook URL
        config.agent_config.webhook_url = this.normalizeWebhookUrl(config.agent_config.webhook_url);
      }

      // CRITICAL: Ensure synthesizer has required voice fields for ElevenLabs
      if (config.agent_config.tasks && config.agent_config.tasks.length > 0) {
        const task = config.agent_config.tasks[0];
        if (task.tools_config?.synthesizer) {
          const synthesizer = task.tools_config.synthesizer;
          const voiceProvider = synthesizer.provider || agentData.voiceProvider;
          
          // If ElevenLabs, ensure voice (name) and voice_id (ID) are set per API spec
          if (voiceProvider === "elevenlabs" || voiceProvider === "ElevenLabs") {
            if (!synthesizer.provider_config) {
              synthesizer.provider_config = {};
            }
            // Use voiceId from agentData if not set in config
            const voiceId = agentData.voiceId || synthesizer.provider_config.voice_id;
            const voiceName = agentData.voiceName || synthesizer.provider_config.voice || voiceId;
            if (voiceId) {
              synthesizer.provider_config.voice = voiceName; // Voice name (string)
              synthesizer.provider_config.voice_id = voiceId; // Unique voice ID
              // Ensure model is set for ElevenLabs
              if (!synthesizer.provider_config.model) {
                synthesizer.provider_config.model = "eleven_turbo_v2_5";
              }
              if (!synthesizer.provider_config.sampling_rate) {
                synthesizer.provider_config.sampling_rate = "16000";
              }
            } else {
              throw new Error("Voice ID is required for ElevenLabs. Please select a voice.");
            }
          } else if (synthesizer.provider_config) {
            // For other providers, ensure voice is set
            if (!synthesizer.provider_config.voice && agentData.voiceId) {
              synthesizer.provider_config.voice = agentData.voiceId;
            }
            if (!synthesizer.provider_config.language && agentData.language) {
              synthesizer.provider_config.language = agentData.language;
            }
          }
        }
      }

      console.log('[Bolna] Final config with voice validation:', JSON.stringify(config, null, 2));

      // Build request with agent_prompts at top level (required by API)
      const request: BolnaAgentRequestV2 = {
        agent_config: config.agent_config,
        agent_prompts: {
          task_1: {
            system_prompt: agentData.systemPrompt || "You are a helpful AI voice assistant."
          }
        }
      };

      return await this.request<BolnaAgent>("/v2/agent", {
        method: "POST",
        body: JSON.stringify(request),
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
      // ElevenLabs requires voice (name), voice_id (ID), and model per API docs
      // According to API: voice is the name, voice_id is the unique ID
      // If voiceName is not available, we need to use voiceId for both (some voices may not have separate names)
      const voiceName = agentData.voiceName || agentData.voiceId || "";
      if (!agentData.voiceId) {
        throw new Error("Voice ID is required for ElevenLabs. Please select a voice.");
      }
      if (!voiceName) {
        throw new Error("Voice name is required for ElevenLabs. Please ensure the voice has a name.");
      }
      synthesizerConfig = {
        provider: "elevenlabs",
        provider_config: {
          voice: voiceName, // Voice name (string)
          voice_id: agentData.voiceId, // Unique voice ID
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
    // Use agent's webhookUrl if provided, otherwise fall back to env variable
    let webhookUrl: string | null = null;
    if (agentData.webhookUrl) {
      webhookUrl = this.normalizeWebhookUrl(agentData.webhookUrl);
    } else if (process.env.PUBLIC_WEBHOOK_URL) {
      const baseUrl = this.normalizeWebhookUrl(process.env.PUBLIC_WEBHOOK_URL);
      webhookUrl = baseUrl ? `${baseUrl}/api/webhooks/bolna/call-status` : null;
    }
    
    console.log(`[Bolna] Setting webhook URL for agent ${agentData.name}:`, webhookUrl || 'none');

    // Construct API tools if call forwarding is enabled
    let apiTools = null;

    // Build LLM config - support knowledge base if knowledgeBaseIds provided
    let llmAgentConfig: any = {
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
    };

    // Add knowledge base support if knowledgeBaseIds provided
    if (agentData.knowledgeBaseIds && Array.isArray(agentData.knowledgeBaseIds) && agentData.knowledgeBaseIds.length > 0) {
      llmAgentConfig.agent_type = "knowledgebase_agent";
      llmAgentConfig.llm_config.vector_store = {
        provider: "lancedb",
        provider_config: {
          vector_ids: agentData.knowledgeBaseIds, // Array of knowledge base UUIDs
        },
      };
    }

    // Build ingest_source_config if provided (for inbound calls)
    let ingestSourceConfig: any = undefined;
    if (agentData.ingestSourceType) {
      ingestSourceConfig = {
        source_type: agentData.ingestSourceType,
      };
      if (agentData.ingestSourceType === "api") {
        ingestSourceConfig.source_url = agentData.ingestSourceUrl;
        ingestSourceConfig.source_auth_token = agentData.ingestSourceAuthToken;
      } else if (agentData.ingestSourceType === "csv") {
        ingestSourceConfig.source_name = agentData.ingestSourceName;
      } else if (agentData.ingestSourceType === "google_sheet") {
        ingestSourceConfig.source_url = agentData.ingestSourceUrl;
        ingestSourceConfig.source_name = agentData.ingestSourceName;
      }
    }

    const config: BolnaAgentConfigV2 = {
      agent_config: {
        agent_name: agentData.name,
        agent_welcome_message: agentData.firstMessage || "Hello! How can I help you today?",
        webhook_url: webhookUrl,
        agent_type: agentData.agentType || "other",
        tasks: [
          {
            task_type: "conversation",
            tools_config: {
              llm_agent: llmAgentConfig,
              synthesizer: synthesizerConfig,
              transcriber: {
                provider: (agentData as any).transcriberProvider || "deepgram",
                model: (agentData as any).transcriberModel || "nova-2",
                language: (agentData as any).transcriberLanguage || (agentData.language || "en").split('-')[0] || "en",
                stream: true,
                sampling_rate: (agentData as any).transcriberSamplingRate || 16000,
                encoding: "linear16",
                endpointing: (agentData as any).transcriberEndpointing || 100,
              },
              input: {
                provider: "plivo", // Always use Plivo (Exotel disabled)
                format: "wav",
              },
              output: {
                provider: "plivo", // Always use Plivo (Exotel disabled)
                format: "wav",
              },
              api_tools: apiTools,
            },
            toolchain: {
              execution: "parallel",
              pipelines: [["transcriber", "llm", "synthesizer"]],
            },
            task_config: {
              hangup_after_silence: agentData.hangupAfterSilence || 10,
              incremental_delay: agentData.incrementalDelay || 400,
              number_of_words_for_interruption: agentData.numberOfWordsForInterruption || 2,
              hangup_after_LLMCall: agentData.hangupAfterLLMCall || false,
              call_cancellation_prompt: agentData.callCancellationPrompt || null,
              backchanneling: agentData.backchanneling || false,
              backchanneling_message_gap: agentData.backchannelingMessageGap || 5,
              backchanneling_start_delay: agentData.backchannelingStartDelay || 5,
              ambient_noise: agentData.ambientNoise || false,
              ambient_noise_track: agentData.ambientNoiseTrack || "office-ambience",
              call_terminate: agentData.maxDuration || 90,
              voicemail: agentData.voicemail || false,
              inbound_limit: agentData.inboundLimit !== undefined ? agentData.inboundLimit : -1,
              whitelist_phone_numbers: null, // Per API: null or array of E.164 phone numbers
              disallow_unknown_numbers: agentData.disallowUnknownNumbers || false,
            },
          },
        ],
        ...(ingestSourceConfig && { ingest_source_config: ingestSourceConfig }),
      },
    };

    // Build request with agent_prompts at top level (required by API)
    let systemPrompt = agentData.systemPrompt || "You are a helpful AI voice assistant.";
    if (agentData.callForwardingEnabled && agentData.callForwardingNumber) {
      systemPrompt += `\n\nIf the user asks to speak to a human or if you cannot help them, use the transferCall tool to transfer the call to ${agentData.callForwardingNumber}.`;
    }

    const request: BolnaAgentRequestV2 = {
      agent_config: config.agent_config,
      agent_prompts: {
        task_1: {
          system_prompt: systemPrompt
        }
      }
    };

    console.log('[Bolna] Sending config to Bolna API:', JSON.stringify(request, null, 2));
    console.log('[Bolna] Request payload size:', JSON.stringify(request).length, 'bytes');

    try {
      const response = await this.request<{ agent_id: string; agent_name: string; agent_type: string; created_at: string; updated_at: string }>("/v2/agent", {
        method: "POST",
        body: JSON.stringify(request),
      });
      console.log('[Bolna] Agent created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[Bolna] Failed to create agent. Payload sent:', JSON.stringify(request, null, 2));
      console.error('[Bolna] Error details:', error.response?.data || error.message);
      throw error;
    }

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

    // Get existing agent config from Bolna to preserve settings if not updating
    let existingAgentConfig: any = null;
    try {
      const existing = await this.getAgent(agentId);
      existingAgentConfig = existing;
    } catch (e) {
      console.warn(`[Bolna] Could not fetch existing agent config: ${(e as Error).message}`);
    }

    // Determine if we need full update (PUT) or partial update (PATCH)
    // PUT is needed if updating: model, provider, temperature, maxTokens, maxDuration, language
    // or any task-related fields that require full tasks array
    const needsFullUpdate = !!(updates.model || updates.provider || updates.temperature !== undefined || 
      updates.maxTokens !== undefined || updates.maxDuration !== undefined || updates.language ||
      updates.callForwardingEnabled !== undefined || updates.callForwardingNumber);

    if (needsFullUpdate) {
      // Use PUT for full agent update (requires complete agent_config with tasks)
      return await this.updateAgentFull(agentId, updates, existingAgentConfig);
    } else {
      // Use PATCH for partial updates (only specific fields)
      return await this.updateAgentPartial(agentId, updates, existingAgentConfig);
    }
  }

  // Full agent update using PUT - requires complete agent_config with tasks
  private async updateAgentFull(
    agentId: string,
    updates: Partial<AiAgent>,
    existingAgentConfig: any
  ): Promise<BolnaAgent> {
    // Use agent's webhookUrl if provided in updates, otherwise use existing, otherwise fall back to env variable
    let webhookUrl: string | null = null;
    if (updates.webhookUrl !== undefined) {
      webhookUrl = this.normalizeWebhookUrl(updates.webhookUrl || null);
    } else if (existingAgentConfig?.agent_config?.webhook_url) {
      webhookUrl = this.normalizeWebhookUrl(existingAgentConfig.agent_config.webhook_url);
    } else if (process.env.PUBLIC_WEBHOOK_URL) {
      const baseUrl = this.normalizeWebhookUrl(process.env.PUBLIC_WEBHOOK_URL);
      webhookUrl = baseUrl ? `${baseUrl}/api/webhooks/bolna/call-status` : null;
    }
    
    console.log(`[Bolna] Updating webhook URL for agent ${agentId}:`, webhookUrl || 'none');

    // Get voiceId and voiceProvider from updates or existing config
    let voiceId = updates.voiceId || (updates as any).voiceId;
    let voiceProvider = (updates.voiceProvider && updates.voiceProvider !== 'all')
      ? updates.voiceProvider
      : (updates as any).voiceProvider;

    // If voiceId not in updates, try to get from existing agent config
    if (!voiceId && existingAgentConfig) {
      try {
        const tasks = existingAgentConfig.agent_config?.tasks || [];
        if (tasks.length > 0) {
          const synthesizer = tasks[0]?.tools_config?.synthesizer;
          if (synthesizer?.provider_config?.voice_id) {
            voiceId = synthesizer.provider_config.voice_id;
            voiceProvider = synthesizer.provider || voiceProvider || "elevenlabs";
          } else if (synthesizer?.provider_config?.voice) {
            voiceId = synthesizer.provider_config.voice;
            voiceProvider = synthesizer.provider || voiceProvider || "elevenlabs";
          }
        }
      } catch (e) {
        console.warn(`[Bolna] Could not extract voiceId from existing config: ${(e as Error).message}`);
      }
    }

    if (!voiceId) {
      throw new Error("Voice ID is required. Please ensure the agent has a voice selected.");
    }

    // Default voiceProvider if still not set
    if (!voiceProvider || voiceProvider === 'all') {
      voiceProvider = "elevenlabs";
    }

    // Build full agent config with tasks (required for PUT)
    const agentName = updates.name || existingAgentConfig?.agent_config?.agent_name || "AI Agent";
    const agentWelcomeMessage = updates.firstMessage || updates.systemPrompt || existingAgentConfig?.agent_config?.agent_welcome_message || "Hello! How can I help you today?";

    // Build synthesizer config
    let synthesizerConfig: any;
    if (voiceProvider === "elevenlabs") {
      // Get voice name from updates or existing config
      const voiceName = updates.voiceName || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.synthesizer?.provider_config?.voice || voiceId;
      synthesizerConfig = {
        provider: "elevenlabs",
        provider_config: {
          voice: voiceName, // Voice name (string)
          voice_id: voiceId, // Unique voice ID
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
          voice: voiceId,
          engine: "generative",
          sampling_rate: "8000",
          language: updates.language || "en-US",
        },
        stream: true,
        audio_format: "wav",
        buffer_size: 150,
      };
    } else {
      synthesizerConfig = {
        provider: voiceProvider,
        provider_config: {
          voice: voiceId,
          language: updates.language || "en-US",
        },
        stream: true,
        audio_format: "wav",
        buffer_size: 400,
      };
    }

    // Build system prompt
    let systemPrompt = updates.systemPrompt || existingAgentConfig?.agent_prompts?.task_1?.system_prompt || "You are a helpful AI voice assistant.";
    if (updates.callForwardingEnabled && updates.callForwardingNumber) {
      systemPrompt += `\n\nIf the user asks to speak to a human or if you cannot help them, use the transferCall tool to transfer the call to ${updates.callForwardingNumber}.`;
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

    // Build LLM agent config - support knowledge base if knowledgeBaseIds provided
    let llmAgentConfig: any = {
      agent_type: "simple_llm_agent",
      agent_flow_type: "streaming",
      llm_config: {
        agent_flow_type: "streaming",
        provider: updates.provider || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.provider || "openai",
        family: updates.provider || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.family || "openai",
        model: updates.model || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.model || "gpt-3.5-turbo",
        max_tokens: updates.maxTokens !== undefined ? updates.maxTokens : (existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.max_tokens || 150),
        temperature: updates.temperature !== undefined ? updates.temperature : (existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.temperature || 0.7),
        presence_penalty: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.presence_penalty ?? 0,
        frequency_penalty: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.frequency_penalty ?? 0,
        base_url: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.base_url || "https://api.openai.com/v1",
        top_p: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.top_p ?? 0.9,
        min_p: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.min_p ?? 0.1,
        top_k: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.top_k ?? 0,
        request_json: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.request_json ?? true,
        summarization_details: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.summarization_details ?? null,
        extraction_details: existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.extraction_details ?? null,
      },
    };

    // Add knowledge base support if knowledgeBaseIds provided
    const knowledgeBaseIds = updates.knowledgeBaseIds !== undefined 
      ? updates.knowledgeBaseIds 
      : (existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.llm_agent?.llm_config?.vector_store?.provider_config?.vector_ids);
    
    if (knowledgeBaseIds && Array.isArray(knowledgeBaseIds) && knowledgeBaseIds.length > 0) {
      llmAgentConfig.agent_type = "knowledgebase_agent";
      llmAgentConfig.llm_config.vector_store = {
        provider: "lancedb",
        provider_config: {
          vector_ids: knowledgeBaseIds, // Array of knowledge base UUIDs
        },
      };
    }

    // Build ingest_source_config if provided (for inbound calls)
    let ingestSourceConfig: any = undefined;
    if (updates.ingestSourceType !== undefined || existingAgentConfig?.agent_config?.ingest_source_config) {
      const sourceType = updates.ingestSourceType || existingAgentConfig?.agent_config?.ingest_source_config?.source_type;
      if (sourceType) {
        ingestSourceConfig = {
          source_type: sourceType,
        };
        if (sourceType === "api") {
          ingestSourceConfig.source_url = updates.ingestSourceUrl || existingAgentConfig?.agent_config?.ingest_source_config?.source_url;
          ingestSourceConfig.source_auth_token = updates.ingestSourceAuthToken || existingAgentConfig?.agent_config?.ingest_source_config?.source_auth_token;
        } else if (sourceType === "csv") {
          ingestSourceConfig.source_name = updates.ingestSourceName || existingAgentConfig?.agent_config?.ingest_source_config?.source_name;
        } else if (sourceType === "google_sheet") {
          ingestSourceConfig.source_url = updates.ingestSourceUrl || existingAgentConfig?.agent_config?.ingest_source_config?.source_url;
          ingestSourceConfig.source_name = updates.ingestSourceName || existingAgentConfig?.agent_config?.ingest_source_config?.source_name;
        }
      }
    }

    // Build full agent config (PUT requires complete structure)
    const fullConfig: BolnaAgentRequestV2 = {
      agent_config: {
        agent_name: agentName,
        agent_welcome_message: agentWelcomeMessage,
        webhook_url: webhookUrl,
        agent_type: updates.agentType || existingAgentConfig?.agent_config?.agent_type || "other",
        tasks: [
          {
            task_type: "conversation",
            tools_config: {
              llm_agent: llmAgentConfig,
              synthesizer: synthesizerConfig,
              transcriber: {
                provider: (updates as any).transcriberProvider || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.transcriber?.provider || "deepgram",
                model: (updates as any).transcriberModel || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.transcriber?.model || "nova-2",
                language: (updates as any).transcriberLanguage || (updates.language || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.transcriber?.language || "en").split('-')[0] || "en",
                stream: true,
                sampling_rate: (updates as any).transcriberSamplingRate || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.transcriber?.sampling_rate || 16000,
                encoding: "linear16",
                endpointing: (updates as any).transcriberEndpointing || existingAgentConfig?.agent_config?.tasks?.[0]?.tools_config?.transcriber?.endpointing || 100,
              },
              input: {
                provider: "plivo", // Always use Plivo (Exotel disabled)
                format: "wav",
              },
              output: {
                provider: "plivo", // Always use Plivo (Exotel disabled)
                format: "wav",
              },
              api_tools: apiTools,
            },
            toolchain: {
              execution: "parallel",
              pipelines: [["transcriber", "llm", "synthesizer"]],
            },
            task_config: {
              hangup_after_silence: updates.hangupAfterSilence !== undefined ? updates.hangupAfterSilence : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.hangup_after_silence || 10),
              incremental_delay: updates.incrementalDelay !== undefined ? updates.incrementalDelay : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.incremental_delay || 400),
              number_of_words_for_interruption: updates.numberOfWordsForInterruption !== undefined ? updates.numberOfWordsForInterruption : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.number_of_words_for_interruption || 2),
              hangup_after_LLMCall: updates.hangupAfterLLMCall !== undefined ? updates.hangupAfterLLMCall : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.hangup_after_LLMCall || false),
              call_cancellation_prompt: updates.callCancellationPrompt !== undefined ? updates.callCancellationPrompt : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.call_cancellation_prompt || null),
              backchanneling: updates.backchanneling !== undefined ? updates.backchanneling : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.backchanneling || false),
              backchanneling_message_gap: updates.backchannelingMessageGap !== undefined ? updates.backchannelingMessageGap : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.backchanneling_message_gap || 5),
              backchanneling_start_delay: updates.backchannelingStartDelay !== undefined ? updates.backchannelingStartDelay : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.backchanneling_start_delay || 5),
              ambient_noise: updates.ambientNoise !== undefined ? updates.ambientNoise : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.ambient_noise || false),
              ambient_noise_track: updates.ambientNoiseTrack || existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.ambient_noise_track || "office-ambience",
              call_terminate: updates.maxDuration !== undefined ? updates.maxDuration : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.call_terminate || 90),
              voicemail: updates.voicemail !== undefined ? updates.voicemail : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.voicemail || false),
              inbound_limit: updates.inboundLimit !== undefined ? updates.inboundLimit : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.inbound_limit !== undefined ? existingAgentConfig.agent_config.tasks[0].task_config.inbound_limit : -1),
              whitelist_phone_numbers: null, // Per API: null or array of E.164 phone numbers
              disallow_unknown_numbers: updates.disallowUnknownNumbers !== undefined ? updates.disallowUnknownNumbers : (existingAgentConfig?.agent_config?.tasks?.[0]?.task_config?.disallow_unknown_numbers || false),
            },
          },
        ],
        ...(ingestSourceConfig && { ingest_source_config: ingestSourceConfig }),
      },
      agent_prompts: {
        task_1: {
          system_prompt: systemPrompt,
        },
      },
    };

    console.log('[Bolna] PUT request payload (full update):', JSON.stringify(fullConfig, null, 2));
    console.log('[Bolna] Update payload size:', JSON.stringify(fullConfig).length, 'bytes');

    try {
      const response = await this.request<BolnaAgent>(`/v2/agent/${agentId}`, {
        method: "PUT",
        body: JSON.stringify(fullConfig),
      });
      console.log('[Bolna] Agent updated successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[Bolna] Failed to update agent. Payload sent:', JSON.stringify(fullConfig, null, 2));
      console.error('[Bolna] Error details:', error.response?.data || error.message);
      throw error;
    }
  }

  // Partial agent update using PATCH - only specific fields
  private async updateAgentPartial(
    agentId: string,
    updates: Partial<AiAgent>,
    existingAgentConfig: any
  ): Promise<BolnaAgent> {
    // Use agent's webhookUrl if provided in updates, otherwise use existing, otherwise fall back to env variable
    let webhookUrl: string | null = null;
    if (updates.webhookUrl !== undefined) {
      webhookUrl = this.normalizeWebhookUrl(updates.webhookUrl || null);
    } else if (existingAgentConfig?.agent_config?.webhook_url) {
      webhookUrl = this.normalizeWebhookUrl(existingAgentConfig.agent_config.webhook_url);
    } else if (process.env.PUBLIC_WEBHOOK_URL) {
      const baseUrl = this.normalizeWebhookUrl(process.env.PUBLIC_WEBHOOK_URL);
      webhookUrl = baseUrl ? `${baseUrl}/api/webhooks/bolna/call-status` : null;
    }

    const config: Partial<BolnaAgentConfigV2> = {
      agent_config: {} as any,
    };

    if (updates.name) {
      config.agent_config!.agent_name = updates.name;
    }
    if (updates.firstMessage || updates.systemPrompt) {
      config.agent_config!.agent_welcome_message = updates.firstMessage || updates.systemPrompt || undefined;
    }

    // Always update webhook_url to ensure it's set
    config.agent_config!.webhook_url = webhookUrl;
    console.log(`[Bolna] Partial update webhook URL for agent ${agentId}:`, webhookUrl || 'none');
    if (updates.agentType) {
      config.agent_config!.agent_type = updates.agentType;
    }

    // Only update synthesizer if voiceId or voiceProvider is explicitly provided in updates
    const shouldUpdateSynthesizer = updates.voiceId !== undefined || updates.voiceProvider !== undefined;
    
    if (shouldUpdateSynthesizer) {
      // Get voiceId from updates - if not provided, try to extract from existing config
      let voiceId = updates.voiceId || (updates as any).voiceId;
      let voiceProvider = (updates.voiceProvider && updates.voiceProvider !== 'all')
        ? updates.voiceProvider
        : (updates as any).voiceProvider;

      // If voiceId not in updates, try to get from existing agent config
      if (!voiceId && existingAgentConfig) {
        try {
          const tasks = existingAgentConfig.agent_config?.tasks || [];
          if (tasks.length > 0) {
            const synthesizer = tasks[0]?.tools_config?.synthesizer;
            if (synthesizer?.provider_config?.voice_id) {
              voiceId = synthesizer.provider_config.voice_id;
              voiceProvider = synthesizer.provider || voiceProvider || "elevenlabs";
            } else if (synthesizer?.provider_config?.voice) {
              voiceId = synthesizer.provider_config.voice;
              voiceProvider = synthesizer.provider || voiceProvider || "elevenlabs";
            }
          }
        } catch (e) {
          console.warn(`[Bolna] Could not extract voiceId from existing config: ${(e as Error).message}`);
        }
      }

      // Default voiceProvider if still not set
      if (!voiceProvider || voiceProvider === 'all') {
        voiceProvider = "elevenlabs";
      }

      // PATCH supports updating synthesizer directly
      if (voiceId || voiceProvider) {
        if (!voiceId) {
          throw new Error("Voice ID is required when updating synthesizer. Please ensure the agent has a voice selected.");
        }

      let synthesizerConfig: any = null;
      if (voiceProvider === "elevenlabs") {
        synthesizerConfig = {
          provider: "elevenlabs",
          provider_config: {
            voice: voiceId,
            voice_id: voiceId,
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
            voice: voiceId,
            engine: "generative",
            sampling_rate: "8000",
            language: updates.language || "en-US",
          },
          stream: true,
          audio_format: "wav",
          buffer_size: 150,
        };
      } else {
        synthesizerConfig = {
          provider: voiceProvider,
          provider_config: {
            voice: voiceId,
            language: updates.language || "en-US",
          },
          stream: true,
          audio_format: "wav",
          buffer_size: 400,
        };
      }

        config.agent_config!.synthesizer = synthesizerConfig;
      }
    }

    // Build PATCH request - agent_prompts must be at top level per API spec
    const patchRequest: any = {
      agent_config: config.agent_config
    };

    // Include agent_prompts if systemPrompt is being updated
    if (updates.systemPrompt || (updates.callForwardingEnabled && updates.callForwardingNumber) || patchRequest.agent_config.synthesizer) {
      let systemPrompt = updates.systemPrompt;
      
      if (!systemPrompt && existingAgentConfig?.agent_prompts?.task_1?.system_prompt) {
        systemPrompt = existingAgentConfig.agent_prompts.task_1.system_prompt;
      }
      
      if (!systemPrompt) {
        systemPrompt = "You are a helpful AI voice assistant.";
      }

      if (updates.callForwardingEnabled && updates.callForwardingNumber) {
        systemPrompt += `\n\nIf the user asks to speak to a human or if you cannot help them, use the transferCall tool to transfer the call to ${updates.callForwardingNumber}.`;
      }

      patchRequest.agent_prompts = {
        task_1: {
          system_prompt: systemPrompt,
        },
      };
    }

    console.log('[Bolna] PATCH request payload (partial update):', JSON.stringify(patchRequest, null, 2));

    return await this.request<BolnaAgent>(`/v2/agent/${agentId}`, {
      method: "PATCH",
      body: JSON.stringify(patchRequest),
    });
  }

  /**
   * Delete an agent from Bolna
   * WARNING: This deletes ALL agent data including all batches, all executions, etc.
   * 
   * @param agentId - The Bolna agent ID (UUID)
   * @returns Promise that resolves when agent is deleted
   * @throws Error if deletion fails
   * 
   * API Reference: DELETE /v2/agent/{agent_id}
   * Response: { message: "success", state: "deleted" }
   */
  async deleteAgent(agentId: string): Promise<{ message: string; state: string }> {
    this.ensureConfigured();
    const response = await this.request<{ message: string; state: string }>(`/v2/agent/${agentId}`, {
      method: "DELETE",
    });
    return response;
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
    this.ensureConfigured();

    try {
      // Try to fetch models from Bolna API
      // Try multiple possible endpoints
      const endpoints = [
        "/me/models",
        "/models",
        "/user/models",
        "/v2/models",
        "/v1/models",
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`[Bolna] Trying models endpoint: ${endpoint}`);
          const response = await this.request<any>(endpoint);

          // Handle different response formats
          if (Array.isArray(response)) {
            console.log(`[Bolna] ✓ Found ${response.length} models from ${endpoint}`);
            return response.map((m: any) => ({
              model: m.model || m.name || m.id,
              provider: m.provider || m.family,
              family: m.family || m.provider,
              description: m.description || `${m.provider || 'Unknown'} model`,
            }));
          }

          if (response && typeof response === 'object') {
            // Check for 'data' field
            if ('data' in response && Array.isArray((response as any).data)) {
              console.log(`[Bolna] ✓ Found ${(response as any).data.length} models from ${endpoint}`);
              return (response as any).data.map((m: any) => ({
                model: m.model || m.name || m.id,
                provider: m.provider || m.family,
                family: m.family || m.provider,
                description: m.description || `${m.provider || 'Unknown'} model`,
              }));
            }

            // Check for 'models' field
            if ('models' in response && Array.isArray((response as any).models)) {
              console.log(`[Bolna] ✓ Found ${(response as any).models.length} models from ${endpoint}`);
              return (response as any).models.map((m: any) => ({
                model: m.model || m.name || m.id,
                provider: m.provider || m.family,
                family: m.family || m.provider,
                description: m.description || `${m.provider || 'Unknown'} model`,
              }));
            }
          }
        } catch (error: any) {
          console.log(`[Bolna] ✗ Failed with ${endpoint}: ${error.message}`);
          continue; // Try next endpoint
        }
      }

      // If all endpoints fail, return curated list as fallback
      console.warn("[Bolna] Could not fetch models from API, using fallback list");
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
    } catch (error) {
      console.error("Error fetching Bolna models:", error);
      // Return fallback list on error
      return [
        { model: "gpt-4o", provider: "openai", family: "openai", description: "Most advanced GPT-4 model" },
        { model: "gpt-4o-mini", provider: "openai", family: "openai", description: "Faster, more affordable GPT-4" },
        { model: "gpt-4-turbo", provider: "openai", family: "openai", description: "GPT-4 Turbo with Vision" },
        { model: "gpt-4", provider: "openai", family: "openai", description: "GPT-4 base model" },
        { model: "gpt-3.5-turbo", provider: "openai", family: "openai", description: "Fast and efficient" },
        { model: "claude-3-5-sonnet-20241022", provider: "anthropic", family: "anthropic", description: "Most capable Claude model" },
        { model: "claude-3-opus-20240229", provider: "anthropic", family: "anthropic", description: "Claude Opus" },
        { model: "claude-3-sonnet-20240229", provider: "anthropic", family: "anthropic", description: "Claude Sonnet" },
        { model: "claude-3-haiku-20240307", provider: "anthropic", family: "anthropic", description: "Fast Claude model" },
        { model: "gemini-1.5-pro", provider: "google", family: "google", description: "Advanced Gemini Pro" },
        { model: "gemini-1.5-flash", provider: "google", family: "google", description: "Fast Gemini model" },
        { model: "gemini-pro", provider: "google", family: "google", description: "Gemini Pro" },
      ];
    }
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

  /**
   * Create a knowledgebase from a URL
   * The URL will be scraped and ingested as a knowledgebase
   */
  async createKnowledgeBaseFromUrl(url: string, options?: {
    chunk_size?: number;
    similarity_top_k?: number;
    overlapping?: number;
  }): Promise<BolnaKnowledgeBase> {
    this.ensureConfigured();

    // Use form-data package for Node.js FormData support
    const FormData = (await import('form-data')).default;
    const formData = new FormData();

    // Add URL parameter
    formData.append('url', url);

    if (options?.chunk_size) formData.append('chunk_size', options.chunk_size.toString());
    if (options?.similarity_top_k) formData.append('similarity_top_k', options.similarity_top_k.toString());
    if (options?.overlapping) formData.append('overlapping', options.overlapping.toString());

    const apiUrl = `${this.baseUrl}/knowledgebase`;
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      ...formData.getHeaders(),
    };

    console.log(`[Bolna] Creating knowledgebase from URL: ${url}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: formData as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bolna API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log(`[Bolna] Knowledgebase created from URL:`, result);
    return result;
  }

  /**
   * Create a knowledgebase from agent data
   * Accumulates all agent information into a PDF document and uploads it
   */
  async createAgentKnowledgeBase(agentData: {
    name: string;
    description?: string;
    systemPrompt?: string;
    firstMessage?: string;
    userPrompt?: string;
    customData?: Record<string, any>;
    additionalInfo?: string;
  }): Promise<BolnaKnowledgeBase> {
    this.ensureConfigured();

    // Generate a text document from agent data
    const documentContent = this.generateAgentDocument(agentData);
    
    // Convert to Buffer (plain text file)
    const buffer = Buffer.from(documentContent, 'utf-8');
    
    // For Bolna, we need to send as PDF. Since we have text, let's convert using a simple approach
    // Use PDFKit to generate a proper PDF
    const PDFDocument = (await import('pdfkit')).default;
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const result = await this.createKnowledgeBase(pdfBuffer, {
            fileName: `${agentData.name.replace(/[^a-zA-Z0-9]/g, '_')}_knowledge.pdf`,
            chunk_size: 512,
            similarity_top_k: 15,
            overlapping: 128,
          });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      doc.on('error', reject);
      
      // Write content to PDF
      doc.fontSize(18).text(`Agent Knowledge Base: ${agentData.name}`, { align: 'center' });
      doc.moveDown(2);
      
      if (agentData.description) {
        doc.fontSize(14).text('Description:', { underline: true });
        doc.fontSize(12).text(agentData.description);
        doc.moveDown();
      }
      
      if (agentData.systemPrompt) {
        doc.fontSize(14).text('System Instructions:', { underline: true });
        doc.fontSize(10).text(agentData.systemPrompt);
        doc.moveDown();
      }
      
      if (agentData.firstMessage) {
        doc.fontSize(14).text('Welcome Message:', { underline: true });
        doc.fontSize(12).text(agentData.firstMessage);
        doc.moveDown();
      }
      
      if (agentData.userPrompt) {
        doc.fontSize(14).text('User Prompt Template:', { underline: true });
        doc.fontSize(10).text(agentData.userPrompt);
        doc.moveDown();
      }
      
      if (agentData.additionalInfo) {
        doc.fontSize(14).text('Additional Information:', { underline: true });
        doc.fontSize(10).text(agentData.additionalInfo);
        doc.moveDown();
      }
      
      if (agentData.customData && Object.keys(agentData.customData).length > 0) {
        doc.fontSize(14).text('Custom Data:', { underline: true });
        doc.fontSize(10).text(JSON.stringify(agentData.customData, null, 2));
        doc.moveDown();
      }
      
      doc.end();
    });
  }

  /**
   * Generate a text document from agent data
   */
  private generateAgentDocument(agentData: {
    name: string;
    description?: string;
    systemPrompt?: string;
    firstMessage?: string;
    userPrompt?: string;
    customData?: Record<string, any>;
    additionalInfo?: string;
  }): string {
    const lines: string[] = [];
    
    lines.push(`# Agent Knowledge Base: ${agentData.name}`);
    lines.push('');
    
    if (agentData.description) {
      lines.push('## Description');
      lines.push(agentData.description);
      lines.push('');
    }
    
    if (agentData.systemPrompt) {
      lines.push('## System Instructions');
      lines.push(agentData.systemPrompt);
      lines.push('');
    }
    
    if (agentData.firstMessage) {
      lines.push('## Welcome Message');
      lines.push(agentData.firstMessage);
      lines.push('');
    }
    
    if (agentData.userPrompt) {
      lines.push('## User Prompt Template');
      lines.push(agentData.userPrompt);
      lines.push('');
    }
    
    if (agentData.additionalInfo) {
      lines.push('## Additional Information');
      lines.push(agentData.additionalInfo);
      lines.push('');
    }
    
    if (agentData.customData && Object.keys(agentData.customData).length > 0) {
      lines.push('## Custom Data');
      lines.push(JSON.stringify(agentData.customData, null, 2));
      lines.push('');
    }
    
    return lines.join('\n');
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

  // Helper: Get Bolna phone number ID by phone number string
  async getPhoneNumberIdByPhoneNumber(phoneNumber: string): Promise<string | null> {
    this.ensureConfigured();
    try {
      const registeredNumbers = await this.listRegisteredPhoneNumbers();
      const found = registeredNumbers.find(n => n.phone_number === phoneNumber);
      return found?.id || null;
    } catch (error) {
      console.error(`Failed to find phone number ID for ${phoneNumber}:`, error);
      return null;
    }
  }

  // Inbound Setup
  // According to Bolna API: expects phone_number_id (UUID) not phone_number (string)
  // If phoneNumberOrId looks like a UUID, use it directly; otherwise, look it up
  async setupInboundCall(agentId: string, phoneNumberOrId: string): Promise<any> {
    this.ensureConfigured();
    
    // Check if it's already a UUID (phone_number_id format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let phoneNumberId: string;
    
    if (uuidRegex.test(phoneNumberOrId)) {
      // It's already a UUID, use it directly
      phoneNumberId = phoneNumberOrId;
    } else {
      // It's a phone number string, look up the ID
      const foundId = await this.getPhoneNumberIdByPhoneNumber(phoneNumberOrId);
      if (!foundId) {
        throw new Error(`Phone number ${phoneNumberOrId} not found in Bolna registered numbers. Please register it first.`);
      }
      phoneNumberId = foundId;
    }
    
    return await this.request("/inbound/setup", {
      method: "POST",
      body: JSON.stringify({
        agent_id: agentId,
        phone_number_id: phoneNumberId,
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
