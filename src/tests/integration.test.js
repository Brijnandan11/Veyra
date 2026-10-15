import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.js';

const port = 4357;
const baseUrl = `http://localhost:${port}`;
let server;

const uniqueEmail = () => `integration-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

test.before(async () => {
  server = app.listen(port);
  await new Promise((resolve) => {
    server.once('listening', resolve);
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test('auth and monitor lifecycle works end-to-end', async () => {
  const email = uniqueEmail();

  const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Tester',
      email,
      password: 'Password123!'
    })
  });

  assert.equal(registerResponse.status, 201, 'register should create a user');
  const registerBody = await registerResponse.json();
  assert.ok(registerBody.data?.id, 'register response should include created user data');

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'Password123!'
    })
  });

  assert.equal(loginResponse.status, 200, 'login should return a JWT');
  const loginBody = await loginResponse.json();
  const token = loginBody.data?.token;
  assert.ok(token, 'login response should include a JWT token');

  const createMonitorResponse = await fetch(`${baseUrl}/api/v1/monitors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Integration API',
      url: 'https://example.com/health',
      interval: 60,
      active: true,
      is_public: false
    })
  });

  assert.equal(createMonitorResponse.status, 201, 'monitor creation should succeed for authenticated users');
  const monitorBody = await createMonitorResponse.json();
  const monitorId = monitorBody.data?.id;
  assert.ok(monitorId, 'monitor creation response should include the new monitor');

  const checksResponse = await fetch(`${baseUrl}/api/v1/monitors/${monitorId}/checks`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  assert.equal(checksResponse.status, 200, 'monitor checks should be readable for authenticated users');
  const checksBody = await checksResponse.json();
  assert.ok(Array.isArray(checksBody.data), 'check endpoint should return an array');
});
