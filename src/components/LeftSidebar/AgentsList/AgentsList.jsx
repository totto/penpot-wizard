import { useState } from "react";
import { useStore } from "@nanostores/react";
import { $directorAgentsData } from "@/stores/directorAgentsStore";
import { $specializedAgentsData } from "@/stores/specializedAgentsStore";
import EditAgentForm from "./EditAgentForm/EditAgentForm";
import AgentDetailsCard from "./AgentDetailsCard/AgentDetailsCard";
import EntryAgentSelector from "./EntryAgentSelector/EntryAgentSelector";
import styles from "./AgentsList.module.css";
import { deleteUserDirectorAgent, deleteUserSpecializedAgent } from "@/stores/userAgentsStore";

import {
  PlusIcon,
} from "@heroicons/react/24/outline";

function AgentsList() {
  const directorAgentsData = useStore($directorAgentsData);
  const specializedAgentsData = useStore($specializedAgentsData);

  // Combine all agent types for display
  const agentsData = [
    ...directorAgentsData.map((agent) => ({ ...agent, type: "director" })),
    ...specializedAgentsData.map((agent) => ({
      ...agent,
      type: "specialized",
    })),
  ];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);

  const handleEditAgent = (agent) => {
    setEditingAgent(agent);
    setShowCreateForm(true);
  };

  const handleDeleteAgent = (agentId, agentType) => {
    if (window.confirm("Are you sure you want to delete this agent?")) {
      // In real implementation, this would update the store
      console.log("Deleting agent:", agentId);
      if (agentType === "director") {
        deleteUserDirectorAgent(agentId);
      } else if (agentType === "specialized") {
        deleteUserSpecializedAgent(agentId);
      }
    }
  };

  return (
    <div className={styles.agentsContainer}>
      {/* Create/Edit Agent Form */}
      {showCreateForm && (
        <div className={styles.formOverlay}>
          <EditAgentForm
            agentToEdit={editingAgent}
            onClose={() => {
              setShowCreateForm(false);
              setEditingAgent(null);
            }}
          />
        </div>
      )}

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
      <EntryAgentSelector />

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
              <AgentDetailsCard
                key={agent.id}
                agent={agent}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentsList;
