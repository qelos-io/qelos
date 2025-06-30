import { v4 as uuidv4 } from 'uuid';
import * as compiler from '@vue/compiler-sfc';
import logger from './logger';

/**
 * Compiles a Vue component into a client-side library that can be imported in the frontend
 * @param fileContent The Vue component content as a string
 * @returns An object with compiled js and css strings
 */
export async function compileVueComponent(fileContent: string): Promise<{js: string, css: string}> {
  try {
    // Preprocess the file content to handle TypeScript and regex issues in script setup
    // This fixes issues with TypeScript syntax and unterminated regex in script setup components
    // Store the original TypeScript props for later use
    const tsPropsMatches: string[] = [];
    
    // First extract TypeScript props definitions before modifying the content
    const tsPropsRegex = /defineProps\s*<\s*\{([^}]+)\}\s*>/g;
    let match: RegExpExecArray | null;
    while ((match = tsPropsRegex.exec(fileContent)) !== null) {
      tsPropsMatches.push(match[1]);
    }
    
    let preprocessedContent = fileContent
      // Handle TypeScript type annotations by converting to JS props
      .replace(/defineProps\s*<\s*\{([^}]+)\}\s*>/g, (match, typeProps) => {
        // Convert TypeScript types to JS prop definitions
        const propDefs = typeProps.split(',').map(prop => {
          const [name, type] = prop.trim().split(':').map(p => p.trim());
          if (!name || !type) return '';
          
          // Map TypeScript types to Vue prop types
          let propType;
          switch(type.toLowerCase()) {
            case 'string': propType = 'String'; break;
            case 'number': propType = 'Number'; break;
            case 'boolean': propType = 'Boolean'; break;
            case 'object': propType = 'Object'; break;
            case 'array': propType = 'Array'; break;
            case 'date': propType = 'Date'; break;
            case 'function': propType = 'Function'; break;
            default: propType = 'null'; // For complex types we can't easily map
          }
          
          return `${name}: ${propType}`;
        }).filter(Boolean).join(', ');
        
        return `defineProps({ ${propDefs} })`;
      })
      // Fix unterminated regex by detecting and fixing the pattern
      .replace(/\.replace\(\/\\n\/g,/g, '.replace(/\\\\n/g,')
      .replace(/\.replace\(\/\n\/g,/g, '.replace(/\\n/g,');
    
    // Parse the SFC into descriptor
    const { descriptor, errors } = compiler.parse(preprocessedContent);
    
    // Check for parsing errors
    if (errors.length) {
      throw new Error(`Vue SFC parsing error: ${errors.join(', ')}`);
    }
    
    // Extract styles
    let cssOutput = '';
    const scopeId = `data-v-${uuidv4().slice(0, 8)}`;
    
    if (descriptor.styles.length > 0) {
      // Process each style block
      cssOutput = descriptor.styles.map(style => {
        let content = style.content;
        
        // If the style is scoped, add the appropriate scoped selectors
        if (style.scoped) {
          // Use a simple regex-based approach to add scoped selectors
          // This is a simplified version of what Vue's compiler does
          content = content
            // Add the scoped attribute to selectors
            .replace(/([^{}]+)({[^{}]*})/g, (match, selector, rules) => {
              // Split multiple selectors (e.g., .foo, .bar)
              const selectors = selector.split(',').map(s => s.trim());
              
              // Add the scoped attribute to each selector
              const scopedSelectors = selectors.map(s => {
                // Don't duplicate the attribute for pseudo-elements/classes
                if (s.includes(':')) {
                  const [base, pseudo] = s.split(':');
                  return `${base}[${scopeId}]:${pseudo}`;
                }
                return `${s}[${scopeId}]`;
              });
              
              return `${scopedSelectors.join(', ')}${rules}`;
            });
        }
        
        return content;
      }).join('\n');
    }
    
    // Compile the template
    let templateCode = '';
    if (descriptor.template) {
      const templateResult = compiler.compileTemplate({
        id: uuidv4(),
        source: descriptor.template.content,
        filename: 'component.vue',
        // Add scopeId if any style is scoped
        scoped: descriptor.styles.some(style => style.scoped),
        compilerOptions: {
          runtimeGlobalName: 'Vue',
          // Target browser environment
          isCustomElement: (tag) => tag.includes('-')
        }
      });
      
      if (templateResult.errors && templateResult.errors.length) {
        throw new Error(`Template compilation error: ${templateResult.errors.join(', ')}`);
      }
      
      // Replace Vue imports with global Vue object references
      templateCode = templateResult.code
        // Replace import statements
        .replace(/import\s+\{([^}]+)\}\s+from\s+["']vue["'];?/g, (match, imports) => {
          // Extract the imported functions
          const importedFunctions = imports.split(',').map(imp => {
            const parts = imp.trim().split(' as ');
            return {
              original: parts[0].trim(),
              alias: parts.length > 1 ? parts[1].trim() : parts[0].trim()
            };
          });
          
          // Create variable declarations that reference the Vue global
          return importedFunctions.map(fn => 
            `const ${fn.alias} = Vue.${fn.original};`
          ).join('\n');
        });
    }
    
    // Compile the script - handle both normal script and script setup
    let scriptContent = '';
    let hasScriptSetup = false;
    
    if (descriptor.scriptSetup) {
      hasScriptSetup = true;
      try {
        // Use compileScript to handle script setup
        const scriptSetupResult = compiler.compileScript(descriptor, {
          id: uuidv4(),
          inlineTemplate: false, // We'll handle the template separately
        });
        
        // Get the content from the compiled result
        scriptContent = scriptSetupResult.content;
      } catch (error: any) {
        throw new Error(`Script setup compilation error: ${error?.message || String(error)}`);
      }
    } else if (descriptor.script) {
      // Extract the script content for normal script tags
      scriptContent = descriptor.script.content;
    }
    
    // Generate the final component code
    const componentId = uuidv4();
    
    // Create a proper ES module that exports the component
    // Replace imports with global variables
    let jsOutput = '';
    
    // Replace Vue imports with global variables
    const processedTemplateCode = templateCode;
    
    // Process script content to use global variables
    const processedScriptContent = scriptContent
      // Remove imports from Vue, Vue Router, and Element Plus
      .replace(/import\s+\{([^}]+)\}\s+from\s+["']vue["'];?/g, '')
      .replace(/import\s+\{([^}]+)\}\s+from\s+["']vue-router["'];?/g, '')
      .replace(/import\s+\{([^}]+)\}\s+from\s+["']element-plus["'];?/g, '')
      // Replace Vue composition API functions with global Vue namespace
      // Note: We keep defineProps and defineEmits as is since they are compiler macro
    
    if (hasScriptSetup) {
      // For script setup, we need to create a component wrapper that preserves the script setup functionality
      // but avoids duplicate export default statements
      
      // Extract the original defineProps from the script content if it exists
      // Handle both formats: defineProps({...}) and const props = defineProps({...})
      let propsDefinition = '';
      
      // First check for TypeScript props
      if (tsPropsMatches.length > 0) {
        // Use the first TypeScript props definition found
        const tsProps = tsPropsMatches[0];
        const propDefs = tsProps.split(',').map(prop => {
          const [name, type] = prop.trim().split(':').map(p => p.trim());
          if (!name || !type) return '';
          
          // Map TypeScript types to Vue prop types
          let propType;
          switch(type.toLowerCase()) {
            case 'string': propType = 'String'; break;
            case 'number': propType = 'Number'; break;
            case 'boolean': propType = 'Boolean'; break;
            case 'object': propType = 'Object'; break;
            case 'array': propType = 'Array'; break;
            case 'date': propType = 'Date'; break;
            case 'function': propType = 'Function'; break;
            default: propType = 'null'; // For complex types we can't easily map
          }
          
          return `${name}: ${propType}`;
        }).filter(Boolean);
        
        propsDefinition = propDefs.join(',\n    ');
      } else {
        // If no TypeScript props, check for regular props
        // First, check for the pattern with const props assignment
        let propsMatch = processedScriptContent.match(/const\s+props\s*=\s*defineProps\(\{([^}]+)\}\)/s);
        
        // If that doesn't match, try matching the direct defineProps call
        if (!propsMatch) {
          propsMatch = preprocessedContent.match(/defineProps\(\{([^}]+)\}\)/s);
        }
        
        if (propsMatch && propsMatch[1]) {
          // Clean up the props definition
          const rawProps = propsMatch[1];
          // Clean up the props definition to ensure proper formatting
          if (rawProps) {
            propsDefinition = rawProps
              .split(',')
              .map(prop => prop.trim())
              .filter(prop => prop.length > 0)
              .join(',\n    ');
          }
        }
      }
      
      // Extract computed properties and other reactive declarations
      const computedPropsMatch = processedScriptContent.match(/const\s+([a-zA-Z0-9_$]+)\s*=\s*computed\s*\(\s*\(\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g) || [];
      
      // Generate setup function content based on extracted computed properties
      let setupFunctionContent = '';
      let returnStatement = 'return { props';
      
      // Add each computed property to the setup function
      computedPropsMatch.forEach(match => {
        const propNameMatch = match.match(/const\s+([a-zA-Z0-9_$]+)\s*=/); 
        if (propNameMatch && propNameMatch[1]) {
          const propName = propNameMatch[1];
          // Clean up the computed property code by replacing regex literals with RegExp constructor
          // and replace computed with Vue.computed
          const cleanedMatch = match
            .replace(/\/\\n\/g/g, "new RegExp('\\\\n', 'g')")
            .replace(/\/\n\/g/g, "new RegExp('\\n', 'g')")
            .replace(/\bcomputed\s*\(/g, "Vue.computed(")
            .replace(/\bref\s*\(/g, "Vue.ref(")
            .replace(/\breactive\s*\(/g, "Vue.reactive(")
            .replace(/\bwatch\s*\(/g, "Vue.watch(")
            .replace(/\bwatchEffect\s*\(/g, "Vue.watchEffect(")
            .replace(/\bonMounted\s*\(/g, "Vue.onMounted(")
            .replace(/\bonUnmounted\s*\(/g, "Vue.onUnmounted(")
            .replace(/\bonUpdated\s*\(/g, "Vue.onUpdated(")
            .replace(/\bonBeforeMount\s*\(/g, "Vue.onBeforeMount(")
            .replace(/\bonBeforeUnmount\s*\(/g, "Vue.onBeforeUnmount(")
            .replace(/\bonBeforeUpdate\s*\(/g, "Vue.onBeforeUpdate(")
            .replace(/\bonErrorCaptured\s*\(/g, "Vue.onErrorCaptured(")
            .replace(/\bonRenderTracked\s*\(/g, "Vue.onRenderTracked(")
            .replace(/\bonRenderTriggered\s*\(/g, "Vue.onRenderTriggered(")
            .replace(/\bonUnmounted\s*\(/g, "Vue.onUnmounted(")
            .replace(/\btoRaw\s*\(/g, "Vue.toRaw(")
            .replace(/\btoRefs\s*\(/g, "Vue.toRefs(")
            .replace(/\btoRef\s*\(/g, "Vue.toRef(")
   
          setupFunctionContent += `\n      ${cleanedMatch}`;
          returnStatement += `, ${propName}`;
        }
      });
      
      returnStatement += ' }';
      
      jsOutput = `
// Generated Vue component for client-side usage
// Vue, Vue Router, and Element Plus are available as global variables
const _defineComponent = Vue.defineComponent;

${processedTemplateCode}

// Create the component definition with the script setup functionality
export default Vue.defineComponent({
  name: 'CompiledComponent_${componentId}',
  render,
  props: {
    ${propsDefinition}
  },
  ${descriptor.styles.some(style => style.scoped) ? `__scopeId: '${scopeId}',` : ''}
  setup(props, ctx) {
    // Include extracted computed properties and other reactive declarations
    ${setupFunctionContent}
    
    ${returnStatement};
  }
});
`;
    } else {
      // For normal script, we need to create the component definition
      jsOutput = `
// Generated Vue component for client-side usage
// Vue, Vue Router, and Element Plus are available as global variables

${processedTemplateCode}

// Original component script content
const script = ${processedScriptContent.replace(/export\s+default\s+/, '')};

// Create the component definition
const component = Vue.defineComponent({
  name: 'CompiledComponent_${componentId}',
  ...script,
  render,
  ${descriptor.styles.some(style => style.scoped) ? `__scopeId: '${scopeId}',` : ''}
});

// Export the component
export default component;
`;
    }
    
    return {
      js: jsOutput,
      css: cssOutput
    };
  } catch (error) {
    // Log and rethrow any errors
    logger.error('Error compiling Vue component:', error);
    throw error;
  }
}
