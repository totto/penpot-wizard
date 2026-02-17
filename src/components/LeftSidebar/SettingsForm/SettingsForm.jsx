import { useStore } from "@nanostores/react";
import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  $openaiApiKey,
  $openrouterApiKey,
  $selectedLanguageModel,
  $selectedImageModel,
  $selectedEmbeddingModel,
  $availableModels,
  $availableImageModels,
  $isLoadingModels,
  $lastFetchTime,
  $isValidatedOpenai,
  $isValidatedOpenrouter,
  $openaiError,
  $openrouterError,
  setOpenaiApiKey,
  setOpenrouterApiKey,
  setSelectedLanguageModel,
  setSelectedImageModel,
  checkApiKeys,
  clearErrors,
} from "@/stores/settingsStore";
import styles from "./SettingsForm.module.css";

function SettingsForm() {
  const openaiApiKey = useStore($openaiApiKey);
  const openrouterApiKey = useStore($openrouterApiKey);
  const selectedLanguageModel = useStore($selectedLanguageModel);
  const selectedImageModel = useStore($selectedImageModel);
  const selectedEmbeddingModel = useStore($selectedEmbeddingModel);
  const availableModels = useStore($availableModels);
  const availableImageModels = useStore($availableImageModels);
  const isLoadingModels = useStore($isLoadingModels);
  const lastFetchTime = useStore($lastFetchTime);
  const isValidatedOpenai = useStore($isValidatedOpenai);
  const isValidatedOpenrouter = useStore($isValidatedOpenrouter);
  const openaiError = useStore($openaiError);
  const openrouterError = useStore($openrouterError);

  // State for managing expanded sections
  const [expandedSections, setExpandedSections] = useState({
    credentials: true, // Keep credentials expanded by default
    textModels: false,
    embeddings: false,
    imageGeneration: false,
  });

  // Remove automatic fetching on mount
  // useEffect(() => {
  //   fetchModels();
  // }, [fetchModels]);

  const handleOpenaiKeyChange = (e) => {
    setOpenaiApiKey(e.target.value);
  };

  const handleOpenrouterKeyChange = (e) => {
    setOpenrouterApiKey(e.target.value);
  };

  const handleModelChange = (e) => {
    setSelectedLanguageModel(e.target.value);
  };

  const handleImageModelChange = (e) => {
    setSelectedImageModel(e.target.value);
  };

  const handleEmbeddingModelChange = (e) => {
    $selectedEmbeddingModel.set(e.target.value);
  };

  // Available embedding models (OpenAI only)
  const availableEmbeddingModels = [
    { id: "text-embedding-3-large", name: "text-embedding-3-large" },
    { id: "text-embedding-3-small", name: "text-embedding-3-small" },
    { id: "text-embedding-ada-002", name: "text-embedding-ada-002" },
  ];
  const handleCheckApiKeys = () => {
    checkApiKeys();
  };

  const handleClearErrors = () => {
    clearErrors();
  };

  const toggleSection = (sectionName) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  return (
    <div className={styles.settingsForm}>
      {/* AI Credentials Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection("credentials")}
        >
          <h3 className={styles.sectionTitle}>AI Credentials</h3>
          {expandedSections.credentials ? (
            <ChevronDownIcon className={styles.chevronIcon} />
          ) : (
            <ChevronRightIcon className={styles.chevronIcon} />
          )}
        </button>

        {expandedSections.credentials && (
          <>
            <p className={styles.sectionDescription}>
              Configure your API keys to access different AI services. OpenAI
              provides both text and embedding models, while OpenRouter offers
              additional text models.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="openai-key" className={styles.label}>
                <span>
                  OpenAI API Key
                </span>
                {isValidatedOpenai && (
                  <span className={styles.validatedIndicator}>
                    {" "}
                    ✓ Validated
                  </span>
                )}
              </label>
              <input
                id="openai-key"
                type="text"
                value={openaiApiKey}
                onChange={handleOpenaiKeyChange}
                className={styles.input}
                placeholder="sk-..."
                autoComplete="off"
              />
              <small className={styles.helpText}>
                For embeddings and OpenAI image models. Use OpenRouter key for text models (and optionally for embeddings via OpenRouter)
              </small>
              {openaiError && (
                <div className={styles.errorMessage}>
                  <strong>OpenAI Error:</strong> {openaiError}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="openrouter-key" className={styles.label}>
                OpenRouter API Key
                {isValidatedOpenrouter && (
                  <span className={styles.validatedIndicator}>
                    {" "}
                    ✓ Validated
                  </span>
                )}
              </label>
              <input
                id="openrouter-key"
                type="text"
                value={openrouterApiKey}
                onChange={handleOpenrouterKeyChange}
                className={styles.input}
                placeholder="sk-or-..."
                autoComplete="off"
              />
              <small className={styles.helpText}>
                Optional - enables access to additional text and image models
                via OpenRouter (no embeddings)
              </small>
              {openrouterError && (
                <div className={styles.errorMessage}>
                  <strong>OpenRouter Error:</strong> {openrouterError}
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.buttonGroup}>
                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    onClick={handleCheckApiKeys}
                    disabled={
                      isLoadingModels ||
                      (!openaiApiKey?.trim() && !openrouterApiKey?.trim())
                    }
                    className={styles.checkButton}
                  >
                    {isLoadingModels ? "Checking..." : "Check API Keys"}
                  </button>
                  {(openaiError || openrouterError) && (
                    <button
                      type="button"
                      onClick={handleClearErrors}
                      className={styles.clearButton}
                    >
                      Clear Errors
                    </button>
                  )}
                </div>
                {lastFetchTime && (
                  <small className={styles.lastFetch}>
                    Last checked: {new Date(lastFetchTime).toLocaleTimeString()}
                  </small>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Models Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection("textModels")}
        >
          <h3 className={styles.sectionTitle}>AI Models</h3>
          {expandedSections.textModels ? (
            <ChevronDownIcon className={styles.chevronIcon} />
          ) : (
            <ChevronRightIcon className={styles.chevronIcon} />
          )}
        </button>

        {expandedSections.textModels && (
          <>
            <p className={styles.sectionDescription}>
              Text models power the AI agents that help you with design tasks,
              answer questions, and provide guidance in your Penpot projects.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="language-model" className={styles.label}>
                Text Model
              </label>
              <select
                id="language-model"
                value={selectedLanguageModel}
                onChange={handleModelChange}
                className={styles.select}
                disabled={
                  (!isValidatedOpenai && !isValidatedOpenrouter) ||
                  isLoadingModels
                }
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : (
                  availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.provider}: {model.name}
                    </option>
                  ))
                )}
              </select>
              <small className={styles.helpText}>
                {isLoadingModels
                  ? "Fetching available models..."
                  : !isValidatedOpenai && !isValidatedOpenrouter
                  ? 'Add at least one API key and click "Check API Keys" to see available models'
                  : availableModels.length === 0
                  ? 'Click "Check API Keys" to fetch available models'
                  : `${availableModels.length} model${
                      availableModels.length !== 1 ? "s" : ""
                    } available`}
              </small>
              <small className={styles.helpText}>
                <strong>Used for:</strong> Chat conversations, design advice,
                and AI agent responses
              </small>
            </div>
          </>
        )}
      </div>

      {/* Embeddings Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection("embeddings")}
        >
          <h3 className={styles.sectionTitle}>Embeddings</h3>
          {expandedSections.embeddings ? (
            <ChevronDownIcon className={styles.chevronIcon} />
          ) : (
            <ChevronRightIcon className={styles.chevronIcon} />
          )}
        </button>

        {expandedSections.embeddings && (
          <>
            <p className={styles.sectionDescription}>
              Embedding models convert text into numerical vectors that enable
              semantic search and retrieval of relevant information from
              knowledge bases.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="embedding-model" className={styles.label}>
                Embedding Model
              </label>
              <select
                id="embedding-model"
                value={selectedEmbeddingModel}
                onChange={handleEmbeddingModelChange}
                className={styles.select}
                disabled={!isValidatedOpenai && !isValidatedOpenrouter}
              >
                {availableEmbeddingModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <small className={styles.helpText}>
                {!isValidatedOpenai && !isValidatedOpenrouter
                  ? "API key (OpenAI or OpenRouter) required for embeddings - click 'Check API Keys' first"
                  : "Embedding models for RAG (OpenRouter proxies to OpenAI models)"}
              </small>
              <small className={styles.helpText}>
                <strong>Used for:</strong> RAG (Retrieval-Augmented Generation),
                semantic search, and knowledge base queries
              </small>
            </div>
          </>
        )}
      </div>

      {/* Image Generation Section */}
      <div className={styles.section}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection("imageGeneration")}
        >
          <h3 className={styles.sectionTitle}>Image Generation</h3>
          {expandedSections.imageGeneration ? (
            <ChevronDownIcon className={styles.chevronIcon} />
          ) : (
            <ChevronRightIcon className={styles.chevronIcon} />
          )}
        </button>

        {expandedSections.imageGeneration && (
          <>
            <p className={styles.sectionDescription}>
              Image generation models create visual content from text
              descriptions, enabling AI-powered design asset creation and visual
              ideation.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="image-model" className={styles.label}>
                Image Model
              </label>
              <select
                id="image-model"
                value={selectedImageModel}
                onChange={handleImageModelChange}
                className={styles.select}
                disabled={
                  (!isValidatedOpenai && !isValidatedOpenrouter) ||
                  isLoadingModels
                }
              >
                {isLoadingModels ? (
                  <option value="">Loading models...</option>
                ) : (
                  availableImageModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.provider}: {model.name}
                    </option>
                  ))
                )}
              </select>
              <small className={styles.helpText}>
                {isLoadingModels
                  ? "Fetching available models..."
                  : !isValidatedOpenai && !isValidatedOpenrouter
                  ? 'Add at least one API key and click "Check API Keys" to see available models'
                  : availableImageModels.length === 0
                  ? 'Click "Check API Keys" to fetch available models'
                  : `${availableImageModels.length} model${
                      availableImageModels.length !== 1 ? "s" : ""
                    } available`}
              </small>
              <small className={styles.helpText}>
                <strong>Used for:</strong> Creating design assets, visual
                mockups, and generating images from text descriptions
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SettingsForm;
