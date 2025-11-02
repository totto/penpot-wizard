import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { getToolById } from "@/stores/toolsStore";
import { $specializedAgentsData } from "@/stores/specializedAgentsStore";
import { $directorAgentsData } from "@/stores/directorAgentsStore";
import { parseZodSchema } from "@/utils/zodSchemaParser";
import SchemaVisor from "@/components/LeftSidebar/AgentsList/SchemaVisor/SchemaVisor";
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
  const [inputJsonSchema, setInputJsonSchema] = useState(null);
  const [outputJsonSchema, setOutputJsonSchema] = useState(null);

  // Convert schemas when component mounts or agent changes
  useEffect(() => {
    const convertSchemas = () => {
      if (agent.type === 'specialized') {
        try {
          // User-created agents already have JSON Schema format
          if (agent.isUserCreated) {
            setInputJsonSchema(agent.inputSchema || null);
            setOutputJsonSchema(agent.outputSchema || null);
          } else {
            // System agents use Zod schemas, need to convert
            const inputParsed = agent.inputSchema ? parseZodSchema(agent.inputSchema) : null;
            const outputParsed = agent.outputSchema ? parseZodSchema(agent.outputSchema) : null;
            
            setInputJsonSchema(inputParsed);
            setOutputJsonSchema(outputParsed);
          }
        } catch (error) {
          console.error('Error parsing schemas:', error);
          setInputJsonSchema(null);
          setOutputJsonSchema(null);
        }
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
              <SchemaVisor schema={inputJsonSchema} />
            </div>
          )}
          
          {agent.outputSchema && (
            <div className={styles.fieldSection}>
              <strong className={styles.fieldTitle}>Output Schema:</strong>
              <SchemaVisor schema={outputJsonSchema} />
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
