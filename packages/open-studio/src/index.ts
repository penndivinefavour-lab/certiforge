// Open Studio Package - Client-side certificate generation
export { openStudioDB } from './db';
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
