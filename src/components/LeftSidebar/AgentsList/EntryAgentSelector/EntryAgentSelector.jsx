import { useStore } from "@nanostores/react";
import { $directorAgentsData, $activeDirectorAgent, setActiveDirectorAgent } from "@/stores/directorAgentsStore";
import styles from "./EntryAgentSelector.module.css";

function EntryAgentSelector() {
  const directorAgentsData = useStore($directorAgentsData);
  const activeDirectorAgent = useStore($activeDirectorAgent);

  const handleEntryAgentChange = (agentId) => {
    setActiveDirectorAgent(agentId);
  };

  return (
    <div className={styles.compactSection}>
      <div className={styles.formGroup}>
        <label htmlFor="entry-agent" className={styles.label}>
          Entry Agent <span className={styles.required}>*</span>
        </label>
        <select
          id="entry-agent"
          value={activeDirectorAgent || ""}
          onChange={(e) => handleEntryAgentChange(e.target.value)}
          className={styles.select}
        >
          <option value="">Select a director agent...</option>
          {directorAgentsData.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default EntryAgentSelector;
