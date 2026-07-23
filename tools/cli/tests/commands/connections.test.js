const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('connections command', () => {
  const commandPath = path.join(__dirname, '..', '..', 'commands', 'connections.mjs');
  const controllerPath = path.join(__dirname, '..', '..', 'controllers', 'connections.mjs');

  it('command file should exist and export a default function', () => {
    assert.ok(fs.existsSync(commandPath));
    const content = fs.readFileSync(commandPath, 'utf-8');
    assert.ok(content.includes('export default function'));
  });

  it('command file should register a "status" subcommand', () => {
    const content = fs.readFileSync(commandPath, 'utf-8');
    assert.ok(content.includes("'status'"));
    assert.ok(content.includes('connectionsStatusController'));
  });

  it('controller file should exist and export connectionsStatusController', () => {
    assert.ok(fs.existsSync(controllerPath));
    const content = fs.readFileSync(controllerPath, 'utf-8');
    assert.ok(content.includes('export async function connectionsStatusController'));
  });

  it('controller should use initializeSdk and integrationSources SDK methods', () => {
    const content = fs.readFileSync(controllerPath, 'utf-8');
    assert.ok(content.includes("initializeSdk"));
    assert.ok(content.includes('sdk.integrationSources.getList'));
    assert.ok(content.includes('sdk.integrationSources.checkStatus'));
  });
});
