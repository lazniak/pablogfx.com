// API route for AGQ Quantum Scanner
// Generates images with LoSciFi archival style and custom metadata

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import * as piexif from 'piexifjs';

/**
 * LoSciFi Archive style prompt template
 */
function buildScanPrompt(target: string, classification: string = 'CLASSIFIED', timestamp?: string): string {
  const year = timestamp ? new Date(timestamp).getFullYear() : '1978';
  
  return `Archival photograph from classified quantum research facility, ${year}.
Lo-fi sci-fi aesthetic, grain texture, limited color palette (cyan/amber/grayscale).
Scanner overlay with hex codes and timestamps.
Marked: ${classification} - ${target}
Atmospheric, mysterious, slightly distorted from dimensional transfer.
Black and white or sepia tone, vintage film grain, archival document aesthetic.
Technical scanner interface elements visible, quantum interference patterns.
Classified government archive style, cold war era scientific photography.`;
}

/**
 * Generate custom timestamp for metadata
 */
function generateArtifactTimestamp(timestamp?: string): { date: string; year: number } {
  if (timestamp) {
    const date = new Date(timestamp);
    return {
      date: date.toISOString().split('T')[0],
      year: date.getFullYear(),
    };
  }
  
  // Random vintage dates for artifacts
  const years = [1978, 1983, 1972, 1987, 1969, 2049, 1847, 1991];
  const year = years[Math.floor(Math.random() * years.length)];
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  
  return {
    date: `${year}-${month}-${day}`,
    year,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, classification = 'CLASSIFIED', timestamp, dimension } = body;
    
    if (!target) {
      return NextResponse.json({ error: 'Target description required' }, { status: 400 });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-pro-image-preview',
    });
    
    // Build prompt with LoSciFi style
    const prompt = buildScanPrompt(target, classification, timestamp);
    const artifactDate = generateArtifactTimestamp(timestamp);
    
    // Generate image - gemini-3-pro-image-preview uses different API
    // Try simple text prompt first, then check if config is needed
    const result = await model.generateContent(prompt);
    
    // Extract image from response
    const response = await result.response;
    const imageParts = response.candidates?.[0]?.content?.parts?.filter(
      (part: any) => part.inlineData?.mimeType?.startsWith('image/')
    );
    
    if (!imageParts || imageParts.length === 0 || !imageParts[0]?.inlineData) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }
    
    let imageData = imageParts[0].inlineData.data;
    const mimeType = imageParts[0].inlineData.mimeType || 'image/png';
    
    // Modify EXIF metadata with custom date
    try {
      // Decode base64
      const binaryString = Buffer.from(imageData, 'base64').toString('binary');
      
      // Load EXIF
      let exifObj: any = {};
      try {
        exifObj = piexif.load(binaryString);
      } catch {
        // No EXIF, create new
        exifObj['0th'] = {};
        exifObj['Exif'] = {};
        exifObj['GPS'] = {};
        exifObj['Interop'] = {};
        exifObj['1st'] = {};
      }
      
      // Set custom date
      const [year, month, day] = artifactDate.date.split('-');
      const dateTime = `${year}:${month}:${day} 12:00:00`;
      const dateTimeOriginal = dateTime;
      const dateTimeDigitized = dateTime;
      
      // EXIF date format: "YYYY:MM:DD HH:MM:SS"
      exifObj['0th'][piexif.ImageIFD.DateTime] = dateTime;
      exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = dateTimeOriginal;
      exifObj['Exif'][piexif.ExifIFD.DateTimeDigitized] = dateTimeDigitized;
      
      // Add custom metadata
      exifObj['0th'][piexif.ImageIFD.Artist] = 'AGQ-TEMPORAL-ARCHIVE';
      exifObj['0th'][piexif.ImageIFD.Copyright] = `${classification} - ${artifactDate.year}`;
      
      // Add user comment with hex code
      const hexCode = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
      exifObj['Exif'][piexif.ExifIFD.UserComment] = `QUANTUM_SCAN:${hexCode}:${dimension || 'unknown'}`;
      
      // Insert EXIF back into image
      const exifStr = piexif.dump(exifObj);
      const newImageData = piexif.insert(exifStr, binaryString);
      
      // Re-encode to base64
      imageData = Buffer.from(newImageData, 'binary').toString('base64');
    } catch (exifError) {
      // If EXIF modification fails, continue with original image
      console.warn('EXIF modification failed:', exifError);
    }
    
    const hexCode = `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`;
    
    return NextResponse.json({
      image: imageData,
      mimeType,
      metadata: {
        dateCreated: artifactDate.date,
        year: artifactDate.year,
        classification,
        dimension: dimension || 'unknown',
        source: 'AGQ-TEMPORAL-ARCHIVE',
        hexCode,
      },
    });
    
  } catch (error: any) {
    console.error('AGQ Scan API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate scan' },
      { status: 500 }
    );
  }
}

