import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.mjs';

const PRICING_PLAN_FILE_EXTENSION = '.pricing-plan.json';

function slugify(value = '') {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

function buildFileName(plan, index, usedNames) {
  const base =
    slugify(plan?.name) ||
    (plan?._id ? slugify(plan._id) : '') ||
    `pricing-plan-${index + 1}`;

  let fileName = base;
  while (usedNames.has(fileName)) {
    fileName = `${base}-${usedNames.size + 1}`;
  }
  usedNames.add(fileName);
  return `${fileName}${PRICING_PLAN_FILE_EXTENSION}`;
}

function sanitizePlanForFile(plan) {
  const { tenant: _tenant, created: _created, ...rest } = plan;
  return rest;
}

export async function pullPricingPlans(sdk, targetPath) {
  ensureDirectory(targetPath);

  let plans = [];
  try {
    plans = await sdk.managePayments.getPlans();
  } catch (error) {
    logger.error('Failed to fetch pricing plans', error);
    throw error;
  }

  if (!Array.isArray(plans) || plans.length === 0) {
    logger.warning('No pricing plans found to pull');
    return;
  }

  logger.info(`Found ${plans.length} pricing plan(s) to pull`);
  const usedNames = new Set();

  for (const planSummary of plans) {
    let plan;
    try {
      plan = await sdk.managePayments.getPlan(planSummary._id);
    } catch (error) {
      logger.error(`Failed to fetch pricing plan: ${planSummary.name || planSummary._id}`, error);
      throw error;
    }

    const fileName = buildFileName(plan, plans.indexOf(planSummary), usedNames);
    const filePath = path.join(targetPath, fileName);
    fs.writeFileSync(filePath, JSON.stringify(sanitizePlanForFile(plan), null, 2), 'utf-8');
    logger.step(`Pulled pricing plan: ${plan.name || plan._id}`);
  }

  logger.info(`Pulled ${plans.length} pricing plan(s)`);
}

export async function pushPricingPlans(sdk, dirPath, options = {}) {
  const { targetFile } = options;
  const directoryFiles = fs.readdirSync(dirPath);
  const files = targetFile ? [targetFile] : directoryFiles;
  const planFiles = files.filter((file) => file.endsWith(PRICING_PLAN_FILE_EXTENSION));

  if (planFiles.length === 0) {
    if (targetFile) {
      logger.warning(
        `File ${targetFile} is not a ${PRICING_PLAN_FILE_EXTENSION} pricing plan file. Skipping.`
      );
    } else {
      logger.warning(
        `No pricing plan files (*${PRICING_PLAN_FILE_EXTENSION}) found in ${dirPath}`
      );
    }
    return;
  }

  logger.info(`Found ${planFiles.length} pricing plan(s) to push`);

  const results = await Promise.allSettled(
    planFiles.map(async (file) => {
      const filePath = path.join(dirPath, file);
      const planData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      if (!planData?.name) {
        throw new Error(`Pricing plan file ${file} must include a name`);
      }

      const { _id, tenant: _tenant, created: _created, ...payload } = planData;

      logger.step(`Pushing pricing plan: ${planData.name}`);

      if (_id) {
        await sdk.managePayments.updatePlan(_id, payload);
        logger.success(`Updated pricing plan: ${planData.name}`);
      } else {
        await sdk.managePayments.createPlan(payload);
        logger.success(`Created pricing plan: ${planData.name}`);
      }
    })
  );

  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length) {
    logger.error(`\n${failures.length} pricing plan(s) failed to push:`);
    failures.forEach((failure) => {
      logger.error(`  • ${failure.reason?.message || 'Unknown error'}`);
    });
    throw new Error(`Failed to push ${failures.length} pricing plan(s)`);
  }

  logger.info(`Pushed ${planFiles.length} pricing plan(s)`);
}
