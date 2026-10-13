import type { Project, Customer, Funnel } from "../domain/types";
import { presets, type ExplorerFilters } from "../domain/explorer";

export function ContextFields({ model }: { model: {
  projects: readonly Project[]; customers: readonly Customer[]; configuredFunnels: readonly Funnel[]; filters: ExplorerFilters;
} }) {
  const { filters } = model;
  return <>
    <label>Project<select name="project" defaultValue={filters.project}>{model.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Date range<select name="range" defaultValue={filters.range}>{presets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>Customer<select name="customer" defaultValue={filters.customer}><option value="">All demo customers</option>{model.customers.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
    <label>Funnel<select name="funnel" defaultValue={filters.funnel}>{model.configuredFunnels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
  </>;
}
