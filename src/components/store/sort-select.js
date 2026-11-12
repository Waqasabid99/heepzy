"use client";

/** Submits its parent GET form on change (the form's Apply button covers no-JS). */
export function SortSelect({ defaultValue }) {
  return (
    <select
      id="sort"
      name="sort"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="min-h-11 rounded-full border border-line bg-surface pr-10 pl-4 text-[13px] font-semibold"
    >
      <option value="featured">Featured</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
    </select>
  );
}
