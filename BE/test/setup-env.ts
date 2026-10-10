import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.DB_CONFIG_HOST = 'localhost';
process.env.DB_CONFIG_PORT = '5432';
process.env.DB_CONFIG_USERNAME = 'test';
process.env.DB_CONFIG_PASSWORD = 'test-only-not-a-real-password';
process.env.DB_CONFIG_DATABASE = 'community_events_board_test';
process.env.DB_CONFIG_SSL = 'false';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.SWAGGER = 'false';
process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters';
