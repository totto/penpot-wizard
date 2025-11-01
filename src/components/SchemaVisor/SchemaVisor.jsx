import styles from "./SchemaVisor.module.css";

/**
 * Component to visually display a JSON Schema in TypeScript notation style
 */
function SchemaVisor({ schema, level = 0 }) {
  if (!schema || typeof schema !== 'object') {
    return <div className={styles.noSchema}>No schema defined</div>;
  }

  // Render type information based on JSON Schema (for inline types only)
  const renderInlineType = (propSchema) => {
    if (!propSchema) return 'unknown';

    // Handle arrays
    if (propSchema.type === 'array') {
      if (propSchema.items) {
        return `Array<${renderInlineType(propSchema.items)}>`;
      }
      return 'Array<any>';
    }

    // For objects, just return "object" - they will be expanded separately
    if (propSchema.type === 'object') {
      return 'object';
    }

    // Handle anyOf (unions)
    if (propSchema.anyOf) {
      return propSchema.anyOf.map(renderInlineType).join(' | ');
    }

    // Handle oneOf (unions)
    if (propSchema.oneOf) {
      return propSchema.oneOf.map(renderInlineType).join(' | ');
    }

    // Handle allOf (intersections)
    if (propSchema.allOf) {
      return propSchema.allOf.map(renderInlineType).join(' & ');
    }

    // Handle enums
    if (propSchema.enum) {
      return propSchema.enum.map(v => JSON.stringify(v)).join(' | ');
    }

    // Handle basic types
    switch (propSchema.type) {
      case 'string':
        return 'string';
      case 'number':
      case 'integer':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'null':
        return 'null';
      default:
        return propSchema.type || 'any';
    }
  };

  // Check if a property is a nested object that should be expanded
  const isNestedObject = (propSchema) => {
    return propSchema.type === 'object' && 
           propSchema.properties && 
           Object.keys(propSchema.properties).length > 0;
  };

  // Render the schema properties recursively
  const renderSchema = () => {
    // Check if it's an object with properties (standard JSON Schema)
    if (schema.type === 'object' && schema.properties) {
      const properties = schema.properties;
      const required = schema.required || [];

      return Object.entries(properties).map(([key, propSchema]) => {
        const isOptional = !required.includes(key);
        const optionalMark = isOptional ? '?' : '';
        const description = propSchema.description;
        const defaultValue = propSchema.default;
        const isNested = isNestedObject(propSchema);

        return (
          <div key={key} className={styles.propertyGroup}>
            <div className={styles.propertyLine} style={{ paddingLeft: `${level * 1.5}rem` }}>
              <span className={styles.propertyName}>{key}</span>
              <span className={styles.optional}>{optionalMark}</span>
              <span className={styles.colon}>: </span>
              {!isNested && (
                <>
                  <span className={styles.type}>{renderInlineType(propSchema)}</span>
                  {defaultValue !== undefined && defaultValue !== null && (
                    <>
                      <span className={styles.equals}> = </span>
                      <span className={styles.defaultValue}>
                        {JSON.stringify(defaultValue)}
                      </span>
                    </>
                  )}
                </>
              )}
              {isNested && <span className={styles.type}>{'{'}</span>}
              {description && (
                <span className={styles.comment}> // {description}</span>
              )}
            </div>
            {/* Recursively render nested object */}
            {isNested && (
              <div className={styles.nestedObject}>
                <SchemaVisor schema={propSchema} level={level + 1} />
                <div className={styles.propertyLine} style={{ paddingLeft: `${level * 1.5}rem` }}>
                  <span className={styles.type}>{'}'}</span>
                </div>
              </div>
            )}
          </div>
        );
      });
    }

    // If it's not an object with properties, render the type directly
    return (
      <div className={styles.propertyLine} style={{ paddingLeft: `${level * 1.5}rem` }}>
        <span className={styles.type}>{renderInlineType(schema)}</span>
      </div>
    );
  };

  return (
    <div className={level === 0 ? styles.schemaVisor : styles.nestedSchema}>
      {renderSchema()}
    </div>
  );
}

export default SchemaVisor;

