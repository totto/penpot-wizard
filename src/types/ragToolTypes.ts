export interface RagSearchResult {
  id: string | number;
  heading: string;
  summary: string;
  text: string;
  url: string;
  sourcePath: string;
  breadcrumbs: string[];
  score: number;
  hasCode: boolean;
  codeLangs: string[];
}