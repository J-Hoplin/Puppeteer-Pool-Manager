import { Queue } from '../queue';

describe('Queue function test', () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>();
  });

  describe('enqueue', () => {
    it('should enqueue element', () => {
      const id = queue.enqueue({ element: 1 });
      expect(id).toBeDefined();
      expect(queue.size).toBe(1);
    });

    it('should enqueue with id givwen', () => {
      const customId = '1234';
      const id = queue.enqueue({ element: 1, id: customId });
      expect(id).toBe(customId);
    });
  });

  describe('dequeue', () => {
    it('should be first in firt out', () => {
      queue.enqueue({ element: 1 });
      queue.enqueue({ element: 2 });

      const result = queue.dequeue();
      expect(result.element).toBe(1);
      expect(queue.size).toBe(1);
    });

    it('should return null when queue is empty', () => {
      const result = queue.dequeue();
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove element with id', () => {
      const id1 = queue.enqueue({ element: 1 });
      const id2 = queue.enqueue({ element: 2 });

      queue.remove(id1);
      expect(queue.size).toBe(1);
      expect(queue.contains(id1)).toBe(false);
      expect(queue.contains(id2)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      queue.enqueue({ element: 1 });
      queue.enqueue({ element: 2 });

      queue.clear();
      expect(queue.size).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });
  });

  describe('contains', () => {
    it('should return true if element with id exists', () => {
      const id = queue.enqueue({ element: 1 });
      expect(queue.contains(id)).toBe(true);
    });

    it('should return false if element with id does not exist', () => {
      expect(queue.contains('non-existent-id')).toBe(false);
    });
  });

  describe('values', () => {
    it('should return all elements', () => {
      queue.enqueue({ element: 1 });
      queue.enqueue({ element: 2 });
      console.log('Lint-staged test');
      const values = queue.values();
      expect(values).toHaveLength(2);
      expect(values[0].element).toBe(1);
      expect(values[1].element).toBe(2);
    });
  });
});
