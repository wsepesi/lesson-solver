/**
 * Global Visualization Setup for Scheduling Tests
 * 
 * This module automatically enables visualization for ALL scheduling tests
 * when the VISUALIZE flag is set, without requiring any changes to test files.
 */

import { beforeEach, afterEach } from 'vitest';
import { 
  shouldVisualize, 
  enableVisualizationIfRequested
} from '../visualizer/test-integration';

// Global flag to track if setup has been initialized
let setupInitialized = false;

/**
 * Initialize global visualization setup
 * Call this once to enable automatic visualization for all tests
 */
export function initializeVisualizationSetup(): void {
  if (setupInitialized) {
    return;
  }
  
  setupInitialized = true;
  
  // Enable visualization if requested
  enableVisualizationIfRequested();
  
  if (shouldVisualize()) {
    console.log('🎨 Test visualization enabled - will show scheduling visualizations');
    
    beforeEach((context) => {
      // Extract test information from vitest context
      const testName = context.task?.name || 'Unknown Test';
      const suiteName = context.task?.suite?.name || '';
      const fullTestName = suiteName ? `${suiteName} > ${testName}` : testName;
      
      // Set context for the wrapper (this will be picked up by getCurrentTestName)
      // The wrapper will detect test context from vitest globals
    });
    
    afterEach(() => {
      // Clean up context - handled automatically by wrapper
    });
  }
}

/**
 * Automatically initialize if visualization is enabled
 */
if (shouldVisualize()) {
  initializeVisualizationSetup();
}