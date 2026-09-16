import { paginate } from './pagination.dto';

describe('paginate', () => {
  it('computes totalPages with ceil', () => {
    const result = paginate([1, 2, 3], 10, 1, 3);
    expect(result.totalPages).toBe(4);
    expect(result).toEqual({ items: [1, 2, 3], page: 1, pageSize: 3, total: 10, totalPages: 4 });
  });

  it('handles exact division', () => {
    expect(paginate([], 20, 2, 10).totalPages).toBe(2);
    expect(paginate([], 0, 1, 20).totalPages).toBe(0);
  });

  it('preserves items and meta', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const r = paginate(items, 2, 1, 20);
    expect(r.items).toBe(items);
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
  });

  it('handles single page', () => {
    const r = paginate([1], 1, 1, 20);
    expect(r.totalPages).toBe(1);
  });

  it('handles large pageSize', () => {
    const r = paginate([], 5, 1, 100);
    expect(r.totalPages).toBe(1);
  });
});
