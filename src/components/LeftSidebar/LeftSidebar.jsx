import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import SettingsForm from "./SettingsForm/SettingsForm";
import AgentsList from "./AgentsList/AgentsList";
import Tools from "./Tools/Tools";
import { useStore } from "@nanostores/react";
import { $isConnected } from "@/stores/settingsStore";
import styles from "@/components/LeftSidebar/LeftSidebar.module.css";

function LeftSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("agents");
  const isConnected = useStore($isConnected);

  // Config is complete when we have a valid API key (OpenAI or OpenRouter) and a selected model
  const isConfigComplete = isConnected;

  // Force sidebar to stay open if config is not complete
  useEffect(() => {
    if (!isConfigComplete) {
      setIsExpanded(true);
      setActiveTab("settings");
    }
  }, [isConfigComplete]);

  const toggleExpanded = () => {
    // Only allow toggling if config is complete
    if (isConfigComplete) {
      setIsExpanded(!isExpanded);
    }
  };
  return (
    <div
      className={`${styles.sidebar} ${
        isExpanded ? styles.expanded : styles.collapsed
      }`}
    >
      <div className={styles.content}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "settings" ? styles.active : ""
            } ${!isConfigComplete ? styles.disabled : ""}`}
            onClick={() => setActiveTab("settings")}
            disabled={!isConfigComplete}
          >
            AI Settings
            {
              <span
                className={
                  !isConfigComplete ? styles.warningDot : styles.successDot
                }
              ></span>
            }
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "agents" ? styles.active : ""
            } ${!isConfigComplete ? styles.disabled : ""}`}
            onClick={() => setActiveTab("agents")}
            disabled={!isConfigComplete}
          >
            Agents
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "tools" ? styles.active : ""
            } ${!isConfigComplete ? styles.disabled : ""}`}
            onClick={() => setActiveTab("tools")}
            disabled={!isConfigComplete}
          >
            Tools
          </button>
        </div>

        <div className={styles.tabContent}>
          <div
            className={`${styles.tabPanel} ${
              activeTab === "settings" ? styles.active : ""
            }`}
          >
            <SettingsForm />
          </div>
          <div
            className={`${styles.tabPanel} ${
              activeTab === "agents" ? styles.active : ""
            }`}
          >
            <AgentsList />
          </div>
          <div
            className={`${styles.tabPanel} ${
              activeTab === "tools" ? styles.active : ""
            }`}
          >
            <Tools />
          </div>
        </div>
      </div>

      <div className={styles.iconsSidebar}>
        <div className={styles.controls}>
          <button
            className={`${styles.expandButton} ${
              !isConfigComplete ? styles.disabled : ""
            }`}
            onClick={toggleExpanded}
            disabled={!isConfigComplete}
            title={
              !isConfigComplete
                ? "Complete configuration to enable sidebar controls"
                : isExpanded
                ? "Collapse sidebar"
                : "Expand sidebar"
            }
          >
            {isExpanded ? (
              <ChevronLeftIcon className={styles.icon} />
            ) : (
              <ChevronRightIcon className={styles.icon} />
            )}
          </button>

          <button
            className={`${styles.statusButton} ${
              isConnected ? styles.connected : styles.disconnected
            }`}
            title={isConnected ? "Connected" : "Not connected"}
          >
            {isConnected ? "●" : "●"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeftSidebar;
