/**
 * Agents barrel - groups all agent definitions.
 * Structure similar to tools.js.
 */
import { penpotWizardAgent } from './penpotWizardAgent';
import { designerAgent } from './designerAgent';
import { plannerAgent } from './plannerAgent';
import { drawerAgent } from './drawerAgent';
import { componentBuilderAgent } from './componentBuilderAgent';
import { prototyperAgent } from './prototyperAgent';
import { illustratorAgent } from './illustratorAgent';
import { modifierAgent } from './modifierAgent';
import { directorAgents as oldDirectorAgents } from '@/assets/directorAgents';
import { specializedAgents } from '@/assets/specializedAgents';
import { coordinatorAgents } from '@/assets/coordinatorAgents';

// Directors (entry points)
export const directorAgents = [penpotWizardAgent, ...oldDirectorAgents];

// Capability agents (Designer, Planner, Drawer) + legacy
export const capabilityAgents = [designerAgent, plannerAgent, componentBuilderAgent, drawerAgent, prototyperAgent, illustratorAgent, modifierAgent, ...specializedAgents, ...coordinatorAgents];
