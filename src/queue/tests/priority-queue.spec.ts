import { PriorityQueue } from '../queue.priority';

describe('PriorityQueue function test', () => {
  let queue: PriorityQueue<number>;

  beforeEach(() => {
    queue = new PriorityQueue<number>();
  });

  describe('enqueue', () => {
    it('should add elements with priority', () => {
      const id1 = queue.enqueue({ element: 1, priority: 2 });
      const id2 = queue.enqueue({ element: 2, priority: 1 });

      expect(queue.size).toBe(2);
      expect(queue.contains(id1)).toBe(true);
      expect(queue.contains(id2)).toBe(true);
    });

    it('should maintain priority order', () => {
      queue.enqueue({ element: 1, priority: 2 });
      queue.enqueue({ element: 2, priority: 3 });
      queue.enqueue({ element: 3, priority: 4 });
      queue.enqueue({ element: 4, priority: 1 });

      const first = queue.dequeue();
      const second = queue.dequeue();
      const third = queue.dequeue();
      const fourth = queue.dequeue();

      expect(first.element).toBe(3);
      expect(second.element).toBe(2);
      expect(third.element).toBe(1);
      expect(fourth.element).toBe(4);
    });

    it('should use default priority of 1 when not specified', () => {
      const id = queue.enqueue({ element: 1 });
      const element = queue.dequeue();
      expect(element.priority).toBe(1);
    });
  });

  describe('dequeue', () => {
    it('should return highest priority element first', () => {
      queue.enqueue({ element: 1, priority: 1 });
      queue.enqueue({ element: 2, priority: 3 });
      queue.enqueue({ element: 3, priority: 2 });

      const result = queue.dequeue();
      expect(result.element).toBe(2);
      expect(queue.size).toBe(2);
    });

    it('should return null when queue is empty', () => {
      const result = queue.dequeue();
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove element with id', () => {
      const id1 = queue.enqueue({ element: 1, priority: 1 });
      const id2 = queue.enqueue({ element: 2, priority: 2 });

      queue.remove(id1);
      expect(queue.size).toBe(1);
      expect(queue.contains(id1)).toBe(false);
      expect(queue.contains(id2)).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      queue.enqueue({ element: 1, priority: 1 });
      queue.enqueue({ element: 2, priority: 2 });

      queue.clear();
      expect(queue.size).toBe(0);
      expect(queue.isEmpty).toBe(true);
    });
  });

  describe('values', () => {
    it('should return all elements with priority order', () => {
      queue.enqueue({ element: 1, priority: 1 });
      queue.enqueue({ element: 2, priority: 3 });
      queue.enqueue({ element: 3, priority: 2 });

      const values = queue.values();
      expect(values).toHaveLength(3);
      expect(values[0].element).toBe(2);
      expect(values[1].element).toBe(3);
      expect(values[2].element).toBe(1);
    });
  });
});
