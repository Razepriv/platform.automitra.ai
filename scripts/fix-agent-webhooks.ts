import "dotenv/config";
import { db } from "../server/db";
import { aiAgents } from "../shared/schema";
import { bolnaClient } from "../server/bolna";

async function fixAgentWebhooks() {
  console.log("\n🔧 FIXING AGENT WEBHOOK URLS\n");
  console.log("=" .repeat(60));
  
  const webhookUrl = process.env.PUBLIC_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("❌ PUBLIC_WEBHOOK_URL not set in environment");
    return;
  }
  
  // Normalize the webhook URL (add https:// if missing)
  const normalizedUrl = webhookUrl.startsWith('http') 
    ? webhookUrl 
    : `https://${webhookUrl}`;
  
  const expectedWebhookUrl = `${normalizedUrl}/api/webhooks/bolna/call-status`;
  
  console.log(`📍 Expected webhook URL: ${expectedWebhookUrl}\n`);
  
  try {
    // Get all agents from database
    const agents = await db.select().from(aiAgents);
    
    if (agents.length === 0) {
      console.log("❌ No agents found in database");
      return;
    }
    
    console.log(`✅ Found ${agents.length} agents\n`);
    
    for (const agent of agents) {
      if (!agent.bolnaAgentId) {
        console.log(`⏭️  Skipping ${agent.name} - no Bolna agent ID`);
        continue;
      }
      
      console.log(`\n🔍 Checking agent: ${agent.name}`);
      console.log(`   Bolna ID: ${agent.bolnaAgentId}`);
      
      try {
        // Get current agent config from Bolna
        const bolnaAgent = await bolnaClient.getAgent(agent.bolnaAgentId);
        const currentWebhook = bolnaAgent.agent_config?.webhook_url;
        
        console.log(`   Current webhook: ${currentWebhook || "❌ Not set"}`);
        
        if (currentWebhook === expectedWebhookUrl) {
          console.log(`   ✅ Webhook URL is correct`);
          continue;
        }
        
        // Update the webhook URL
        console.log(`   🔄 Updating webhook URL...`);
        
        // Update the agent config
        const updatedConfig = {
          ...bolnaAgent,
          agent_config: {
            ...bolnaAgent.agent_config,
            webhook_url: expectedWebhookUrl
          }
        };
        
        await bolnaClient.updateAgentRaw(agent.bolnaAgentId, updatedConfig);
        
        console.log(`   ✅ Webhook URL updated successfully`);
        
      } catch (error: any) {
        console.error(`   ❌ Error updating agent: ${error.message}`);
      }
    }
    
    console.log("\n\n" + "=".repeat(60));
    console.log("✅ Agent webhook fix complete\n");
    
  } catch (error: any) {
    console.error("❌ Fatal error:", error.message);
  }
}

fixAgentWebhooks()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
