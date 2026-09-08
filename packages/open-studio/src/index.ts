// Open Studio Package - Client-side certificate generation
import { openStudioDB } from './db';

// Default export for dynamic imports
export default openStudioDB;

// Named exports
export { openStudioDB };
export type {
  OpenStudioProject,
  OpenStudioTemplate,
  OpenStudioRecipient,
  OpenStudioCertificate,
  OpenStudioWorkspace,
  OpenStudioGenerationJob,
} from './types';

// Re-export helpers for convenience
export { getCurrentWorkspace } from './db';
export { createProject, getProjects } from './db';
