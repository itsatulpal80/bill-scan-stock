function timestamp() {
  return new Date().toISOString();
}

export function info(...args) {
  console.log('[INFO]', timestamp(), ...args);
}

export function warn(...args) {
  console.warn('[WARN]', timestamp(), ...args);
}

export function error(...args) {
  console.error('[ERROR]', timestamp(), ...args);
}

// Express middleware to log incoming requests
export function requestLogger(req, res, next) {
  const start = Date.now();
  info('Request', req.method, req.originalUrl);
  res.on('finish', () => {
    const ms = Date.now() - start;
    info('Response', req.method, req.originalUrl, res.statusCode, `${ms}ms`);
  });
  next();
}

export default { info, warn, error, requestLogger };
