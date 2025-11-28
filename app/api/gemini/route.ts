// API route for Google Gemini Flash 2.5 integration

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { command, context } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    // Try gemini-2.0-flash-exp first, fallback to gemini-1.5-flash
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const prompt = `You are a realistic Ubuntu Linux terminal. A user has executed a command and you need to provide a realistic terminal response.

Context:
- Current directory: ${context.currentDir || '/home/user'}
- User level: ${context.userLevel || 'beginner'}
- Previous commands: ${context.recentCommands?.slice(-5).join(', ') || 'none'}

Command executed: ${command}

Instructions:
${context.userLevel === 'advanced' 
  ? 'Provide a realistic, technical terminal response. Use proper Linux terminology. Include realistic error messages if the command would fail. Be concise and technical.' 
  : context.userLevel === 'intermediate'
  ? 'Provide a standard terminal response. Use normal Linux output format. Be helpful but not overly explanatory.'
  : 'Provide a simple, helpful terminal response. Explain basic concepts if needed. Be friendly and educational.'}

Important:
- If the command is invalid or would fail, provide a realistic error message
- Format output exactly as a real Ubuntu terminal would
- Do not include markdown formatting
- Do not explain that you are an AI
- Keep responses concise and realistic
- If the command succeeds silently, return empty string or minimal output

Generate only the terminal output, nothing else:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return NextResponse.json({ output: text });
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response', details: error.message },
      { status: 500 }
    );
  }
}

