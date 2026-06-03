#!/usr/bin/env node
/**
 * Load test: opens N concurrent WebSocket connections and sends create_room on each.
 * Verifies that all rooms are registered without timeouts.
 *
 * Usage:
 *   node load-test.js [rooms] [url]
 *   node load-test.js 50 ws://localhost:8080
 *
 * Results are written to LOAD-TEST-RESULTS.md
 */

import WebSocket from 'ws';

const ROOMS = parseInt(process.argv[2] ?? '50', 10);
const URL = process.argv[3] ?? 'ws://localhost:8080';
const TIMEOUT_MS = 5000;

async function runLoadTest() {
  console.log(`Load test: ${ROOMS} concurrent rooms on ${URL}`);
  const start = Date.now();
  const results = [];
  const errors = [];

  const tasks = Array.from({ length: ROOMS }, (_, i) =>
    new Promise((resolve) => {
      const ws = new WebSocket(URL);
      const timer = setTimeout(() => {
        ws.terminate();
        errors.push(`Room ${i}: timeout after ${TIMEOUT_MS}ms`);
        resolve(null);
      }, TIMEOUT_MS);

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'create_room' }));
      });

      ws.on('message', (data) => {
        clearTimeout(timer);
        const msg = JSON.parse(data.toString());
        if (msg.type === 'room_created') {
          results.push(msg.room);
        } else {
          errors.push(`Room ${i}: unexpected message ${msg.type}`);
        }
        ws.close();
        resolve(msg.room);
      });

      ws.on('error', (err) => {
        clearTimeout(timer);
        errors.push(`Room ${i}: error: ${err.message}`);
        resolve(null);
      });
    })
  );

  await Promise.all(tasks);
  const duration = Date.now() - start;

  const uniqueRooms = new Set(results);
  const report = [
    '# Load Test Results',
    '',
    `**Date**: ${new Date().toISOString()}`,
    `**URL**: ${URL}`,
    `**Requested rooms**: ${ROOMS}`,
    `**Successfully registered**: ${results.length}`,
    `**Unique room codes**: ${uniqueRooms.size}`,
    `**Errors/timeouts**: ${errors.length}`,
    `**Total duration**: ${duration}ms`,
    '',
    errors.length > 0 ? '## Errors\n\n' + errors.map(e => `- ${e}`).join('\n') : '## Errors\n\nNone.',
    '',
    '## Summary',
    '',
    results.length === ROOMS && errors.length === 0
      ? `✅ All ${ROOMS} rooms registered successfully in ${duration}ms. No timeouts.`
      : `⚠️ ${errors.length} failures out of ${ROOMS} rooms. Check server capacity.`,
  ].join('\n');

  console.log(report);

  const fs = await import('fs');
  fs.writeFileSync('LOAD-TEST-RESULTS.md', report);
  console.log('\nResults written to LOAD-TEST-RESULTS.md');

  process.exit(errors.length > 0 ? 1 : 0);
}

runLoadTest().catch(console.error);
