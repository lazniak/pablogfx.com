// API route for AGQ Quantum Scanner
// Generates images with LoSciFi archival style and custom metadata

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import * as piexif from 'piexifjs';

/**
 * Diverse archival style prompt template
 */
function buildScanPrompt(target: string, classification: string = 'CLASSIFIED', timestamp?: string): string {
  const year = timestamp ? new Date(timestamp).getFullYear() : '1978';
  
  // Random style selection for variety
  const styles = [
    // Vintage scientific photography
    `Vintage scientific photograph from classified research facility, ${year}. Black and white, high contrast, film grain, archival document aesthetic. Technical equipment visible, laboratory setting. Marked: ${classification} - ${target}. Atmospheric, mysterious, slightly distorted from dimensional transfer.`,
    
    // Infrared/thermal scan
    `Thermal scan image from quantum research archive, ${year}. Infrared color palette (reds, oranges, yellows), digital scan aesthetic, technical overlay with hex codes. Marked: ${classification} - ${target}. Dimensional interference visible as color anomalies.`,
    
    // Satellite/reconnaissance photo
    `Aerial reconnaissance photograph, ${year}. High altitude perspective, grayscale with slight color tint, military archive style. Grid overlay, coordinates visible. Marked: ${classification} - ${target}. Atmospheric distortion from temporal transfer.`,
    
    // Microscope/scientific documentation
    `Scientific documentation photograph, ${year}. Close-up detail, laboratory lighting, technical precision. Black and white or sepia, archival quality. Marked: ${classification} - ${target}. Quantum interference patterns visible.`,
    
    // Security camera footage
    `Security camera still frame, ${year}. Low resolution, timestamp overlay, surveillance aesthetic. Grayscale or muted colors, CCTV quality. Marked: ${classification} - ${target}. Temporal anomalies visible in frame.`,
    
    // Hand-drawn technical diagram
    `Technical diagram from classified archive, ${year}. Hand-drawn or blueprint style, technical annotations, aged paper texture. Sepia or blueprint tones. Marked: ${classification} - ${target}. Dimensional transfer artifacts.`,
    
    // X-ray/scanning image
    `Scanning image from quantum research, ${year}. X-ray or CT scan aesthetic, inverted colors or grayscale, technical overlay. Marked: ${classification} - ${target}. Dimensional interference visible.`,
    
    // Field documentation
    `Field documentation photograph, ${year}. Outdoor or industrial setting, documentary style, natural lighting. Aged photo aesthetic, film grain. Marked: ${classification} - ${target}. Temporal transfer distortion.`,
    
    // Laboratory evidence photo
    `Evidence photograph from research archive, ${year}. Forensic documentation style, neutral background, precise lighting. Black and white, archival quality. Marked: ${classification} - ${target}. Quantum signature visible.`,
    
    // Abstract quantum visualization
    `Quantum visualization from temporal research, ${year}. Abstract patterns, energy signatures, digital art aesthetic. Cyan/amber color palette, technical overlay. Marked: ${classification} - ${target}. Dimensional interference patterns.`,
  ];
  
  const selectedStyle = styles[Math.floor(Math.random() * styles.length)];
  
  // Add common elements
  return `${selectedStyle} Scanner overlay with hex codes and timestamps. Vintage film grain or digital artifacts. Classified government archive style. Atmospheric, mysterious, slightly distorted from dimensional transfer.`;
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

