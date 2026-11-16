import Script from '../models/script';
import logger from '../services/logger';
import {
  compileScript,
  isValidScriptIdentifier,
  normalizeScriptIdentifier,
} from '../services/scripts-compiler.service';

const sanitizeError = (err: any): string => String(err?.message || 'Compilation failed').split('\n')[0].replace(/\/qelos-script\//g, '');

export const createScript = async (req, res) => {
  const identifier = normalizeScriptIdentifier(req.body.identifier);
  if (!isValidScriptIdentifier(identifier) || typeof req.body.content !== 'string') {
    return res.status(400).json({ message: 'invalid script', reason: 'identifier and content are required' }).end();
  }
  let js: string;
  try {
    ({ js } = await compileScript(req.body.content, identifier));
  } catch (err: any) {
    logger.log('failed to compile a script', err?.message);
    return res.status(400).json({ message: 'failed to compile a script', reason: sanitizeError(err) }).end();
  }

  try {
    const script = await new Script({
      identifier,
      description: req.body.description,
      content: req.body.content,
      compiledContent: { js },
      tenant: req.headers.tenant,
    }).save();
    res.json(script).end();
  } catch (err: any) {
    const reason = err?.message?.includes('E11000') ? 'script identifier already exists' : 'unknown error';
    res.status(400).json({ message: 'failed to create a script', reason }).end();
  }
};

export const updateScript = async (req, res) => {
  try {
    const $set: any = { updated: new Date() };
    if (req.body.description) $set.description = req.body.description;
    if (req.body.identifier) {
      $set.identifier = normalizeScriptIdentifier(req.body.identifier);
      if (!isValidScriptIdentifier($set.identifier)) {
        return res.status(400).json({ message: 'invalid script', reason: 'invalid identifier' }).end();
      }
    }
    if (req.body.content) {
      const existing = await Script.findOne({ _id: req.params.scriptId, tenant: req.headers.tenant }).select('identifier').lean().exec();
      if (!existing) return res.status(404).json({ message: 'script not found' }).end();
      try {
        // relative imports resolve against the script's final identifier
        const { js } = await compileScript(req.body.content, $set.identifier || existing.identifier);
        $set.content = req.body.content;
        $set.compiledContent = { js };
      } catch (err: any) {
        logger.log('failed to compile a script during update', err?.message);
        return res.status(400).json({ message: 'failed to compile a script', reason: sanitizeError(err) }).end();
      }
    }
    const script = await Script.findOneAndUpdate(
      { _id: req.params.scriptId, tenant: req.headers.tenant },
      { $set },
      { new: true },
    );
    if (!script) return res.status(404).json({ message: 'script not found' }).end();
    res.json(script).end();
  } catch (err: any) {
    const reason = err?.message?.includes('E11000') ? 'script identifier already exists' : 'unknown error';
    res.status(400).json({ message: 'failed to update a script', reason }).end();
  }
};

export const removeScript = async (req, res) => {
  try {
    const script = await Script.findOneAndDelete({ _id: req.params.scriptId, tenant: req.headers.tenant }).lean().exec();
    res.json(script).end();
  } catch {
    res.status(400).json({ message: 'failed to remove a script' }).end();
  }
};

export const getAllScripts = async (req, res) => {
  try {
    const scripts = await Script.find({ tenant: req.headers.tenant }).select('-compiledContent -content').lean().exec();
    res.json(scripts).end();
  } catch {
    res.status(400).json({ message: 'failed to get all scripts' }).end();
  }
};

export const getSingleScript = async (req, res) => {
  try {
    const script = await Script.findOne({ _id: req.params.scriptId, tenant: req.headers.tenant })
      .select('-compiledContent').lean().exec();
    res.json(script).end();
  } catch {
    res.status(400).json({ message: 'failed to get a script' }).end();
  }
};

/**
 * Serves the compiled module at a stable URL (`/api/static/scripts/<identifier>.js`) so components and other
 * scripts can import it without knowing its version. Freshness is handled with ETag revalidation.
 */
export const getCompiledScript = async (req, res) => {
  const key = String(req.params.scriptKey || '');
  if (!key.endsWith('.js')) {
    return res.status(404).json({ message: 'invalid extension' }).end();
  }
  const identifier = key.slice(0, -3);
  if (!isValidScriptIdentifier(identifier)) {
    return res.status(404).json({ message: 'invalid identifier' }).end();
  }
  try {
    const meta = await Script.findOne({ identifier, tenant: req.headers.tenant }).select('updated').lean().exec();
    if (!meta) return res.status(404).json({ message: 'script not found' }).end();

    const etag = `"${new Date(meta.updated).getTime()}"`;
    res.set({ 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache', ETag: etag });
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    const script = await Script.findOne({ identifier, tenant: req.headers.tenant }).select('compiledContent.js').lean().exec();
    res.send(script?.compiledContent?.js || '').end();
  } catch {
    res.status(400).json({ message: 'failed to get a script' }).end();
  }
};

export type BulkScriptInput = { identifier: string; description?: string; content: string };

export async function upsertScriptsBulk(tenant: string, scripts: BulkScriptInput[]) {
  const existing = await Script.find({ tenant }).select('identifier content').lean().exec();
  const byId = new Map(existing.map(s => [s.identifier, s]));

  const results: Array<{ identifier: string; success: boolean; script?: any; error?: string }> = [];
  for (const item of scripts) {
    const identifier = normalizeScriptIdentifier(item?.identifier);
    if (!isValidScriptIdentifier(identifier) || typeof item.content !== 'string') {
      results.push({ identifier: item?.identifier, success: false, error: 'invalid identifier or content' });
      continue;
    }
    try {
      const current = byId.get(identifier);
      const $set: any = { updated: new Date() };
      if (item.description) $set.description = item.description;
      if (!current || current.content.trim() !== item.content.trim()) {
        const { js } = await compileScript(item.content, identifier);
        $set.content = item.content;
        $set.compiledContent = { js };
      }
      const script = await Script.findOneAndUpdate(
        { identifier, tenant },
        { $set, $setOnInsert: { identifier, tenant } },
        { new: true, upsert: true },
      );
      results.push({ identifier, success: true, script });
    } catch (err: any) {
      results.push({ identifier, success: false, error: sanitizeError(err) });
    }
  }
  const succeeded = results.filter(r => r.success).length;
  return { total: results.length, succeeded, failed: results.length - succeeded, results };
}

export const bulkCreateOrUpdateScripts = async (req, res) => {
  const scripts = req.body.scripts;
  if (!Array.isArray(scripts) || scripts.length === 0) {
    return res.status(400).json({ message: 'scripts array is required' }).end();
  }
  try {
    res.json(await upsertScriptsBulk(req.headers.tenant, scripts)).end();
  } catch (err: any) {
    logger.error('failed to bulk create/update scripts', err?.message);
    res.status(500).json({ message: 'failed to bulk create/update scripts' }).end();
  }
};
