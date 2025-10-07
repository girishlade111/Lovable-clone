import { NextResponse } from 'next/server';
import { Sandbox } from '@e2b/code-interpreter';

declare global {
  var activeSandbox: any;
  var sandboxData: any;
  var existingFiles: Set<string>;
}

export async function GET() {
  try {
    // Check if sandbox exists in memory
    const sandboxExists = !!global.activeSandbox;
    let sandboxHealthy = false;
    let sandboxInfo = null;
    let needsRecreation = false;
    
    if (sandboxExists && global.activeSandbox && global.sandboxData) {
      try {
        // Try to verify the sandbox is still alive by attempting a simple operation
        console.log('[sandbox-status] Testing sandbox health...');
        
        // Test if sandbox responds to a simple command
        const testResult = await global.activeSandbox.runCode('print("health_check_ok")');
        
        if (testResult && testResult.logs && testResult.logs.stdout) {
          const output = testResult.logs.stdout.join('');
          if (output.includes('health_check_ok')) {
            sandboxHealthy = true;
            sandboxInfo = {
              sandboxId: global.sandboxData.sandboxId,
              url: global.sandboxData.url,
              filesTracked: global.existingFiles ? Array.from(global.existingFiles) : [],
              lastHealthCheck: new Date().toISOString()
            };
            console.log('[sandbox-status] Sandbox is healthy');
          } else {
            console.warn('[sandbox-status] Sandbox exists but not responding properly');
            needsRecreation = true;
          }
        } else {
          console.warn('[sandbox-status] Sandbox test failed - no valid response');
          needsRecreation = true;
        }
        
      } catch (error: any) {
        console.error('[sandbox-status] Health check failed:', error.message);
        
        // Check if this is a "sandbox not found" error
        if (error.message && (error.message.includes('not found') || error.message.includes('404') || error.message.includes('sandbox') && error.message.includes('found'))) {
          console.log('[sandbox-status] Sandbox no longer exists, needs recreation');
          needsRecreation = true;
          
          // Clean up stale global state
          global.activeSandbox = null;
          global.sandboxData = null;
          if (global.existingFiles) {
            global.existingFiles.clear();
          }
        } else {
          // Other errors might be temporary
          sandboxHealthy = false;
        }
      }
    } else if (global.sandboxData && global.sandboxData.sandboxId && !global.activeSandbox) {
      // We have sandbox data but no active connection - try to reconnect
      console.log(`[sandbox-status] Attempting to reconnect to sandbox ${global.sandboxData.sandboxId}`);
      try {
        const reconnectedSandbox = await Sandbox.connect(global.sandboxData.sandboxId, { 
          apiKey: process.env.E2B_API_KEY 
        });
        
        // Test the reconnected sandbox
        const testResult = await reconnectedSandbox.runCode('print("reconnect_success")');
        if (testResult && testResult.logs && testResult.logs.stdout) {
          const output = testResult.logs.stdout.join('');
          if (output.includes('reconnect_success')) {
            console.log('[sandbox-status] Successfully reconnected to existing sandbox');
            global.activeSandbox = reconnectedSandbox;
            sandboxHealthy = true;
            sandboxInfo = {
              sandboxId: global.sandboxData.sandboxId,
              url: global.sandboxData.url,
              filesTracked: global.existingFiles ? Array.from(global.existingFiles) : [],
              lastHealthCheck: new Date().toISOString(),
              reconnected: true
            };
          } else {
            needsRecreation = true;
          }
        } else {
          needsRecreation = true;
        }
      } catch (reconnectError: any) {
        console.error('[sandbox-status] Reconnection failed:', reconnectError.message);
        if (reconnectError.message && reconnectError.message.includes('not found')) {
          needsRecreation = true;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      active: sandboxHealthy,
      healthy: sandboxHealthy,
      needsRecreation,
      sandboxData: sandboxInfo,
      message: sandboxHealthy 
        ? 'Sandbox is active and healthy' 
        : needsRecreation
          ? 'Sandbox not found - needs recreation'
          : sandboxExists 
            ? 'Sandbox exists but is not responding' 
            : 'No active sandbox'
    });
    
  } catch (error) {
    console.error('[sandbox-status] Error:', error);
    return NextResponse.json({ 
      success: false,
      active: false,
      needsRecreation: true,
      error: (error as Error).message 
    }, { status: 500 });
  }
}