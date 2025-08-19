import Component, { IComponent } from '../models/component';
import logger from '../services/logger';
import { compileVueComponent } from '../services/components-compiler.service';
import { cacheManager } from '../services/cache-manager';

const LONG_TTL = 60 * 60 * 24;

export const createComponent = async (req, res) => {
  let compiledContent;
  try {
     // Compile the Vue component
     compiledContent = await compileVueComponent(req.body.content);
  } catch (err: any | Error) {
    logger.log('failed to compile a component', err?.message);
    res.status(400).json({ message: 'failed to compile a component', reason: err?.message }).end();
    return;
  }

  try {
    const component = new Component({
      identifier: req.body.identifier,
      componentName: req.body.componentName,
      description: req.body.description,
      content: req.body.content,
      compiledContent,
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
  try {
    const $set: Partial<IComponent> = {
      updated: new Date(),
    }
    if (req.body.componentName) $set.componentName = req.body.componentName;
    if (req.body.description) $set.description = req.body.description;
    if (req.body.identifier) $set.identifier = req.body.identifier;
    
    // If content is updated, recompile the component
    if (req.body.content) {
      $set.content = req.body.content;
      $set.compiledContent = await compileVueComponent(req.body.content);
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
    });
    res.json(component).end();
  } catch (err: any) {
    res.status(400).json({ message: 'failed to remove a component' }).end();
  }
};

export const getAllComponents = async (req, res) => {
  try {
    const components = await Component.find({ tenant: req.headers.tenant }).select('-compiledContent -content').exec();
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
