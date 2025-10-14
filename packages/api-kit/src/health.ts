import { Request, Response, NextFunction } from 'express';  
import { performance } from 'perf_hooks';  

export function healthCheckMiddleware(req: Request, res: Response, next: NextFunction) {  
  if (req.path === '/healthz') {  
    const start = performance.now();  
    res.status(200).json({ status: 'ok', uptime: process.uptime() });  
    const duration = performance.now() - start;  
    console.log(`[HEALTHZ] Response time: ${duration.toFixed(2)}ms`);  
  } else if (req.path === '/readyz') {  
    const start = performance.now();  

    checkDatabase()  
      .then(() => {  
        const duration = performance.now() - start;  
        console.log(`[READYZ] Response time: ${duration.toFixed(2)}ms`);  
        res.status(200).json({ status: 'ready', uptime: process.uptime() });  
      })  
      .catch((err) => {  
        const duration = performance.now() - start;  
        console.error(`[READYZ] DB check failed: ${err.message} | Response time: ${duration.toFixed(2)}ms`);  
        res.status(503).json({ status: 'not ready', error: err.message });  
      });  
  } else {  
    next();  
  }  
}  

async function checkDatabase(): Promise<void> {  
  return;  
}  