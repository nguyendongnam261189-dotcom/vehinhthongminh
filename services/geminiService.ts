import { GoogleGenAI, Modality } from "@google/genai";
import { GeometryResponse, ShapeType, Shape } from "../types";

// Helper to decode Base64 string to Uint8Array
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode Raw PCM 16-bit to AudioBuffer
function decodePCM16(
    data: Uint8Array, 
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1
): AudioBuffer {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // Parses a single line of text command into a Shape object
  // Format expected: TYPE key:value key:value ...
  private parseShapeLine(line: string): Shape | null {
    try {
      // Normalize line: remove extra spaces, fix common separators
      const cleanLine = line.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
      const parts = cleanLine.split(' ');
      
      if (parts.length < 2) return null;

      const typeRaw = parts[0].toUpperCase();
      const params: Record<string, string> = {};

      // Parse key:value pairs (support key:value and key=value)
      parts.slice(1).forEach(part => {
        // Find split point (first : or =)
        const splitMatch = part.match(/[:=]/);
        if (splitMatch && splitMatch.index) {
          const key = part.substring(0, splitMatch.index).toLowerCase(); // Normalize keys to lowercase
          let val = part.substring(splitMatch.index + 1);
          // Cleanup value
          val = val.replace(/"/g, '').replace(/'/g, '').replace(/_/g, ' '); 
          params[key] = val;
        }
      });

      // Default ID if missing
      const id = params.id || `auto_${Math.random().toString(36).substr(2, 6)}`;
      
      // Default color handling (can be overridden by params)
      const defaultColor = '#e2e8f0'; 

      switch (typeRaw) {
        case 'POINT':
          return {
            id,
            type: ShapeType.POINT,
            x: parseFloat(params.x || '0'),
            y: parseFloat(params.y || '0'),
            label: params.label || '',
            radius: 4,
            color: params.color || '#38bdf8' 
          };

        case 'LINE':
          return {
            id,
            type: ShapeType.LINE,
            x1: parseFloat(params.x1 || '0'),
            y1: parseFloat(params.y1 || '0'),
            x2: parseFloat(params.x2 || '0'),
            y2: parseFloat(params.y2 || '0'),
            color: params.color || '#94a3b8', 
            strokeWidth: 2,
            strokeStyle: (params.style === 'dashed' || params.style === 'dotted') ? params.style : 'solid'
          };

        case 'CIRCLE':
          return {
            id,
            type: ShapeType.CIRCLE,
            cx: parseFloat(params.cx || '0'),
            cy: parseFloat(params.cy || '0'),
            r: parseFloat(params.r || '0'),
            color: params.color || '#94a3b8',
            strokeWidth: 2,
            strokeStyle: (params.style === 'dashed' || params.style === 'dotted') ? params.style : 'solid'
          };

        case 'POLYGON':
          // Points format: x1,y1,x2,y2,x3,y3... or x1,y1 x2,y2
          // Normalize separators to commas for parsing logic
          const pointsRawStr = params.points || '';
          // Regex to match numbers
          const coords = pointsRawStr.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
          
          const points: {x: number, y: number}[] = [];
          for (let i = 0; i < coords.length; i += 2) {
            if (i + 1 < coords.length) {
              points.push({ x: coords[i], y: coords[i+1] });
            }
          }
          return {
            id,
            type: ShapeType.POLYGON,
            points,
            color: 'transparent',
            fill: params.fill || '#38bdf8',
            opacity: 0.1,
            strokeWidth: 0 // Polygons often just for fill, lines draw the border
          };

        case 'TEXT':
          return {
            id,
            type: ShapeType.TEXT,
            x: parseFloat(params.x || '0'),
            y: parseFloat(params.y || '0'),
            content: params.content || 'Text',
            color: params.color || '#e2e8f0',
            fontSize: 14
          };

        default:
          return null;
      }
    } catch (e) {
      console.warn("Failed to parse line:", line, e);
      return null;
    }
  }

  async analyzeGeometryProblem(problemText: string): Promise<GeometryResponse> {
    const prompt = `
      You are an Expert Geometry Math Engine.
      Task: Convert the Vietnamese geometry problem into precise drawing commands.
      
      Problem: "${problemText}"

      *** STRICT COORDINATE RULES (800x600 Canvas) ***
      1. Origin (0,0) is TOP-LEFT. Y-axis increases DOWNWARDS.
      2. Keep shapes CENTERED around (400, 300).
      3. **DO NOT GUESS.** Calculate coordinates using trigonometry.
         - Equilateral Triangle ABC (side a): Height h = a * sqrt(3) / 2.
         - If Base BC is horizontal at y=450, Length=300: B(250, 450), C(550, 450).
           Midpoint BC is (400, 450). Vertex A is at y = 450 - (300 * 0.866) = 190.2. -> A(400, 190).
      4. **LABELS MUST MATCH VERTICES.** If A is at (400, 190), label A must be there.

      *** OUTPUT FORMAT (PLAIN TEXT) ***
      Do not use JSON. Use the following line-by-line format:
      
      EXPLANATION: <Step-by-step summary in Vietnamese>
      POINT   id:A x:400 y:190 label:A
      POINT   id:B x:250 y:450 label:B
      POINT   id:C x:550 y:450 label:C
      LINE    id:AB x1:400 y1:190 x2:250 y2:450
      LINE    id:BC x1:250 y1:450 x2:550 y2:450
      LINE    id:CA x1:550 y1:450 x2:400 y1:190
      POLYGON id:PolyABC points:400,190,250,450,550,450 fill:#38bdf8
      
      *** COMMAND REFERENCE ***
      - POINT: x, y, label, color(optional)
      - LINE: x1, y1, x2, y2, style(solid/dashed)
      - CIRCLE: cx, cy, r
      - POLYGON: points(x1,y1,x2,y2...), fill

      Think step-by-step to calculate coordinates before generating commands.
    `;

    try {
      // SWITCHED TO gemini-3-flash-preview
      // INCREASED thinkingBudget to 4096 to ensure calculation accuracy for Flash
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 4096 }, 
        }
      });

      if (!response.text) throw new Error("No response from AI");
      
      const rawText = response.text.replace(/```text/g, '').replace(/```/g, '');
      const lines = rawText.split('\n');
      const shapes: Shape[] = [];
      let explanation = "";

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        line = line.replace(/\*\*/g, '');

        if (line.startsWith("EXPLANATION:")) {
          explanation += line.substring("EXPLANATION:".length).trim() + " ";
          continue;
        }

        const shape = this.parseShapeLine(line);
        if (shape) {
          shapes.push(shape);
        }
      }

      return { explanation: explanation.trim(), shapes };

    } catch (error) {
      console.error("Geometry analysis failed:", error);
      throw error;
    }
  }

  async generateSpeech(text: string, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data received");

      const bytes = base64ToBytes(base64Audio);
      return decodePCM16(bytes, audioContext, 24000, 1);

    } catch (error) {
      console.error("TTS failed:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();