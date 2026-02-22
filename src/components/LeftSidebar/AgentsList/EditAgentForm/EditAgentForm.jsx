import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { $toolsData } from "@/stores/toolsStore";
import { $specializedAgentsData } from "@/stores/specializedAgentsStore";
import { $directorAgentsData } from "@/stores/directorAgentsStore";
import { 
  createUserDirectorAgent, 
  updateUserDirectorAgent,
  createUserSpecializedAgent, 
  updateUserSpecializedAgent 
} from "@/stores/userAgentsStore";
import styles from "./EditAgentForm.module.css";
import SchemaEditor from "../SchemaEditor/SchemaEditor";

function EditAgentForm({ agentToEdit, onClose }) {
  const toolsData = useStore($toolsData);
  const specializedAgentsData = useStore($specializedAgentsData);
  const directorAgentsData = useStore($directorAgentsData);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    technical_name: "",
    description: "",
    prompt: "",
    agent_type: "director", // "director" or "specialized"
    input_schema: null,
    linked_tools: [],
    linked_agents: [],
  });

  // Initialize form data when agentToEdit changes
  useEffect(() => {
    if (agentToEdit) {
      // User-created agents already have schemas in JSON Schema format
      setFormData({
        name: agentToEdit.name || "",
        technical_name: agentToEdit.technical_name || agentToEdit.id || "",
        description: agentToEdit.description || "",
        prompt: agentToEdit.system || "",
        agent_type: agentToEdit.type || "director",
        input_schema: agentToEdit.inputSchema || null,
        linked_tools: agentToEdit.toolIds || [],
        linked_agents: agentToEdit.specializedAgentIds || [],
      });
    } else {
      setFormData({
        name: "",
        technical_name: "",
        description: "",
        prompt: "",
        agent_type: "director",
        input_schema: null,
        linked_tools: [],
        linked_agents: [],
      });
    }
  }, [agentToEdit]);

  // Available tools for selection
  const availableTools = toolsData.map(tool => ({
    id: tool.id,
    name: tool.name,
  }));

  // Available agents for delegation (specialized + director)
  const availableAgents = [
    ...specializedAgentsData.map(agent => ({
      id: agent.id,
      name: agent.name,
    })),
    ...directorAgentsData.map(agent => ({
      id: agent.id,
      name: agent.name,
    })),
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleToolToggle = (toolId) => {
    setFormData(prev => ({
      ...prev,
      linked_tools: prev.linked_tools.includes(toolId)
        ? prev.linked_tools.filter(id => id !== toolId)
        : [...prev.linked_tools, toolId],
    }));
  };

  const handleAgentToggle = (agentId) => {
    setFormData(prev => ({
      ...prev,
      linked_agents: prev.linked_agents.includes(agentId)
        ? prev.linked_agents.filter(id => id !== agentId)
        : [...prev.linked_agents, agentId],
    }));
  };

  const handleSave = () => {
    if (
      formData.name &&
      formData.technical_name &&
      formData.description &&
      formData.prompt
    ) {
      try {
        const agentData = {
          id: agentToEdit ? agentToEdit.id : Date.now().toString(),
          name: formData.name,
          description: formData.description,
          system: formData.prompt,
          toolIds: formData.linked_tools,
          specializedAgentIds: formData.linked_agents,
          // Schemas are already in JSON Schema format
          inputSchema: formData.input_schema || undefined,
        };
        
        if (formData.agent_type === "director") {
          if (agentToEdit) {
            updateUserDirectorAgent(agentData);
          } else {
            createUserDirectorAgent(agentData);
          }
        } else if (formData.agent_type === "specialized") {
          if (agentToEdit) {
            updateUserSpecializedAgent(agentData);
          } else {
            createUserSpecializedAgent(agentData);
          }
        }
        
        onClose();
      } catch (error) {
        console.error("Error saving agent:", error);
        alert(`Error saving agent: ${error.message}`);
      }
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const isFormValid = formData.name && formData.technical_name && formData.description && formData.prompt;

  return (
    <div className={styles.fullscreenContainer}>
      {/* Header with close button */}
      <div className={styles.header}>
        <h3 className={styles.title}>
          {agentToEdit ? "Edit Agent" : "Create New Agent"}
        </h3>
        <button
          className={styles.closeButton}
          onClick={handleCancel}
          title="Close form"
        >
          <XMarkIcon className={styles.closeIcon} />
        </button>
      </div>

      {/* Form content */}
      <div className={styles.content}>
        <p className={styles.description}>
          {agentToEdit
            ? "Modify the agent properties, prompt, and linked resources."
            : "Define a new agent with its properties, prompt, and linked tools/agents."}
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="agent-type" className={styles.label}>
            Agent Type <span className={styles.required}>*</span>
          </label>
          <div className={styles.switchContainer}>
            <button
              type="button"
              className={`${styles.switchButton} ${formData.agent_type === "director" ? styles.switchButtonActive : ""}`}
              onClick={() => handleInputChange("agent_type", "director")}
            >
              Director
            </button>
            <button
              type="button"
              className={`${styles.switchButton} ${formData.agent_type === "specialized" ? styles.switchButtonActive : ""}`}
              onClick={() => handleInputChange("agent_type", "specialized")}
            >
              Specialized
            </button>
          </div>
          <small className={styles.helpText}>
            {formData.agent_type === "director" 
              ? "Director agents coordinate tasks and delegate to specialized agents"
              : "Specialized agents handle specific tasks and can have input/output schemas"
            }
          </small>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="agent-name" className={styles.label}>
              Agent Name <span className={styles.required}>*</span>
            </label>
            <input
              id="agent-name"
              type="text"
              value={formData.name}
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
              value={formData.technical_name}
              onChange={(e) => handleInputChange("technical_name", e.target.value)}
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
              value={formData.description}
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
              value={formData.prompt}
              onChange={(e) => handleInputChange("prompt", e.target.value)}
              className={styles.codeTextarea}
              placeholder="Enter the system prompt for this agent..."
              rows={8}
            />
            <small className={styles.helpText}>
              System prompt that defines the agent's behavior and personality
            </small>
          </div>

          {/* Schema fields for specialized agents */}
          {formData.agent_type === "specialized" && (
            <>
              <div className={styles.formGroup}>
                <SchemaEditor
                  schema={formData.input_schema}
                  onChange={(schema) => handleInputChange("input_schema", schema)}
                  label="Input Schema (Optional)"
                />
                <small className={styles.helpText}>
                  Define the expected input structure for this specialized agent
                </small>
              </div>

            </>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Linked Tools</label>
            <div className={styles.selectionGrid}>
              {availableTools.map((tool) => (
                <label key={tool.id} className={styles.selectionItem}>
                  <input
                    type="checkbox"
                    checked={formData.linked_tools.includes(tool.id)}
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
                    checked={formData.linked_agents.includes(agent.id)}
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
        </div>

        {/* Action buttons */}
        <div className={styles.actionButtons}>
          <button
            type="button"
            onClick={handleSave}
            className={styles.saveButton}
            disabled={!isFormValid}
          >
            {agentToEdit ? "Update Agent" : "Create Agent"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditAgentForm;
