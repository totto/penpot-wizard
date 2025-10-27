import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
  ShareIcon,
} from "@heroicons/react/24/outline";
import { useStore } from "@nanostores/react";
import { $directorAgentsData } from "@/stores/directorAgentsStore";
import { $specializedAgentsData } from "@/stores/specializedAgentsStore";
import styles from "./Download.module.css";

function Download() {
  const directorAgentsData = useStore($directorAgentsData);
  const specializedAgentsData = useStore($specializedAgentsData);

  // Mock tools data - in real implementation this would come from tools store
  const [tools] = useState([
    {
      id: "1",
      name: "Draw Rectangle",
      technical_name: "draw_rectangle",
      description: "Creates a rectangle shape in Penpot",
      javascript_code:
        "// JavaScript code for drawing rectangle\npenpot.createRectangle();",
      type: "system",
    },
    {
      id: "2",
      name: "Get User Data",
      technical_name: "get_user_data",
      description: "Retrieves current user information",
      javascript_code:
        "// JavaScript code for getting user data\nreturn penpot.currentUser;",
      type: "system",
    },
    {
      id: "3",
      name: "Custom Circle Tool",
      technical_name: "custom_circle",
      description: "A custom tool for drawing circles with specific properties",
      javascript_code:
        "// Custom circle drawing code\nconst circle = penpot.createEllipse();\ncircle.resize(100, 100);",
      type: "user",
    },
  ]);

  // Combine all agents for display
  const allAgents = [
    ...directorAgentsData.map((agent) => ({ ...agent, type: "director" })),
    ...specializedAgentsData.map((agent) => ({
      ...agent,
      type: "specialized",
    })),
  ];

  const handleDownloadAllTools = () => {
    // TODO: Implement download all tools as JSON
    console.log("Download all tools as JSON - functionality to be implemented");
  };

  const handleDownloadAllAgents = () => {
    // TODO: Implement download all agents as JSON
    console.log(
      "Download all agents as JSON - functionality to be implemented"
    );
  };

  const handleDownloadEverything = () => {
    // TODO: Implement download everything as JSON
    console.log(
      "Download everything as JSON - functionality to be implemented"
    );
  };

  const handleUploadTools = () => {
    // TODO: Implement upload tools from JSON
    console.log("Upload tools from JSON - functionality to be implemented");
  };

  const handleUploadAgents = () => {
    // TODO: Implement upload agents from JSON
    console.log("Upload agents from JSON - functionality to be implemented");
  };

  const handleUploadEverything = () => {
    // TODO: Implement upload everything from JSON
    console.log(
      "Upload everything from JSON - functionality to be implemented"
    );
  };

  const handleShareToolsToCommunity = () => {
    // TODO: Implement share tools to community
    console.log("Share tools to community - functionality to be implemented");
  };

  const handleShareAgentsToCommunity = () => {
    // TODO: Implement share agents to community
    console.log("Share agents to community - functionality to be implemented");
  };

  const handleShareEverythingToCommunity = () => {
    // TODO: Implement share everything to community
    console.log(
      "Share everything to community - functionality to be implemented"
    );
  };

  return (
    <div className={styles.downloadContainer}>
      {/* Header */}
      <div className={styles.headerSection}>
        <h2 className={styles.headerTitle}>Download & Upload</h2>
        <p className={styles.headerDescription}>
          Export your configurations, import from JSON files, or share with the
          community to improve prompts and functionality
        </p>
      </div>

      {/* Tools Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <DocumentIcon className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Tools</h3>
        </div>
        <p className={styles.sectionDescription}>
          Manage your custom tools and system tools
        </p>

        <div className={styles.buttonsGrid}>
          <button
            className={styles.actionButton}
            onClick={handleDownloadAllTools}
            title="Download all tools as JSON"
          >
            <ArrowDownTrayIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Download Tools</span>
            <span className={styles.buttonSubtext}>Export all tools</span>
          </button>

          <button
            className={styles.actionButton}
            onClick={handleUploadTools}
            title="Upload tools from JSON file"
          >
            <ArrowUpTrayIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Upload Tools</span>
            <span className={styles.buttonSubtext}>Import from JSON</span>
          </button>

          <button
            className={styles.actionButton}
            onClick={handleShareToolsToCommunity}
            title="Share tools with the community"
          >
            <ShareIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Share Tools</span>
            <span className={styles.buttonSubtext}>Community sharing</span>
          </button>
        </div>

        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{tools.length}</span>
            <span className={styles.statLabel}>Total Tools</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              {tools.filter((t) => t.type === "user").length}
            </span>
            <span className={styles.statLabel}>User Tools</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              {tools.filter((t) => t.type === "system").length}
            </span>
            <span className={styles.statLabel}>System Tools</span>
          </div>
        </div>
      </div>

      {/* Agents Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <DocumentIcon className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Agents</h3>
        </div>
        <p className={styles.sectionDescription}>
          Manage your director and specialized agents
        </p>

        <div className={styles.buttonsGrid}>
          <button
            className={styles.actionButton}
            onClick={handleDownloadAllAgents}
            title="Download all agents as JSON"
          >
            <ArrowDownTrayIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Download Agents</span>
            <span className={styles.buttonSubtext}>Export all agents</span>
          </button>

          <button
            className={styles.actionButton}
            onClick={handleUploadAgents}
            title="Upload agents from JSON file"
          >
            <ArrowUpTrayIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Upload Agents</span>
            <span className={styles.buttonSubtext}>Import from JSON</span>
          </button>

          <button
            className={styles.actionButton}
            onClick={handleShareAgentsToCommunity}
            title="Share agents with the community"
          >
            <ShareIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Share Agents</span>
            <span className={styles.buttonSubtext}>Community sharing</span>
          </button>
        </div>

        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>{allAgents.length}</span>
            <span className={styles.statLabel}>Total Agents</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              {allAgents.filter((a) => a.type === "director").length}
            </span>
            <span className={styles.statLabel}>Director Agents</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>
              {allAgents.filter((a) => a.type === "specialized").length}
            </span>
            <span className={styles.statLabel}>Specialized Agents</span>
          </div>
        </div>
      </div>

      {/* Everything Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <DocumentIcon className={styles.sectionIcon} />
          <h3 className={styles.sectionTitle}>Complete Configuration</h3>
        </div>
        <p className={styles.sectionDescription}>
          Export or import your entire Penpot Wizard configuration
        </p>

        <div className={styles.buttonsGrid}>
          <button
            className={styles.actionButton}
            onClick={handleDownloadEverything}
            title="Download everything as JSON"
          >
            <ArrowDownTrayIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Download All</span>
            <span className={styles.buttonSubtext}>Complete backup</span>
          </button>

          <button
            className={styles.actionButton}
            onClick={handleUploadEverything}
            title="Upload everything from JSON file"
          >
            <ArrowUpTrayIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Upload All</span>
            <span className={styles.buttonSubtext}>Complete restore</span>
          </button>

          <button
            className={styles.actionButton}
            onClick={handleShareEverythingToCommunity}
            title="Share everything with the community"
          >
            <ShareIcon className={styles.buttonIcon} />
            <span className={styles.buttonText}>Share All</span>
            <span className={styles.buttonSubtext}>Full configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Download;
