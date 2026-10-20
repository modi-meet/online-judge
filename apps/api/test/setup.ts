process.env['NODE_ENV'] = 'test';
process.env['MONGO_URI'] ??= 'mongodb://localhost:27017/oj_test';
process.env['REDIS_URL'] ??= 'redis://localhost:6379/1';
process.env['JWT_SECRET'] ??= 'test-secret-that-is-long-enough';
process.env['ALLOW_HOST_EXECUTOR'] = 'true';
process.env['LOG_LEVEL'] = 'silent';
