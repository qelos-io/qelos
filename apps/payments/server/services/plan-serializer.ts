function toPlainPlan(plan: any) {
  if (typeof plan?.toObject === 'function') {
    return plan.toObject();
  }
  if (typeof plan?.toJSON === 'function') {
    return plan.toJSON();
  }
  return plan;
}

export function sanitizePlan(plan: any) {
  if (!plan) {
    return plan;
  }

  const { __v, ...rest } = toPlainPlan(plan);
  return rest;
}

export function sanitizePlans(plans: any[]) {
  return plans.map((plan) => sanitizePlan(plan));
}
