import { functionTools } from './functionTools';
import { toolsCreateShapes } from './toolsCreateShapes';
import { toolsModifyShapes } from './toolsModifyShapes';
import { toolsCompoundShapes } from './toolsCompoundShapes';
import { toolsLayoutShapes } from './toolsLayoutShapes';
import { toolsInteractions } from './toolsInteractions';
import { toolsFlows } from './toolsFlows';
import { toolsReorderShapes } from './toolsReorderShapes';
import { ragTools } from './ragTools';
import { iconsTool } from './iconsTool';

export const tools = [
  ...functionTools,
  ...toolsCreateShapes,
  ...toolsModifyShapes,
  ...toolsCompoundShapes,
  ...toolsLayoutShapes,
  ...toolsInteractions,
  ...toolsFlows,
  ...toolsReorderShapes,
  ...ragTools,
  ...iconsTool,
];