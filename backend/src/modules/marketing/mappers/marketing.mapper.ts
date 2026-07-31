export function mapCmsSection(s: {
  id: string;
  section_key: string;
  section_type: string;
  title: string | null;
  config_json: unknown;
  sort_order: number;
}) {
  return {
    id: s.id,
    key: s.section_key,
    type: s.section_type,
    title: s.title,
    config: s.config_json,
    sortOrder: s.sort_order,
  };
}
