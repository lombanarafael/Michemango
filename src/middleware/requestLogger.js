const { randomUUID } = require("crypto");

function requestLogger(req, res, next) {
  const id = randomUUID();
  const startedAt = Date.now();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);

  res.on("finish", () => {
    console.info(JSON.stringify({
      requestId: id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });

  next();
}

module.exports = requestLogger;
