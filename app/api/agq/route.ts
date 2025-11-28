// API route for AGQ-ASSISTANT
// Handles conversation with the quantum assistant

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { 
  AGQ_SYSTEM_PROMPT, 
  AGQ_RESPONSE_PROMPT,
  generateFallbackResponse,
  generateWelcomeSequence,
  generateExitSequence,
  generateHelpSequence,
} from '@/lib/agq-assistant/prompts';
import { AGQSequence, AGQResponse } from '@/lib/agq-assistant/tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      message, 
      action,  // 'welcome', 'exit', 'help', 'message'
      context 
    } = body;
    
    const {
      failedCommands = [],
      sessionHistory = '',
      conversationHistory = [],
      initiationLevel = 0
    } = context || {};

    // Handle special actions that don't need LLM
    if (action === 'welcome') {
      const sequence = generateWelcomeSequence(initiationLevel);
      return NextResponse.json({ 
        sequence,
        stateUpdate: { initiationLevel: Math.min(initiationLevel + 5, 100) }
      });
    }
    
    if (action === 'exit') {
      const sequence = generateExitSequence();
      return NextResponse.json({ sequence });
    }
    
    if (action === 'help' || message?.toLowerCase() === 'help') {
      const sequence = generateHelpSequence();
      return NextResponse.json({ sequence });
    }

    // For actual messages, use LLM
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        sequence: generateFallbackResponse('API key not configured')
      });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_AGQ_MODEL || 'gemini-2.0-flash-exp';
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Build the prompt
    const prompt = AGQ_RESPONSE_PROMPT
      .replace('{message}', message || '')
      .replace('{initiationLevel}', String(initiationLevel))
      .replace('{failedCommands}', failedCommands.slice(-5).join(', ') || 'none')
      .replace('{sessionHistory}', sessionHistory.slice(-500) || 'No recent activity')
      .replace('{conversationHistory}', 
        conversationHistory.slice(-5).map((m: any) => 
          `${m.role}: ${m.content}`
        ).join('\n') || 'New conversation'
      );
    
    const fullPrompt = `${AGQ_SYSTEM_PROMPT}\n\n${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();
    
    // Parse the JSON response
    try {
      // Clean up the response - remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsed = JSON.parse(text) as AGQResponse;
      
      // Validate the sequence has required fields
      if (!parsed.sequence || !parsed.sequence.steps || !Array.isArray(parsed.sequence.steps)) {
        throw new Error('Invalid sequence structure');
      }
      
      // Add default id if missing
      if (!parsed.sequence.id) {
        parsed.sequence.id = `agq-${Date.now()}`;
      }
      
      // Default to interruptible
      if (parsed.sequence.interruptible === undefined) {
        parsed.sequence.interruptible = true;
      }
      
      // Calculate initiation level increase based on conversation
      let newInitiationLevel = initiationLevel;
      
      // Keywords that increase initiation
      const advancedKeywords = ['temporal', 'quantum', 'anomaly', 'hex', 'gateway', 'bridge', '16'];
      const messageLower = (message || '').toLowerCase();
      
      for (const keyword of advancedKeywords) {
        if (messageLower.includes(keyword)) {
          newInitiationLevel = Math.min(newInitiationLevel + 3, 100);
        }
      }
      
      // Natural increase from conversation
      newInitiationLevel = Math.min(newInitiationLevel + 1, 100);
      
      return NextResponse.json({
        sequence: parsed.sequence,
        stateUpdate: {
          initiationLevel: parsed.stateUpdate?.initiationLevel || newInitiationLevel,
          unlockedTopics: parsed.stateUpdate?.unlockedTopics || []
        }
      });
      
    } catch (parseError) {
      console.error('Failed to parse AGQ response:', parseError);
      console.error('Raw response:', text);
      
      // Create a simple text response from the LLM output
      const fallbackSequence: AGQSequence = {
        id: `agq-fallback-${Date.now()}`,
        interruptible: true,
        steps: [
          { 
            tool: 'text', 
            content: text.substring(0, 500), 
            animation: 'typewriter',
            style: 'normal',
            speed: 20
          }
        ]
      };
      
      return NextResponse.json({ 
        sequence: fallbackSequence,
        stateUpdate: { initiationLevel: Math.min(initiationLevel + 1, 100) }
      });
    }
    
  } catch (error: any) {
    console.error('AGQ API error:', error);
    
    return NextResponse.json({ 
      sequence: generateFallbackResponse(error.message || 'Unknown error'),
      error: 'Processing failed'
    });
  }
}

/**
 * GET endpoint for checking AGQ status
 */
export async function GET() {
  return NextResponse.json({
    name: 'AGQ-ASSISTANT',
    version: 'q-16.7.9v',
    status: 'online',
    capabilities: [
      'terminal-help',
      'command-assistance', 
      'system-information',
      'quantum-bridge-access'
    ]
  });
}

