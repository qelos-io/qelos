import Component, { IComponent } from '../models/component';
import logger from '../services/logger';
import { compileVueComponent } from '../services/components-compiler.service';
import { cacheManager } from '../services/cache-manager';

const LONG_TTL = 60 * 60 * 24;

/**
 * Sanitizes compilation errors to extract only relevant error information
 * without exposing internal server paths or sensitive data
 */
const sanitizeCompilationError = (error: any): string => {
  const stderr = error?.stderr || error?.message || '';
  
  // Extract the Vue/Vite compilation error message
  // Pattern: [vite:vue] [vue/compiler-sfc] Error message
  const errorMatch = stderr.match(/\[vite:vue\]\s*\[[@\w\/\-]+\]\s*(.+?)(?=\n|$)/);
  let errorMessage = errorMatch ? errorMatch[1].trim() : 'Compilation failed';
  
  // Extract the code snippet with line numbers
  const codeLines: string[] = [];
  const lines = stderr.split('\n');
  
  let inCodeBlock = false;
  for (const line of lines) {
    // Match lines like "68 |  const props = defineProps();" or "   |        ^"
    if (/^\s*\d+\s*\|/.test(line)) {
      inCodeBlock = true;
      codeLines.push(line);
    } else if (inCodeBlock && /^\s*\|/.test(line)) {
      codeLines.push(line);
    } else if (inCodeBlock && line.trim() !== '' && !line.includes('file:')) {
      // Stop when we hit a non-empty line that's not part of the code block
      break;
    }
  }
  
  // Combine error message with code snippet
  if (codeLines.length > 0) {
    return `${errorMessage}\n\n${codeLines.join('\n')}`;
  }
  
  return errorMessage;
};

export const createComponent = async (req, res) => {
  let js, css, props;
  try {
     // Compile the Vue component
    ({ js, css, props } = await compileVueComponent(req.body.content, req.headers.tenanthost));
  } catch (err: any | Error) {
    logger.log('failed to compile a component', err?.message);
    const sanitizedError = sanitizeCompilationError(err);
    res.status(400).json({ message: 'failed to compile a component', reason: sanitizedError }).end();
    return;
  }

  try {
    const component = new Component({
      identifier: req.body.identifier,
      componentName: req.body.componentName,
      description: req.body.description,
      content: req.body.content,
      requiredProps: props,
      compiledContent: { js, css },
      tenant: req.headers.tenant,
    });

    await component.save();
    res.json(component).end();
  } catch (err: any) {
    const reason = err?.message?.includes('E11000') ? 'component identifier already exists' : 'unknown error';
    res.status(400).json({ message: 'failed to create a component', reason }).end();
  }
};

export const updateComponent = async (req, res) => {
  const componentQuery = { _id: req.params.componentId, tenant: req.headers.tenant };
  try {
    const $set: Partial<IComponent> = {
      updated: new Date(),
    }
    if (req.body.componentName) $set.componentName = req.body.componentName;
    if (req.body.description) $set.description = req.body.description;
    if (req.body.identifier) $set.identifier = req.body.identifier;
    
    // If content is updated, recompile the component
    if (req.body.content) {
      const existingComponent = await Component.findOne(componentQuery).select('content').lean().exec();
      if (!existingComponent) {
        return res.status(404).json({message: 'component not found'}).end();
      }
      if (req.body.content.trim() !== existingComponent.content.trim()) {
        $set.content = req.body.content;
        try {
          const { js, css, props } = await compileVueComponent(req.body.content, req.headers.tenanthost);
          $set.compiledContent = { js, css };
          $set.requiredProps = props;
        } catch (compileErr: any) {
          logger.log('failed to compile a component during update', compileErr?.message);
          const sanitizedError = sanitizeCompilationError(compileErr);
          res.status(400).json({ message: 'failed to compile a component', reason: sanitizedError }).end();
          return;
        }
      }
    }

    const component = await Component.findOneAndUpdate(
      { _id: req.params.componentId, tenant: req.headers.tenant },
      { $set },
      { new: true }
    );
    res.json(component).end();
  } catch (err: any) {
    const reason = err?.message?.includes('E11000') ? 'component identifier already exists' : 'unknown error';
    res.status(400).json({ message: 'failed to update a component', reason }).end();
  }
};

export const removeComponent = async (req, res) => {
  try {
    const component = await Component.findOneAndDelete({
      _id: req.params.componentId,
      tenant: req.headers.tenant,
    }).lean().exec();
    res.json(component).end();
  } catch (err: any) {
    res.status(400).json({ message: 'failed to remove a component' }).end();
  }
};

export const getAllComponents = async (req, res) => {
  try {
    const components = await Component.find({ tenant: req.headers.tenant }).select('-compiledContent -content').lean().exec();
    res.json(components).end();
  } catch (err: any) {
    res.status(400).json({ message: 'failed to get all components' }).end();
  }
};

export const getSingleComponent = async (req, res) => {
  try {
    const component = await Component.findOne({
      _id: req.params.componentId,
      tenant: req.headers.tenant,
    }).select('-compiledContent').lean().exec();
    res.json(component).end();
  } catch (err: any) {
    res.status(400).json({ message: 'failed to get a component' }).end();
  }
};

export const getCompiledComponent = async (req, res) => {
  const [identifier, updated, extension] = req.params.componentKey.split('.');
  try {
    if (extension !== 'js' && extension !== 'css') {
      res.status(404).json({ message: 'invalid extension' }).end();
      return;
    }
    const contentType = extension === 'js' ? 'application/javascript' : 'text/css';
    const cachedComponent = await cacheManager.getItem(`component:${req.headers.tenant}:${identifier}:${updated}:${extension}`)
    if (cachedComponent) {
      res
        .set('Content-Type', contentType)
        .send(cachedComponent)
        .end();
      return;
    }
    const component = await Component.findOne({
      identifier,
      tenant: req.headers.tenant,
    }).select('compiledContent.' + extension).lean().exec();

    if (!component) {
      res.status(404).json({ message: 'component not found' }).end();
      return;
    }
    const value = component?.compiledContent[extension] || '';
    cacheManager.setItem(`component:${req.headers.tenant}:${identifier}:${updated}:${extension}`, value, { ttl: LONG_TTL }).catch();
    
    res
      .set('Content-Type', contentType)
      .send(value)
      .end();
  } catch (err: any) {
    res.status(400).json({ message: 'failed to get a component' }).end();
  }
};

export const getComponentsList = async (req, res) => {
  try {
    const components = await Component.find({ tenant: req.headers.tenant }).select('identifier updated componentName').lean().exec();
    res.json({
      components: components.map(component => ({
        componentName: component.componentName,
        js: `/api/static/${component.identifier}.${Number(component.updated).toString()}.js`,
        css: `/api/static/${component.identifier}.${Number(component.updated).toString()}.css`,
      }))
    }).end();
  } catch (err: any) {
    res.status(400).json({ message: 'failed to get components lazy loader' }).end();
  }
};
