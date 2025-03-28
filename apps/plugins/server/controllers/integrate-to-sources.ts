import OpenAI from "openai";
import IntegrationSource from "../models/integration-source";
import { getEncryptedSourceAuthentication } from "../services/source-authentication-service";
import { ChatCompletionMessageParam } from "openai/resources/chat";

export async function getIntegrationSource(req, res, next) {
  try {
    const source = await IntegrationSource
      .findOne({ _id: req.params.sourceId, tenant: req.headers.tenant })
      .lean()
      .exec()

    if (!source) {
      res.status(404).end();
      return;
    }

    req.integrationSource = source;
    req.integrationSourceAuthentiocation = await getEncryptedSourceAuthentication(req.headers.tenant, source.kind, source.authentication);

    next();
  } catch {
    res.status(500).json({ message: 'could not get integration source' }).end();
  }
}

export async function validateChatSources(req, res, next) {
  if (req.integrationSource.kind !== 'openai') {
    res.status(400).json({ message: 'integration source is not openai' }).end();
    return;
  }

  next();
}

export async function chatCompletion(req, res) {
  try {
    const openai = new OpenAI({
      apiKey: req.integrationSourceAuthentiocation.token
    });

    const { model = 'gpt-4o', messages, temperature = 0.7, top_p = 0.9, frequency_penalty = 0.2, presence_penalty = 0.2 } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        message: 'messages array is required and must not be empty'
      });
    }

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      top_p,
      frequency_penalty,
      presence_penalty
    });

    return res.json(response).end();
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing OpenAI chat completion',
      error: errorObj.response?.data || error
    });
  }
}

export async function noCodeMicroFrontendsCompletion(req, res) {
  try {
    const openai = new OpenAI({
      apiKey: req.integrationSourceAuthentiocation.token
    });

    const { model = 'gpt-4o', prompt, expectedResult = 'blueprints' } = req.body;

    if (!(prompt && expectedResult)) {
      res.status(400).json({
        message: 'missing prompt'
      }).end();
      return;
    }
    const messages: ChatCompletionMessageParam[] = [{
      role: 'system',
      content: `You are a Qelos page generator. Generate expected pages based on the following prompt below and return a pure JSON content of pages:
      --------------------------
      ${prompt}
      --------------------------
      `
    }];

    // Use streaming to ensure we get the complete response
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      stream: true,
      max_tokens: 4000 // Ensure we get a complete response
    });

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
      const result = JSON.parse(cleanedContent);
      return res.json(result);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      // If JSON parsing fails, try to extract JSON from the content
      try {
        // Look for JSON-like content within the response
        const jsonMatch = fullContent.match(/\[\s*{[\s\S]*}\s*\]|{[\s\S]*}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          const result = JSON.parse(extractedJson);
          return res.json(result);
        }
      } catch (extractError) {
        console.error('Error extracting JSON:', extractError);
      }
      
      // If all parsing attempts fail, return the raw content
      return res.json({
        raw_content: fullContent
      }).end();
    }
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing OpenAI chat completion',
      error: errorObj.response?.data || error
    });
  }
}

export async function noCodeBlueprintsCompletion(req, res) {
  try {
    const openai = new OpenAI({
      apiKey: req.integrationSourceAuthentiocation.token
    });

    const { model = 'gpt-4o', prompt } = req.body;

    if (!prompt) {
      res.status(400).json({
        message: 'missing prompt'
      }).end();
      return;
    }

    const blueprintsListRes = await openai.chat.completions.create({
      model,
      messages: [
          {  
            role: 'system',
            content: `You are an expert software architect. your client wants to create an app.
            help them to describe the blueprints of thir database regaridng their app idea.
            
            IMPORTANT RULES:
            1. a "User" blueprint has already developed. no need to describe it.
            2. a "Workspace" blueprint has already developed. no need to describe it.
            3. a "Tenant" (=App environment) blueprint has already developed. no need to describe it.
            4. return a bullets list
            5. only respond with the list, don't add any additional text.
            6. specify the name of the blueprint and its purpose in few clear words.
            `
          },
          {
            role: 'user',
            content: `what blueprints do i need to have in my database according to the described app:
    ${prompt}.`
          }
      ],
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
    })

    const blueprintsList = blueprintsListRes.choices[0].message.content || '';

    console.log(blueprintsList);

    const blueprints = await Promise.all(blueprintsList.split('\n').map(async (describedBlueprint) => {
      const messages: ChatCompletionMessageParam[] = [{
        role: 'system',
        content: `You are a Qelos blueprint generator. 
  A blueprint is a JSON object that defines the structure of a database model.
  The interfaces we use to describe blueprints are:
  export enum EntityIdentifierMechanism {
    OBJECT_ID = 'objectid',
    GUID = 'guid'
  }

  export enum BlueprintPropertyType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    DATE = 'date',
    DATETIME = 'datetime',
    TIME = 'time',
    OBJECT = 'object',
    FILE = 'file'
  }

  export enum PermissionScope {
    USER = 'user',
    WORKSPACE = 'workspace',
    TENANT = 'tenant'
  }

  export enum CRUDOperation {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete'
  }

  export interface IPermissionsDescriptor {
    scope: PermissionScope,
    operation: CRUDOperation,
    guest: boolean,
    roleBased: string[],
    workspaceRoleBased: string[],
    workspaceLabelsBased: string[],
  }

  export interface IBlueprintPropertyDescriptor {
    title: string,
    type: BlueprintPropertyType,
    description: string,
    required: boolean,
    enum?: string[],
    multi?: boolean,
    min?: number,
    max?: number,
    schema?: any; // when type === "object" - schema can be a valid json schema.
  }

  export interface IBlueprintLimitation {
    scope: PermissionScope;
    workspaceLabels: string[];
    roles: string[];
    properties?: string[];
    value: number;
  }

  const blueprintJsonSchema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "title": "Blueprint Schema",
    "description": "Schema for defining a blueprint in the Qelos platform",
    "required": [
      "identifier",
      "name",
      "entityIdentifierMechanism",
      "permissions",
      "permissionScope",
      "properties",
      "updateMapping",
      "relations",
      "limitations",
      "dispatchers"
    ],
    "properties": {
      "identifier": {
        "type": "string",
        "description": "Unique identifier for the blueprint"
      },
      "name": {
        "type": "string",
        "description": "Display name for the blueprint"
      },
      "description": {
        "type": "string",
        "description": "Optional description of the blueprint's purpose"
      },
      "entityIdentifierMechanism": {
        "type": "string",
        "enum": ["objectid", "guid"],
        "description": "Mechanism used to generate unique identifiers for entities"
      },
      "permissions": {
        "type": "array",
        "description": "Defines the CRUD permissions for users based on selected scope",
        "items": {
          "type": "object",
          "properties": {
            "scope": {
              "type": "string",
              "enum": ["user", "workspace", "tenant"],
              "description": "Permission scope level"
            },
            "operation": {
              "type": "string",
              "enum": ["create", "read", "update", "delete"],
              "description": "CRUD operation type"
            },
            "guest": {
              "type": "boolean",
              "description": "Whether guests are allowed this permission"
            },
            "roleBased": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Roles that have this permission"
            },
            "workspaceRoleBased": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Workspace roles that have this permission"
            }
          }
        }
      },
      "permissionScope": {
        "type": "string",
        "enum": ["user", "workspace", "tenant"],
        "description": "General scope for created entities"
      },
      "properties": {
        "type": "object",
        "description": "Properties that will be reflected on each entity.metadata. Note: users, workspaces and tenants are automatically specified on each entity",
        "additionalProperties": {
          "type": "object",
          "required": ["title", "type", "description", "required"],
          "properties": {
            "title": {
              "type": "string",
              "description": "Display title for the property"
            },
            "type": {
              "type": "string",
              "enum": ["string", "number", "boolean", "date", "datetime", "time", "object", "file"],
              "description": "Data type of the property"
            },
            "description": {
              "type": "string",
              "description": "Description of the property's purpose"
            },
            "required": {
              "type": "boolean",
              "description": "Whether the property is required"
            },
            "enum": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Possible values for the property"
            },
            "multi": {
              "type": "boolean",
              "description": "Whether multiple values can be selected"
            },
            "min": {
              "type": "number",
              "description": "Minimum value for number properties"
            },
            "max": {
              "type": "number",
              "description": "Maximum value for number properties"
            },
            "schema": {
              "description": "Schema definition for object type properties"
            }
          }
        }
      },
      "updateMapping": {
        "type": "object",
        "description": "Each mapping is a jq calculation where '.' represents the entire entity object",
        "additionalProperties": { "type": "string" }
      },
      "relations": {
        "type": "array",
        "description": "Relationships between properties and other blueprints",
        "items": {
          "type": "object",
          "required": ["key", "target"],
          "properties": {
            "key": {
              "type": "string",
              "description": "Property key from properties"
            },
            "target": {
              "type": "string",
              "description": "Target blueprint identifier (can use self identifier)"
            }
          }
        }
      },
      "limitations": {
        "type": "array",
        "description": "Define CRUD limitations based on custom rules",
        "items": {
          "type": "object",
          "required": ["scope", "workspaceLabels", "roles", "value"],
          "properties": {
            "scope": {
              "type": "string",
              "enum": ["user", "workspace", "tenant"],
              "description": "Scope level for the limitation"
            },
            "workspaceLabels": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Workspace labels this limitation applies to"
            },
            "roles": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Roles this limitation applies to"
            },
            "properties": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Properties this limitation applies to"
            },
            "value": {
              "type": "number",
              "description": "Numeric value for the limitation"
            }
          }
        }
      },
      "dispatchers": {
        "type": "object",
        "description": "Configuration for webhook triggers on entity operations",
        "required": ["create", "update", "delete"],
        "properties": {
          "create": {
            "type": "boolean",
            "description": "Whether to trigger a webhook on entity creation"
          },
          "update": {
            "type": "boolean",
            "description": "Whether to trigger a webhook on entity update"
          },
          "delete": {
            "type": "boolean",
            "description": "Whether to trigger a webhook on entity deletion"
          }
        }
      }
    }
  }
      Generate expected a blueprint based on the following prompt below and return a pure and valid JSON object of IBlueprint interface.

      IMPORTANT RESPONSE FORMATTING INSTRUCTIONS:
      1. Your response MUST be a valid JSON object that can be parsed with JSON.parse()
      2. Use ONLY double quotes (") for all property names and string values, NEVER use single quotes (')
      3. Do NOT include any comments in the JSON
      4. Do NOT include any trailing commas
      5. Do NOT include the surrounding markdown code block syntax ${"(```json or ```)"}
      6. Ensure all property names follow the exact casing specified in the blueprint interface
      7. When using value form enums, always use the value and *not* the key.
      8. Expected double-quoted property names!!!!
      9. The response meant to be stores in a json file.
      10. make sure to return the full answer. this json must work or we will get fired immedietly!

      The rules above must be followed or we consider you as a failure!
      `
      }, {
        role: 'user',
        content: `Create blueprint from the following description:
        ${describedBlueprint}`
      }];
    
      // Use streaming to ensure we get the complete response
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.2,
        presence_penalty: 0.2,
        stream: false,
        response_format: { type: "json_object" }
      });
      return JSON.parse(response.choices[0].message.content || '{}');
    }))

    return res.json(blueprints).end();
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing OpenAI chat completion',
      error: errorObj.response?.data || error
    });
  }
}

export async function noCodeIntegrationsCompletion(req, res) {
  try {
    const openai = new OpenAI({
      apiKey: req.integrationSourceAuthentiocation.token
    });

    const { model = 'gpt-4o', prompt, trigger, target, kind = [] } = req.body;

    if (!(prompt && trigger && target && kind?.length === 2)) {
      res.status(400).json({
        message: 'missing required data'
      }).end();
      return;
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: prompt
      }],
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2
    });

    return res.json(response).end();
  } catch (error: unknown) {
    const errorObj = error as { status?: number; message?: string; response?: { data: unknown } };

    return res.status(errorObj.status || 500).json({
      message: errorObj.message || 'Error processing OpenAI chat completion',
      error: errorObj.response?.data || error
    });
  }
}