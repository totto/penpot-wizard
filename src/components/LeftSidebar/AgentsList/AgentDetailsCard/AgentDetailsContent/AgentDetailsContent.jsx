import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { getToolById } from "@/stores/toolsStore";
import { $specializedAgentsData } from "@/stores/specializedAgentsStore";
import { $directorAgentsData } from "@/stores/directorAgentsStore";
import { convertZodSchemaToJS, renderSchemaAsString } from "@/utils/schemaUtils";
import styles from "./AgentDetailsContent.module.css";

function AgentDetailsContent({ agent }) {
  const specializedAgentsData = useStore($specializedAgentsData);
  const directorAgentsData = useStore($directorAgentsData);

  // Helper function to get tool name by ID
  const getToolName = (toolId) => {
    const tool = getToolById(toolId);
    return tool ? tool.name : toolId;
  };

  // Helper function to get agent name by ID
  const getAgentName = (agentId) => {
    const specializedAgent = specializedAgentsData.find(a => a.id === agentId);
    if (specializedAgent) return specializedAgent.name;
    
    const directorAgent = directorAgentsData.find(a => a.id === agentId);
    if (directorAgent) return directorAgent.name;
    
    return agentId;
  };


  // State for schema conversions
  const [inputSchemaJS, setInputSchemaJS] = useState(null);
  const [outputSchemaJS, setOutputSchemaJS] = useState(null);

  // Convert schemas when component mounts or agent changes
  useEffect(() => {
    const convertSchemas = () => {
      if (agent.type === 'specialized') {
        const inputJS = convertZodSchemaToJS(agent.inputSchema);
        const outputJS = convertZodSchemaToJS(agent.outputSchema);
        setInputSchemaJS(inputJS);
        setOutputSchemaJS(outputJS);
      }
    };
    
    convertSchemas();
  }, [agent]);

  return (
    <div className={styles.agentContent}>
      <div className={styles.fieldSection}>
        <strong className={styles.fieldTitle}>Description:</strong>
        <div className={styles.fieldValue}>
          {agent.description}
        </div>
      </div>
      
      <div className={styles.fieldSection}>
        <strong className={styles.fieldTitle}>System Prompt:</strong>
        <pre className={styles.codeBlock}>
          <code>{agent.system}</code>
        </pre>
      </div>

      {/* Show schema fields for specialized agents */}
      {agent.type === 'specialized' && (
        <>
          {agent.inputSchema && (
            <div className={styles.fieldSection}>
              <strong className={styles.fieldTitle}>Input Schema:</strong>
              <pre className={styles.codeBlock}>
                <code>{renderSchemaAsString(inputSchemaJS)}</code>
              </pre>
            </div>
          )}
          
          {agent.outputSchema && (
            <div className={styles.fieldSection}>
              <strong className={styles.fieldTitle}>Output Schema:</strong>
              <pre className={styles.codeBlock}>
                <code>{renderSchemaAsString(outputSchemaJS)}</code>
              </pre>
            </div>
          )}
        </>
      )}
      
      { agent.type !== 'imageGeneration' && (
        <>
          <div className={styles.fieldSection}>
            <strong className={styles.fieldTitle}>Linked Tools:</strong>
            <div className={styles.linkedItems}>
              {(agent.toolIds || []).map((toolId) => (
                <span key={toolId} className={styles.linkedItem}>
                  {getToolName(toolId)}
                </span>
              ))}
              {(!agent.toolIds || agent.toolIds.length === 0) && (
                <span className={styles.noItems}>None</span>
              )}
            </div>
          </div>
          
          <div className={styles.fieldSection}>
            <strong className={styles.fieldTitle}>Linked Agents:</strong>
            <div className={styles.linkedItems}>
              {(agent.specializedAgentIds || []).map((agentId) => (
                <span key={agentId} className={styles.linkedItem}>
                  {getAgentName(agentId)}
                </span>
              ))}
              {(!agent.specializedAgentIds || agent.specializedAgentIds.length === 0) && (
                <span className={styles.noItems}>None</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AgentDetailsContent;
