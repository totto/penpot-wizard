import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import styles from "./Tools.module.css";

function Tools() {
  const [expandedTools, setExpandedTools] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [newTool, setNewTool] = useState({
    name: "",
    technical_name: "",
    description: "",
    javascript_code: "",
  });

  // Mock tools data - in real implementation this would come from a store
  const [tools, setTools] = useState([
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

  const toggleTool = (toolId) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const handleCreateTool = () => {
    if (
      newTool.name &&
      newTool.technical_name &&
      newTool.description &&
      newTool.javascript_code
    ) {
      const tool = {
        id: Date.now().toString(),
        ...newTool,
        type: "user",
      };
      setTools((prev) => [...prev, tool]);
      setNewTool({
        name: "",
        technical_name: "",
        description: "",
        javascript_code: "",
      });
      setShowCreateForm(false);
    }
  };

  const handleEditTool = (tool) => {
    setEditingTool(tool);
    setNewTool({
      name: tool.name,
      technical_name: tool.technical_name,
      description: tool.description,
      javascript_code: tool.javascript_code,
    });
    setShowCreateForm(true);
    // Scroll to the form
    setTimeout(() => {
      const formElement = document.querySelector(`.${styles.section}`);
      if (formElement) {
        formElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleUpdateTool = () => {
    if (
      newTool.name &&
      newTool.technical_name &&
      newTool.description &&
      newTool.javascript_code
    ) {
      setTools((prev) =>
        prev.map((tool) =>
          tool.id === editingTool.id ? { ...tool, ...newTool } : tool
        )
      );
      setNewTool({
        name: "",
        technical_name: "",
        description: "",
        javascript_code: "",
      });
      setEditingTool(null);
      setShowCreateForm(false);
    }
  };

  const handleDeleteTool = (toolId) => {
    if (window.confirm("Are you sure you want to delete this tool?")) {
      setTools((prev) => prev.filter((tool) => tool.id !== toolId));
    }
  };

  const handleCancelEdit = () => {
    setNewTool({
      name: "",
      technical_name: "",
      description: "",
      javascript_code: "",
    });
    setEditingTool(null);
    setShowCreateForm(false);
  };

  const handleInputChange = (field, value) => {
    setNewTool((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className={styles.toolsContainer}>
      {/* Create Tool Button */}
      <div className={styles.createToolSection}>
        <button
          className={styles.createToolButton}
          onClick={() => {
            setEditingTool(null);
            setNewTool({
              name: "",
              technical_name: "",
              description: "",
              javascript_code: "",
            });
            setShowCreateForm(!showCreateForm);
          }}
        >
          <PlusIcon className={styles.plusIcon} />
          Create New Tool
        </button>
      </div>

      {/* Create/Edit Tool Form */}
      {showCreateForm && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            {editingTool ? "Edit Tool" : "Create New Tool"}
            {editingTool && (
              <span className={styles.editingIndicator}>
                Editing: {editingTool.name}
              </span>
            )}
          </h3>
          <p className={styles.sectionDescription}>
            {editingTool
              ? "Modify the tool properties and JavaScript implementation."
              : "Define a new tool with its properties and JavaScript implementation."}
          </p>

          <div className={styles.formFieldsContainer}>
            <div className={styles.formGroup}>
              <label htmlFor="tool-name" className={styles.label}>
                Tool Name <span className={styles.required}>*</span>
              </label>
              <input
                id="tool-name"
                type="text"
                value={newTool.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={styles.input}
                placeholder="e.g., Draw Circle"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tool-technical-name" className={styles.label}>
                Technical Name <span className={styles.required}>*</span>
              </label>
              <input
                id="tool-technical-name"
                type="text"
                value={newTool.technical_name}
                onChange={(e) =>
                  handleInputChange("technical_name", e.target.value)
                }
                className={styles.input}
                placeholder="e.g., draw_circle"
              />
              <small className={styles.helpText}>
                Used internally by the system (lowercase, underscores)
              </small>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tool-description" className={styles.label}>
                Description <span className={styles.required}>*</span>
              </label>
              <textarea
                id="tool-description"
                value={newTool.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className={styles.textarea}
                placeholder="Describe what this tool does..."
                rows={3}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="tool-javascript" className={styles.label}>
                JavaScript Code <span className={styles.required}>*</span>
              </label>
              <textarea
                id="tool-javascript"
                value={newTool.javascript_code}
                onChange={(e) =>
                  handleInputChange("javascript_code", e.target.value)
                }
                className={styles.codeTextarea}
                placeholder="// Enter your JavaScript code here..."
                rows={8}
              />
              <small className={styles.helpText}>
                JavaScript code that implements the tool functionality
              </small>
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={editingTool ? handleUpdateTool : handleCreateTool}
                className={styles.createButton}
                disabled={
                  !newTool.name ||
                  !newTool.technical_name ||
                  !newTool.description ||
                  !newTool.javascript_code
                }
              >
                {editingTool ? "Update Tool" : "Create Tool"}
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

      {/* Tools List */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Existing Tools</h3>
        <p className={styles.sectionDescription}>
          Manage and view all available tools in the system.
        </p>

        {tools.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tools created yet. Create your first tool to get started.</p>
          </div>
        ) : (
          <div className={styles.toolsList}>
            {tools.map((tool) => (
              <div
                key={tool.id}
                className={`${styles.toolItem} ${
                  editingTool?.id === tool.id ? styles.editing : ""
                }`}
              >
                <div className={styles.toolHeader}>
                  <button
                    className={styles.toolHeaderButton}
                    onClick={() => toggleTool(tool.id)}
                  >
                    <div className={styles.toolInfo}>
                      <div className={styles.toolNameRow}>
                        <h4 className={styles.toolName}>{tool.name}</h4>
                        <span
                          className={`${styles.toolType} ${styles[tool.type]}`}
                        >
                          {tool.type}
                        </span>
                      </div>
                      <span className={styles.toolTechnicalName}>
                        {tool.technical_name}
                      </span>
                    </div>
                    {expandedTools[tool.id] ? (
                      <ChevronDownIcon className={styles.chevronIcon} />
                    ) : (
                      <ChevronRightIcon className={styles.chevronIcon} />
                    )}
                  </button>

                  {tool.type === "user" && (
                    <div className={styles.toolActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEditTool(tool)}
                        title="Edit tool"
                      >
                        <PencilIcon className={styles.actionIcon} />
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleDeleteTool(tool.id)}
                        title="Delete tool"
                      >
                        <TrashIcon className={styles.actionIcon} />
                      </button>
                    </div>
                  )}
                </div>

                {expandedTools[tool.id] && (
                  <div className={styles.toolContent}>
                    <div className={styles.toolDescription}>
                      <strong>Description:</strong> {tool.description}
                    </div>
                    <div className={styles.toolCode}>
                      <strong>JavaScript Code:</strong>
                      <pre className={styles.codeBlock}>
                        <code>{tool.javascript_code}</code>
                      </pre>
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

export default Tools;
