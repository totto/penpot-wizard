import { useState, useEffect } from "react";
import SchemaVisor from "@/components/LeftSidebar/AgentsList/SchemaVisor/SchemaVisor";
import styles from "./SchemaEditor.module.css";

/**
 * Schema Editor component with GUI and text modes
 * Allows editing JSON Schemas with visual preview
 */
function SchemaEditor({ schema, onChange, label = "Schema" }) {
  const [editorMode, setEditorMode] = useState("gui"); // 'gui' or 'text'
  const [localSchema, setLocalSchema] = useState(schema || null);
  const [textValue, setTextValue] = useState("");
  const [error, setError] = useState(null);
  const [isInternalChange, setIsInternalChange] = useState(false);

  // Initialize text value when schema changes from parent (not from internal edits)
  useEffect(() => {
    if (!isInternalChange) {
      if (schema) {
        setLocalSchema(schema);
        setTextValue(JSON.stringify(schema, null, 2));
      } else {
        setLocalSchema(null);
        setTextValue("");
      }
    }
    setIsInternalChange(false);
  }, [schema, isInternalChange]);

  // Handle mode change
  const handleModeChange = (mode) => {
    setEditorMode(mode);
    setError(null);
  };

  // Handle text mode changes
  const handleTextChange = (value) => {
    setTextValue(value);
    setError(null);

    try {
      if (value.trim()) {
        const parsed = JSON.parse(value);
        setLocalSchema(parsed);
        setIsInternalChange(true);
        onChange(parsed);
      } else {
        setLocalSchema(null);
        setIsInternalChange(true);
        onChange(null);
      }
    } catch (err) {
      setError(`JSON Parse Error: ${err.message}`);
    }
  };

  // Handle GUI mode changes
  const handleGuiChange = (newSchema) => {
    setLocalSchema(newSchema);
    if (newSchema) {
      setTextValue(JSON.stringify(newSchema, null, 2));
    } else {
      setTextValue("");
    }
    setIsInternalChange(true);
    onChange(newSchema);
  };

  return (
    <div className={styles.schemaEditor}>
      {/* Label */}
      <label className={styles.label}>{label}</label>

      {/* Preview Section */}
      {localSchema && (
        <div className={styles.previewSection}>
          <div className={styles.previewLabel}>Preview:</div>
          <SchemaVisor schema={localSchema} />
        </div>
      )}

      {/* Mode Toggle */}
      <div className={styles.modeToggle}>
        <button
          type="button"
          className={`${styles.modeButton} ${editorMode === "gui" ? styles.modeButtonActive : ""}`}
          onClick={() => handleModeChange("gui")}
        >
          🎨 GUI Editor
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${editorMode === "text" ? styles.modeButtonActive : ""}`}
          onClick={() => handleModeChange("text")}
        >
          📝 Text Editor
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Editor Area */}
      <div className={styles.editorArea}>
        {editorMode === "text" ? (
          <textarea
            className={styles.textEditor}
            value={textValue}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter JSON Schema..."
            rows={15}
            spellCheck={false}
          />
        ) : (
          <div className={styles.guiEditor}>
            <GuiSchemaEditor 
              schema={localSchema} 
              onChange={handleGuiChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * GUI Schema Editor - Visual form-based editor with recursion for nested types
 */
function GuiSchemaEditor({ schema, onChange, level = 0 }) {
  const [fields, setFields] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize fields from schema only once
  useEffect(() => {
    if (!initialized) {
      if (schema && schema.properties) {
        const newFields = Object.entries(schema.properties).map(([name, prop]) => ({
          id: Math.random().toString(36).substr(2, 9),
          name,
          type: prop.type || "string",
          description: prop.description || "",
          required: schema.required?.includes(name) || false,
          // For arrays, store items schema
          items: prop.type === "array" ? prop.items : undefined,
          // For objects, store nested properties
          properties: prop.type === "object" ? prop.properties : undefined,
          nestedRequired: prop.type === "object" ? prop.required : undefined,
        }));
        setFields(newFields);
      }
      setInitialized(true);
    }
  }, [schema, initialized]);

  // Convert fields to JSON Schema
  const fieldsToSchema = (fieldsList) => {
    if (fieldsList.length === 0) return null;

    const properties = {};
    const required = [];

    fieldsList.forEach(field => {
      const propDef = {
        type: field.type,
        ...(field.description && { description: field.description }),
      };

      // Add items for arrays
      if (field.type === "array" && field.items) {
        propDef.items = field.items;
      }

      // Add properties for objects
      if (field.type === "object" && field.properties) {
        propDef.properties = field.properties;
        if (field.nestedRequired && field.nestedRequired.length > 0) {
          propDef.required = field.nestedRequired;
        }
      }

      properties[field.name] = propDef;

      if (field.required) {
        required.push(field.name);
      }
    });

    return {
      type: "object",
      properties,
      ...(required.length > 0 && { required }),
    };
  };

  // Add new field
  const addField = () => {
    const newField = {
      id: Math.random().toString(36).substr(2, 9),
      name: `field${fields.length + 1}`,
      type: "string",
      description: "",
      required: false,
    };
    const newFields = [...fields, newField];
    setFields(newFields);
    onChange(fieldsToSchema(newFields));
  };

  // Update field without causing re-render
  const updateField = (id, updates) => {
    setFields(currentFields => {
      const newFields = currentFields.map(f => 
        f.id === id ? { ...f, ...updates } : f
      );
      setTimeout(() => onChange(fieldsToSchema(newFields)), 0);
      return newFields;
    });
  };

  // Remove field
  const removeField = (id) => {
    const newFields = fields.filter(f => f.id !== id);
    setFields(newFields);
    onChange(fieldsToSchema(newFields));
  };

  // Handle nested array items change
  const handleArrayItemsChange = (fieldId, itemsSchema) => {
    updateField(fieldId, { items: itemsSchema });
  };

  // Handle nested object properties change
  const handleObjectPropertiesChange = (fieldId, nestedSchema) => {
    updateField(fieldId, { 
      properties: nestedSchema?.properties,
      nestedRequired: nestedSchema?.required 
    });
  };

  return (
    <div className={styles.guiEditorContent} style={{ marginLeft: `${level * 1.5}rem` }}>
      {fields.length === 0 && level === 0 && (
        <div className={styles.emptyState}>
          No fields defined. Click "Add Field" to start.
        </div>
      )}

      {fields.map(field => (
        <div key={field.id} className={styles.fieldGroup}>
          <div className={styles.fieldRow}>
            <input
              type="text"
              value={field.name}
              onChange={(e) => updateField(field.id, { name: e.target.value })}
              className={styles.fieldInput}
              placeholder="Field name"
            />

            <select
              value={field.type}
              onChange={(e) => {
                const newType = e.target.value;
                const updates = { type: newType };
                // Initialize nested data when type changes to array or object
                if (newType === "array") {
                  updates.items = { type: "string" };
                } else {
                  updates.items = undefined;
                }
                if (newType === "object") {
                  updates.properties = {};
                  updates.nestedRequired = [];
                } else {
                  updates.properties = undefined;
                  updates.nestedRequired = undefined;
                }
                updateField(field.id, updates);
              }}
              className={styles.fieldSelect}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="array">Array</option>
              <option value="object">Object</option>
            </select>

            <input
              type="text"
              value={field.description}
              onChange={(e) => updateField(field.id, { description: e.target.value })}
              className={styles.fieldInput}
              placeholder="Description"
            />

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(field.id, { required: e.target.checked })}
                className={styles.checkbox}
              />
              Required
            </label>

            <button
              type="button"
              onClick={() => removeField(field.id)}
              className={styles.removeButton}
              title="Remove field"
            >
              ✕
            </button>
          </div>

          {/* Nested editor for Array items */}
          {field.type === "array" && (
            <div className={styles.nestedEditor}>
              <div className={styles.nestedLabel}>Array Items:</div>
              <ArrayItemsEditor
                items={field.items}
                onChange={(items) => handleArrayItemsChange(field.id, items)}
                level={level + 1}
              />
            </div>
          )}

          {/* Nested editor for Object properties */}
          {field.type === "object" && (
            <div className={styles.nestedEditor}>
              <div className={styles.nestedLabel}>Object Properties:</div>
              <ObjectPropertiesEditor
                properties={field.properties}
                nestedRequired={field.nestedRequired}
                onChange={(nestedSchema) => handleObjectPropertiesChange(field.id, nestedSchema)}
                level={level + 1}
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className={styles.addButton}
        style={{ marginLeft: `${level * 1.5}rem` }}
      >
        + Add Field
      </button>
    </div>
  );
}

/**
 * Wrapper for object properties editor
 */
function ObjectPropertiesEditor({ properties, nestedRequired, onChange, level }) {
  return (
    <GuiSchemaEditor
      schema={{
        type: "object",
        properties: properties || {},
        required: nestedRequired || []
      }}
      onChange={onChange}
      level={level}
    />
  );
}

/**
 * Editor for array items - allows defining what type the array contains
 */
function ArrayItemsEditor({ items, onChange, level }) {
  const [itemType, setItemType] = useState(items?.type || "string");

  useEffect(() => {
    if (items?.type) {
      setItemType(items.type);
    }
  }, [items]);

  const handleTypeChange = (newType) => {
    setItemType(newType);
    const newItems = { type: newType };
    
    // Reset nested data when changing type
    if (newType === "object") {
      newItems.properties = items?.properties || {};
      newItems.required = items?.required || [];
    } else if (newType === "array") {
      newItems.items = items?.items || { type: "string" };
    }
    
    onChange(newItems);
  };

  const handleNestedChange = (nestedSchema) => {
    onChange({
      ...items,
      properties: nestedSchema?.properties,
      required: nestedSchema?.required,
    });
  };

  const handleNestedArrayChange = (nestedItems) => {
    onChange({
      ...items,
      items: nestedItems,
    });
  };

  return (
    <div className={styles.arrayItemsEditor}>
      <select
        value={itemType}
        onChange={(e) => handleTypeChange(e.target.value)}
        className={styles.fieldSelect}
      >
        <option value="string">String</option>
        <option value="number">Number</option>
        <option value="boolean">Boolean</option>
        <option value="object">Object</option>
        <option value="array">Array</option>
      </select>

      {itemType === "object" && (
        <div className={styles.nestedEditor}>
          <GuiSchemaEditor
            schema={items?.properties ? {
              type: "object",
              properties: items.properties,
              required: items.required || []
            } : null}
            onChange={handleNestedChange}
            level={level}
          />
        </div>
      )}

      {itemType === "array" && (
        <div className={styles.nestedEditor}>
          <div className={styles.nestedLabel}>Nested Array Items:</div>
          <ArrayItemsEditor
            items={items?.items}
            onChange={handleNestedArrayChange}
            level={level + 1}
          />
        </div>
      )}
    </div>
  );
}

export default SchemaEditor;

