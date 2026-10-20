process.env['NODE_ENV'] = 'test';
process.env['MONGO_URI'] ??= 'mongodb://localhost:27017/oj_mentor_test?directConnection=true';
process.env['REDIS_URL'] ??= 'redis://localhost:6379/3';
process.env['JWT_SECRET'] ??= 'test-secret-that-is-long-enough';
process.env['AI_ENABLED'] = 'true';
process.env['AI_API_KEY'] = '';
process.env['AI_DAILY_TOKEN_CAP'] = '4000';
process.env['LOG_LEVEL'] = 'silent';
