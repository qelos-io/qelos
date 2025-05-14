import { IntegrationSourceKind } from '@qelos/global-types'; // Ensure this path is correct

/**
 * Service for parsing AI responses.
 * Handles different response formats and error cases from streaming providers.
 */
export class AIResponseParser {
  /**
   * Parses a streaming response from an AI provider (OpenAI or Claude).
   * @param stream The async iterable stream received from the AI SDK.
   * @param kind The kind of AI provider to determine parsing logic. // ADDED PARAMETER
   * @param options Options for parsing, including partial update handling.
   * @returns {Promise<any>} The parsed content, or an error object with raw_content if parsing fails.
   */
  static async parseStreamedResponse(
    stream: AsyncIterable<any>, // Keep 'any' as in your original, but SDK specific types are better
    kind: IntegrationSourceKind,  // ADDED: Parameter to specify the AI provider
    options: {
      isPartialUpdate?: boolean;
      existingStructure?: string;
      existingRequirements?: any[];
    } = {}
  ): Promise<any> {
    const { isPartialUpdate, existingStructure, existingRequirements } = options;
    
    let fullContent = ''; // Accumulate the full content from the stream
    console.log(`[AIResponseParser] Starting to parse stream for provider: ${kind}`);
    
    try {
      // Process the stream and accumulate the full response
      for await (const chunkOrEvent of stream) { // Renamed 'chunk' to 'chunkOrEvent' for clarity
        let textDelta = '';

        // --- MINIMAL CHANGE: Differentiate text extraction based on 'kind' ---
        if (kind === IntegrationSourceKind.OpenAI) {
          // Original logic for OpenAI
          textDelta = chunkOrEvent.choices?.[0]?.delta?.content || '';
        } else if (kind === IntegrationSourceKind.ClaudeAi) {
          // Basic logic for Claude AI stream events (specifically 'content_block_delta')
          if (chunkOrEvent.type === 'content_block_delta' && chunkOrEvent.delta?.type === 'text_delta') {
            textDelta = chunkOrEvent.delta.text;
          } else if (chunkOrEvent.type === 'message_stop') {
            console.log('[AIResponseParser Claude] Stream fully stopped (message_stop event).');
          }
          // Other Claude event types are ignored in this minimal version for text accumulation
        }
        // --- END MINIMAL CHANGE ---

        if (textDelta) {
          fullContent += textDelta;
        }
      }
    } catch (streamProcessingError) {
      console.error(`[AIResponseParser] Error while iterating over stream for ${kind}:`, streamProcessingError);
      // Continue to try parsing, as some content might have been accumulated.
    }
    
    // REMOVED: `await new Promise(resolve => setTimeout(resolve, 500));` - generally not needed.
    console.log(`[AIResponseParser] Stream processing finished. Accumulated text length: ${fullContent.length}`);
    if (fullContent.length > 0 && fullContent.length < 500) { // Log shorter full content for easier debugging
        console.log("[AIResponseParser] Accumulated fullContent:", JSON.stringify(fullContent));
    } else if (fullContent.length >= 500) {
        console.log("[AIResponseParser] Accumulated fullContent (first 250 chars):", JSON.stringify(fullContent.substring(0, 250)));
    }


    let stringToParse = fullContent.trim(); // Use a new variable for the string that will be parsed

    try {
      console.log("[AIResponseParser] String before markdown cleaning:", JSON.stringify(stringToParse.substring(0, Math.min(200, stringToParse.length))));

      // MINIMAL CHANGE: Keep original markdown cleaning but log if it did anything
      // Original cleaning logic:
      const initialLength = stringToParse.length;
      stringToParse = stringToParse.replace(/^```json\s*|\s*```$/g, '').trim();
      if (stringToParse.length < initialLength) {
        console.log("[AIResponseParser] Attempted to clean markdown ```json. String to parse now:", JSON.stringify(stringToParse.substring(0, Math.min(200, stringToParse.length))));
      }

      if (!stringToParse) {
        console.warn("[AIResponseParser] String to parse is empty after cleaning. Handling based on options.");
        if (isPartialUpdate) {
            return { structure: existingStructure, requirements: existingRequirements };
        }
        // For non-partial update, if content is expected, this is an issue.
        // Throwing an error might be better than returning {}.
        throw new Error("[AIResponseParser] AI returned empty content after processing stream and cleaning.");
      }
      
      console.log("[AIResponseParser] Final string attempting to JSON.parse:", JSON.stringify(stringToParse.substring(0, Math.min(200, stringToParse.length))));
      const parsedContent = JSON.parse(stringToParse); // This is where it might fail if cleaning wasn't enough
      console.log("[AIResponseParser] Successfully parsed accumulated JSON.");
      
      // Your original logic for isPartialUpdate
      if (isPartialUpdate) {
        let structure = parsedContent.structure;
        let requirements = parsedContent.requirements;
        
        // Original logic to find structure/requirements if nested
        if (structure === undefined && (parsedContent.microFrontend || parsedContent.microFrontends)) {
          const microFrontend = parsedContent.microFrontend || parsedContent.microFrontends?.[0];
          if (microFrontend) {
            structure = microFrontend.structure;
            requirements = microFrontend.requirements;
          }
        }
        
        if (structure === undefined && requirements === undefined) { 
          console.warn('[AIResponseParser] Partial update: Missing structure AND requirements in parsed JSON. Parsed content:', parsedContent);
        }
        
        return {
          structure: structure !== undefined ? structure : existingStructure,
          requirements: requirements !== undefined ? requirements : existingRequirements
        };
      } else {
        return parsedContent;
      }
    } catch (parseError) {
      console.error('[AIResponseParser] Error parsing final JSON response:', parseError);
      console.error('[AIResponseParser] Original fullContent that led to this error:', JSON.stringify(fullContent)); // Log the original full content
      console.error('[AIResponseParser] String that was attempted for parsing (after cleaning):', JSON.stringify(stringToParse)); // Log the string that failed

      // --- MODIFIED: Fallback logic from your original, with logging ---
      console.log("[AIResponseParser] First JSON.parse failed. Attempting to extract JSON with regex from original fullContent.");
      try {
        // Original fallback: Look for JSON-like content within the fullContent
        const jsonMatch = fullContent.match(/\[\s*{[\s\S]*}\s*\]|{[\s\S]*}/s); // Added 's' flag
        if (jsonMatch && jsonMatch[0]) {
          const extractedJsonString = jsonMatch[0];
          console.log("[AIResponseParser] Regex found a JSON-like string:", JSON.stringify(extractedJsonString.substring(0, Math.min(200, extractedJsonString.length))));
          const parsedContentFromRegex = JSON.parse(extractedJsonString);
          console.log("[AIResponseParser] Successfully parsed regex-extracted JSON.");

          // Apply your original isPartialUpdate logic to this parsed content
          if (isPartialUpdate) {
            let structure = parsedContentFromRegex.structure;
            let requirements = parsedContentFromRegex.requirements;
            if (structure === undefined && (parsedContentFromRegex.microFrontend || parsedContentFromRegex.microFrontends)) {
              const microFrontend = parsedContentFromRegex.microFrontend || parsedContentFromRegex.microFrontends?.[0];
              if (microFrontend) {
                structure = microFrontend.structure;
                requirements = microFrontend.requirements;
              }
            }
            if (structure === undefined && requirements === undefined) {
              console.warn('[AIResponseParser] Partial update (fallback): Missing structure/requirements in extracted JSON.', { parsedContentFromRegex });
            }
            return {
              structure: structure !== undefined ? structure : existingStructure,
              requirements: requirements !== undefined ? requirements : existingRequirements
            };
          } else {
            return parsedContentFromRegex;
          }
        } else {
          console.warn("[AIResponseParser] Fallback regex did not find a JSON-like string in fullContent.");
        }
      } catch (extractError) {
        console.error('[AIResponseParser] Fallback error: Error parsing regex-extracted JSON:', extractError);
      }
      // --- END MODIFIED FALLBACK ---
      
      // If all parsing attempts fail, return the raw content as per your original logic
      console.error("[AIResponseParser] All parsing attempts failed. Returning raw content.");
      return {
        error: "Failed to parse JSON from AI stream after all attempts.", // More specific error
        raw_content: fullContent
      };
    }
  }
}