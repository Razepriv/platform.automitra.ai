import OpenAI from "openai";

export interface PipelineAssignment {
  action: "create" | "update" | "delete";
  leadId?: string;
  pipelineStage: string;
  reason: string;
  leadData?: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    notes?: string;
  };
}

export async function analyzeTranscriptForLeadAssignment(
  transcript: string,
  openaiApiKey: string,
  existingPipelines: Array<{ name: string; stage: string; description?: string }>
): Promise<PipelineAssignment[]> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const pipelineStages = existingPipelines.map(p => p.stage).join(", ");
  
  const systemPrompt = `You are an AI assistant that analyzes phone call transcripts to assign leads to appropriate pipeline stages.

Available pipeline stages: ${pipelineStages || "new, contacted, qualified, proposal, closed-won, closed-lost"}

Based on the transcript, determine:
1. If a new lead should be created (extract name, contact info, company)
2. Which pipeline stage the lead belongs to based on conversation outcome
3. If an existing lead should be updated or deleted

Return a JSON array of actions. Each action should have:
- action: "create", "update", or "delete"
- pipelineStage: the stage name
- reason: brief explanation
- leadData (for create/update): { name, email?, phone?, company?, notes? }
- leadId (for update/delete): if known from context`;

  const userPrompt = `Analyze this call transcript and provide pipeline assignment recommendations:

${transcript}

Return only valid JSON array of assignments.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const responseContent = completion.choices[0].message.content || "{}";
    let response: any;
    try {
      response = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse AI response");
    }
    
    // Handle both array and object with assignments key
    let assignments: PipelineAssignment[] = [];
    if (response.assignments && Array.isArray(response.assignments)) {
      assignments = response.assignments;
    } else if (Array.isArray(response)) {
      assignments = response;
    } else if (response.action) {
      // Single assignment object
      assignments = [response];
    }

    return assignments.filter(a => 
      a && 
      a.action && 
      (a.action === "create" || a.action === "update" || a.action === "delete") &&
      a.pipelineStage
    );
  } catch (error: any) {
    console.error("Error analyzing transcript with OpenAI:", error);
    throw new Error(`Failed to analyze transcript: ${error.message}`);
  }
}

