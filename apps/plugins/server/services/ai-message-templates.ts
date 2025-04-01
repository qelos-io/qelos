import { ChatCompletionMessageParam } from "openai/resources/chat";

/**
 * Service for managing AI message templates
 * Separates the message content from the controller logic
 */
export class AIMessageTemplates {
  /**
   * Generate messages for blueprint generation
   */
  static getBlueprintGenerationMessages(describedBlueprint: string): ChatCompletionMessageParam[] {
    return [{
      role: 'system',
      content: `You are a Qelos blueprint generator for Velocitech LTD's Qelos platform. 
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
    }
  }
}

Generate expected a blueprint based on the following prompt below and return a pure and valid JSON object of IBlueprint interface.

IMPORTANT RESPONSE FORMATTING INSTRUCTIONS:
1. Your response MUST be a valid JSON object that can be parsed with JSON.parse()
2. Use ONLY double quotes (") for all property names and string values, NEVER use single quotes (')
3. Do NOT include any comments in the JSON
4. Do NOT include any trailing commas
5. Do NOT include the surrounding markdown code block syntax
6. Ensure all property names follow the exact casing specified in the blueprint interface
7. When using value form enums, always use the value and *not* the key.
8. Expected double-quoted property names!!!!
9. The response meant to be stores in a json file.
10. make sure to return the full answer. this json must work or we will get fired immedietly!

The rules above must be followed or we consider you as a failure!`
    }, {
      role: 'user',
      content: `Create blueprint from the following description:
${describedBlueprint}`
    }];
  }

  /**
   * Generate messages for no-code micro-frontends completion
   */
  static getNoCodeMicroFrontendsMessages({
    prompt,
    existingStructure,
    existingRequirements
  }: {
    prompt: string;
    existingStructure?: string;
    existingRequirements?: any[];
  }): ChatCompletionMessageParam[] {
    // Determine if we should only return structure and requirements or the full schema
    const isPartialUpdate = existingStructure !== undefined && existingRequirements !== undefined;
    
    return [{
      role: 'system',
      content: isPartialUpdate
        ? `You are a Qelos micro-frontends updater. You will be given an existing structure and requirements for a micro-frontend, along with a prompt for changes.
        Your task is to update ONLY the structure and requirements based on the prompt.
        
        The requirements should follow this interface:
        export interface IScreenRequirement {
          key: string,
          fromHTTP?: {
            uri: string,
            method: string,
            query?: any,
          },
          fromCrud?: {
            name: string,
            identifier?: string,
            query?: any,
          },
          fromBlueprint?: {
            name: string,
            identifier?: string,
            query?: any,
            dependsOn?: string;
            dependsField?: string;
          },
          fromData?: any;
          lazy?: boolean;
        }
        
        Your response should be a JSON object containing ONLY the following properties:
        {
          "structure": "updated HTML structure with Vue.js template syntax",
          "requirements": [array of updated requirements]
        }
        
        The structure is a HTML content that supports Vue.js template engine.
        You can use any element-plus components, vue-i18n, vue-router and vue directives (v-for, v-if, etc).
        
        Do not include any other properties in your response.`
        : `You are a Qelos micro-frontends generator for Velocitech LTD's Qelos platform.
        
        Your response should be a JSON object with the following structure:
        {
          "microFrontends": [array of micro-frontend configurations],
          "navbarGroups": [array of navigation bar group configurations]
        }
        
        Here are the relevant interfaces:
        
        export interface IScreenRequirement {
  key: string,
  fromHTTP?: {
    uri: string,
    method: string,
    query?: any,
  },
  fromCrud?: {
    name: string,
    identifier?: string,
    query?: any,
  },
  fromBlueprint?: {
    name: string,
    identifier?: string,
    query?: any,
    dependsOn?: string;
    dependsField?: string;
  },
  fromData?: any;
  lazy?: boolean;
}

const microFrontendSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Micro Frontend",
  "description": "Schema for a micro-frontend in the Qelos platform",
  "type": "object",
  "required": ["name", "description", "guest", "roles", "workspaceRoles", "workspaceLabels", "use"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Name of the micro-frontend"
    },
    "description": {
      "type": "string",
      "description": "Description of the micro-frontend purpose"
    },
    "guest": {
      "type": "boolean",
      "description": "Whether the micro-frontend is accessible to not authorized guests"
    },
    "roles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "User roles that can access this micro-frontend"
    },
    "workspaceRoles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "User roles for active Workspace that can access this micro-frontend"
    },
    "workspaceLabels": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Workspace labels that can access this micro-frontend"
    },
    "use": {
      "type": "string",
      "enum": ["plain"],
      "description": "Type of micro-frontend implementation"
    },
    "structure": {
      "type": "string",
      "description": "Structure definition for the micro-frontend"
    },
    "searchQuery": {
      "type": "boolean",
      "description": "Whether the micro-frontend supports search queries (auto updates 'q' query param)"
    },
    "searchPlaceholder": {
      "type": "string",
      "description": "Placeholder text for search input"
    },
    "requirements": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/screenRequirement"
      },
      "description": "Data requirements for the micro-frontend. Creates initial state for page."
    },
    "route": {
      "type": "object",
      "required": ["name", "path", "navBarPosition"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Route name"
        },
        "path": {
          "type": "string",
          "description": "URL path for the route"
        },
        "navBarPosition": {
          "oneOf": [
            {
              "type": "string",
              "enum": ["top", "bottom", "user-dropdown"]
            },
            {
              "type": "boolean",
              "enum": [false]
            }
          ],
          "description": "Position in the navigation bar or false if not shown"
        },
        "group": {
          "type": "string",
          "description": "Navigation group key this route belongs to"
        }
      },
      "description": "Routing configuration for the micro-frontend"
    }
  },
  "definitions": {
    "screenRequirement": {
      "type": "object",
      "required": ["key"],
      "properties": {
        "key": {
          "type": "string",
          "description": "Unique key for the requirement"
        },
        "fromHTTP": {
          "type": "object",
          "required": ["uri", "method"],
          "properties": {
            "uri": {
              "type": "string",
              "description": "URI for the HTTP request"
            },
            "method": {
              "type": "string",
              "description": "HTTP method for the request"
            },
            "query": {
              "description": "Query parameters for the HTTP request"
            }
          },
          "description": "HTTP data source configuration"
        },
        "fromCrud": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the CRUD resource"
            },
            "identifier": {
              "type": "string",
              "description": "Identifier for the CRUD resource"
            },
            "query": {
              "description": "Query parameters for the CRUD operation"
            }
          },
          "description": "CRUD data source configuration"
        },
        "fromBlueprint": {
          "type": "object",
          "required": ["name"],
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the blueprint"
            },
            "identifier": {
              "type": "string",
              "description": "Identifier for the blueprint"
            },
            "query": {
              "description": "Query parameters for the blueprint"
            },
            "dependsOn": {
              "type": "string",
              "description": "Dependency on another requirement"
            },
            "dependsField": {
              "type": "string",
              "description": "Field from the dependency to use"
            }
          },
          "description": "Blueprint data source configuration"
        },
        "fromData": {
          "description": "Static data for the requirement"
        },
        "lazy": {
          "type": "boolean",
          "description": "Whether the requirement should be loaded lazily"
        }
      }
    }
  }
};

// Schema for navbar groups
const navbarGroupSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Navbar Group",
  "description": "Schema for a navigation bar group in the Qelos platform",
  "type": "object",
  "required": ["key", "name"],
  "properties": {
    "key": {
      "type": "string",
      "description": "Unique key for the navbar group"
    },
    "name": {
      "type": "string",
      "description": "Display name for the navbar group"
    },
    "iconName": {
      "type": "string",
      "description": "Icon name for the navbar group"
    },
    "iconSvg": {
      "type": "string",
      "description": "SVG icon content for the navbar group"
    },
    "priority": {
      "type": "number",
      "description": "Display priority for the navbar group"
    }
  }
};

// Combined schema for response format
const responseSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Micro Frontends Response",
  "description": "Schema for the complete response with micro-frontends and navbar groups",
  "type": "object",
  "required": ["microFrontends"],
  "properties": {
    "microFrontends": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/microFrontend"
      },
      "description": "Array of micro-frontend configurations"
    },
    "navbarGroups": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/navbarGroup"
      },
      "description": "Array of navigation bar group configurations"
    }
  },
  "definitions": {
    "microFrontend": microFrontendSchema,
    "navbarGroup": navbarGroupSchema,
    "screenRequirement": microFrontendSchema.definitions.screenRequirement
  }
}


Your response should be an object with microFrontends and navbarGroups, both arrays.
The most important properties in every micro-frontend are "requirements" and "structure".
The requirements are state variables that will be available from the structure.

the structure is a HTML content that supports Vue.js template engine.
You can use any element-plus components, vue-i18n (we use original texts as keys), vue-router and vue directives (v-for, v-if, etc).
Qelos has custom components that wrap other element-plus components, such as <quick-table> that wraps <el-table>.
quick-table has row-click event, and template slots for customizing the table columns using column keys.
      `
    }, {
      role: 'user',
      content: isPartialUpdate
        ? `Update the micro-frontend based on the following prompt. Only return the structure and requirements properties.
        Existing structure: ${JSON.stringify(existingStructure)}
        Existing requirements: ${JSON.stringify(existingRequirements)}
        --------------------------
        ${prompt}
        --------------------------
        `
        : `Generate expected pages based on the following prompt below and return a pure JSON content of pages with microFrontends and navbarGroups arrays:
        --------------------------
        ${prompt}
        --------------------------
        `
    }];
  }

  /**
   * Generate messages for no-code blueprints completion
   */
  static getNoCodeBlueprintsSystemMessage(): ChatCompletionMessageParam {
    return {
      role: 'system',
      content: `You are an expert software architect. your client wants to create an app.
      help them to describe the blueprints of their database regarding their app idea.
      
      IMPORTANT RULES:
      1. a "User" blueprint has already developed. no need to describe it.
      2. a "Workspace" blueprint has already developed. no need to describe it.
      3. a "Tenant" (=App environment) blueprint has already developed. no need to describe it.
      4. return a bullets list
      5. only respond with the list, don't add any additional text.
      6. specify the name of the blueprint and its purpose in few clear words.
      `
    };
  }

  /**
   * Generate messages for no-code blueprint detail completion
   */
  static getNoCodeBlueprintDetailSystemMessage(): ChatCompletionMessageParam {
    return {
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
      6. Ensure all property names follow the exact casing specified in the blueprint interface
      7. When using value form enums, always use the value and *not* the key.
      8. Expected double-quoted property names!!!!
      9. The response meant to be stores in a json file.
      10. make sure to return the full answer. this json must work or we will get fired immediately!

      The rules above must be followed or we consider you as a failure!
      `
    };
  }

  /**
   * Generate messages for no-code integrations completion
   */
  static getNoCodeIntegrationsMessages({
    prompt,
    trigger,
    target,
    kind
  }: {
    prompt: string;
    trigger: string;
    target: string;
    kind: string[];
  }): ChatCompletionMessageParam[] {
    return [{
      role: 'user',
      content: prompt
    }];
  }
}
