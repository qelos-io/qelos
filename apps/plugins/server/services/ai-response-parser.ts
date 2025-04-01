/**
 * Service for parsing AI responses
 * Handles different response formats and error cases
 */
export class AIResponseParser {
  /**
   * Parse a streaming response from an AI provider
   */
  static async parseStreamedResponse(stream: any, options: {
    isPartialUpdate?: boolean;
    existingStructure?: string;
    existingRequirements?: any[];
  } = {}) {
    const { isPartialUpdate, existingStructure, existingRequirements } = options;
    
    // Accumulate the full content from the stream
    let fullContent = '';
    
    // Process the stream and accumulate the full response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
    }
    
    // Wait a moment to ensure all content is processed
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Extract and return the JSON
      // First try to clean any potential markdown formatting
      const cleanedContent = fullContent.replace(/^```json\s*|\s*```$/g, '').trim();
      const parsedContent = JSON.parse(cleanedContent);
      
      if (isPartialUpdate) {
        // For partial updates, we only need structure and requirements
        // Extract them from the response, handling various possible response formats
        let structure = parsedContent.structure;
        let requirements = parsedContent.requirements;
        
        // Handle case where response might be wrapped in a microFrontend object
        if (!structure || !requirements) {
          const microFrontend = parsedContent.microFrontend || parsedContent.microFrontends?.[0];
          if (microFrontend) {
            structure = microFrontend.structure;
            requirements = microFrontend.requirements;
          }
        }
        
        // Validate that we have the required properties
        if (!structure || !requirements) {
          console.warn('Missing structure or requirements in OpenAI response', { parsedContent });
        }
        
        return {
          structure: structure || existingStructure,
          requirements: requirements || existingRequirements
        };
      } else {
        // For full schema, return the complete result
        return parsedContent;
      }
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      // If JSON parsing fails, try to extract JSON from the content
      try {
        // Look for JSON-like content within the response
        const jsonMatch = fullContent.match(/\[\s*{[\s\S]*}\s*\]|{[\s\S]*}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          const parsedContent = JSON.parse(extractedJson);
          
          if (isPartialUpdate) {
            // For partial updates, extract only structure and requirements
            let structure = parsedContent.structure;
            let requirements = parsedContent.requirements;
            
            // Handle case where response might be wrapped in a microFrontend object
            if (!structure || !requirements) {
              const microFrontend = parsedContent.microFrontend || parsedContent.microFrontends?.[0];
              if (microFrontend) {
                structure = microFrontend.structure;
                requirements = microFrontend.requirements;
              }
            }
            
            // Validate that we have the required properties
            if (!structure || !requirements) {
              console.warn('Missing structure or requirements in extracted JSON', { parsedContent });
            }
            
            return {
              structure: structure || existingStructure,
              requirements: requirements || existingRequirements
            };
          } else {
            // For full schema, return the complete result
            return parsedContent;
          }
        }
      } catch (extractError) {
        console.error('Error extracting JSON:', extractError);
      }
      
      // If all parsing attempts fail, return the raw content
      return {
        raw_content: fullContent
      };
    }
  }
}
