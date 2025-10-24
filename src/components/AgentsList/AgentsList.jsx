import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useStore } from "@nanostores/react";
import {
  $directorAgentsData,
  $activeDirectorAgent,
  setActiveDirectorAgent,
} from "@/stores/directorAgentsStore";
import { $specializedAgentsData } from "@/stores/specializedAgentsStore";
import styles from "./AgentsList.module.css";

function AgentsList() {
  const directorAgentsData = useStore($directorAgentsData);
  const specializedAgentsData = useStore($specializedAgentsData);
  const activeDirectorAgent = useStore($activeDirectorAgent);

  // Combine director and specialized agents for display
  const agentsData = [
    ...directorAgentsData.map((agent) => ({ ...agent, type: "director" })),
    ...specializedAgentsData.map((agent) => ({
      ...agent,
      type: "specialized",
    })),
  ];

  const [expandedAgents, setExpandedAgents] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [newAgent, setNewAgent] = useState({
    name: "",
    technical_name: "",
    description: "",
    prompt: "",
    linked_tools: [],
    linked_agents: [],
  });

  // Entry Agent selection state
  const [selectedEntryAgent, setSelectedEntryAgent] = useState(
    activeDirectorAgent || ""
  );

  // Mock tools data for selection - in real implementation this would come from tools store
  const availableTools = [
    { id: "draw_rectangle", name: "Draw Rectangle" },
    { id: "get_user_data", name: "Get User Data" },
    { id: "custom_circle", name: "Custom Circle Tool" },
  ];

  // Mock agents data for selection - in real implementation this would come from agents store
  const availableAgents = [
    { id: "penpot-wizard", name: "Penpot Wizard" },
    { id: "ui-design-specialist", name: "UI Design Specialist" },
    { id: "penpot-drawing-specialist", name: "Penpot Drawing Specialist" },
  ];

  const toggleAgent = (agentId) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  const handleCreateAgent = () => {
    if (
      newAgent.name &&
      newAgent.technical_name &&
      newAgent.description &&
      newAgent.prompt
    ) {
      const agent = {
        id: Date.now().toString(),
        ...newAgent,
        type: "user",
      };
      // In real implementation, this would update the store
      console.log("Creating agent:", agent);
      setNewAgent({
        name: "",
        technical_name: "",
        description: "",
        prompt: "",
        linked_tools: [],
        linked_agents: [],
      });
      setShowCreateForm(false);
    }
  };

  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    setNewAgent({
      name: agent.name,
      technical_name: agent.technical_name || agent.id,
      description: agent.description,
      prompt: agent.system || "",
      linked_tools: agent.toolIds || [],
      linked_agents: agent.specializedAgentIds || [],
    });
    setShowCreateForm(true);
  };

  const handleUpdateAgent = () => {
    if (
      newAgent.name &&
      newAgent.technical_name &&
      newAgent.description &&
      newAgent.prompt
    ) {
      // In real implementation, this would update the store
      console.log("Updating agent:", editingAgent.id, newAgent);
      setNewAgent({
        name: "",
        technical_name: "",
        description: "",
        prompt: "",
        linked_tools: [],
        linked_agents: [],
      });
      setEditingAgent(null);
      setShowCreateForm(false);
    }
  };

  const handleDeleteAgent = (agentId) => {
    if (window.confirm("Are you sure you want to delete this agent?")) {
      // In real implementation, this would update the store
      console.log("Deleting agent:", agentId);
    }
  };

  const handleCancelEdit = () => {
    setNewAgent({
      name: "",
      technical_name: "",
      description: "",
      prompt: "",
      linked_tools: [],
      linked_agents: [],
    });
    setEditingAgent(null);
    setShowCreateForm(false);
  };

  const handleInputChange = (field, value) => {
    setNewAgent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToolToggle = (toolId) => {
    setNewAgent((prev) => ({
      ...prev,
      linked_tools: prev.linked_tools.includes(toolId)
        ? prev.linked_tools.filter((id) => id !== toolId)
        : [...prev.linked_tools, toolId],
    }));
  };

  const handleAgentToggle = (agentId) => {
    setNewAgent((prev) => ({
      ...prev,
      linked_agents: prev.linked_agents.includes(agentId)
        ? prev.linked_agents.filter((id) => id !== agentId)
        : [...prev.linked_agents, agentId],
    }));
  };

  const handleEntryAgentChange = (agentId) => {
    setSelectedEntryAgent(agentId);
    setActiveDirectorAgent(agentId);
  };

  return (
    <div className={styles.agentsContainer}>
      {/* Create Agent Button */}
      <div className={styles.createAgentSection}>
        <button
          className={styles.createAgentButton}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <PlusIcon className={styles.plusIcon} />
          Create New Agent
        </button>
      </div>

      {/* Entry Agent Selection */}
      <div className={styles.compactSection}>
        <div className={styles.formGroup}>
          <label htmlFor="entry-agent" className={styles.label}>
            Entry Agent <span className={styles.required}>*</span>
          </label>
          <select
            id="entry-agent"
            value={selectedEntryAgent}
            onChange={(e) => handleEntryAgentChange(e.target.value)}
            className={styles.select}
          >
            <option value="">Select an agent...</option>
            {agentsData.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create/Edit Agent Form */}
      {showCreateForm && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {editingAgent ? "Edit Agent" : "Create New Agent"}
          </h3>
          <p className={styles.sectionDescription}>
            {editingAgent
              ? "Modify the agent properties, prompt, and linked resources."
              : "Define a new agent with its properties, prompt, and linked tools/agents."}
          </p>

          <div className={styles.formGroup}>
            <label htmlFor="agent-name" className={styles.label}>
              Agent Name <span className={styles.required}>*</span>
            </label>
            <input
              id="agent-name"
              type="text"
              value={newAgent.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={styles.input}
              placeholder="e.g., Design Assistant"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="agent-technical-name" className={styles.label}>
              Technical Name <span className={styles.required}>*</span>
            </label>
            <input
              id="agent-technical-name"
              type="text"
              value={newAgent.technical_name}
              onChange={(e) =>
                handleInputChange("technical_name", e.target.value)
              }
              className={styles.input}
              placeholder="e.g., design_assistant"
            />
            <small className={styles.helpText}>
              Used internally by the system (lowercase, underscores)
            </small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="agent-description" className={styles.label}>
              Description <span className={styles.required}>*</span>
            </label>
            <textarea
              id="agent-description"
              value={newAgent.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className={styles.textarea}
              placeholder="Describe what this agent does..."
              rows={3}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="agent-prompt" className={styles.label}>
              System Prompt <span className={styles.required}>*</span>
            </label>
            <textarea
              id="agent-prompt"
              value={newAgent.prompt}
              onChange={(e) => handleInputChange("prompt", e.target.value)}
              className={styles.codeTextarea}
              placeholder="Enter the system prompt for this agent..."
              rows={6}
            />
            <small className={styles.helpText}>
              System prompt that defines the agent's behavior and personality
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Linked Tools</label>
            <div className={styles.selectionGrid}>
              {availableTools.map((tool) => (
                <label key={tool.id} className={styles.selectionItem}>
                  <input
                    type="checkbox"
                    checked={newAgent.linked_tools.includes(tool.id)}
                    onChange={() => handleToolToggle(tool.id)}
                    className={styles.checkbox}
                  />
                  <span className={styles.selectionLabel}>{tool.name}</span>
                </label>
              ))}
            </div>
            <small className={styles.helpText}>
              Select which tools this agent can use
            </small>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Linked Agents</label>
            <div className={styles.selectionGrid}>
              {availableAgents.map((agent) => (
                <label key={agent.id} className={styles.selectionItem}>
                  <input
                    type="checkbox"
                    checked={newAgent.linked_agents.includes(agent.id)}
                    onChange={() => handleAgentToggle(agent.id)}
                    className={styles.checkbox}
                  />
                  <span className={styles.selectionLabel}>{agent.name}</span>
                </label>
              ))}
            </div>
            <small className={styles.helpText}>
              Select which agents this agent can delegate tasks to
            </small>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={editingAgent ? handleUpdateAgent : handleCreateAgent}
                className={styles.createButton}
                disabled={
                  !newAgent.name ||
                  !newAgent.technical_name ||
                  !newAgent.description ||
                  !newAgent.prompt
                }
              >
                {editingAgent ? "Update Agent" : "Create Agent"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Available Agents</h3>
        <p className={styles.sectionDescription}>
          Manage and view all available agents in the system.
        </p>

        {agentsData.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              No agents created yet. Create your first agent to get started.
            </p>
          </div>
        ) : (
          <div className={styles.agentsList}>
            {agentsData.map((agent) => (
              <div key={agent.id} className={styles.agentItem}>
                <div className={styles.agentHeader}>
                  <button
                    className={styles.agentHeaderButton}
                    onClick={() => toggleAgent(agent.id)}
                  >
                    <div className={styles.agentInfo}>
                      <div className={styles.agentNameRow}>
                        <h4 className={styles.agentName}>{agent.name}</h4>
                        <span
                          className={`${styles.agentType} ${
                            styles[agent.type || "system"]
                          }`}
                        >
                          {agent.type || "system"}
                        </span>
                      </div>
                      <span className={styles.agentTechnicalName}>
                        {agent.id}
                      </span>
                    </div>
                    {expandedAgents[agent.id] ? (
                      <ChevronDownIcon className={styles.chevronIcon} />
                    ) : (
                      <ChevronRightIcon className={styles.chevronIcon} />
                    )}
                  </button>

                  {agent.type === "user" && (
                    <div className={styles.agentActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEditAgent(agent)}
                        title="Edit agent"
                      >
                        <PencilIcon className={styles.actionIcon} />
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleDeleteAgent(agent.id)}
                        title="Delete agent"
                      >
                        <TrashIcon className={styles.actionIcon} />
                      </button>
                    </div>
                  )}
                </div>

                {expandedAgents[agent.id] && (
                  <div className={styles.agentContent}>
                    <div className={styles.agentDescription}>
                      <strong>Description:</strong> {agent.description}
                    </div>
                    <div className={styles.agentPrompt}>
                      <strong>System Prompt:</strong>
                      <pre className={styles.codeBlock}>
                        <code>{agent.system}</code>
                      </pre>
                    </div>
                    <div className={styles.agentLinks}>
                      <div className={styles.linkedSection}>
                        <strong>Linked Tools:</strong>
                        <div className={styles.linkedItems}>
                          {(agent.toolIds || []).map((toolId) => (
                            <span key={toolId} className={styles.linkedItem}>
                              {availableTools.find((t) => t.id === toolId)
                                ?.name || toolId}
                            </span>
                          ))}
                          {(!agent.toolIds || agent.toolIds.length === 0) && (
                            <span className={styles.noItems}>None</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.linkedSection}>
                        <strong>Linked Agents:</strong>
                        <div className={styles.linkedItems}>
                          {(agent.specializedAgentIds || []).map((agentId) => (
                            <span key={agentId} className={styles.linkedItem}>
                              {availableAgents.find((a) => a.id === agentId)
                                ?.name || agentId}
                            </span>
                          ))}
                          {(!agent.specializedAgentIds ||
                            agent.specializedAgentIds.length === 0) && (
                            <span className={styles.noItems}>None</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentsList;
