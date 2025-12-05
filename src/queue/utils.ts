import { randomUUID } from 'node:crypto';

export const generateId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
};
