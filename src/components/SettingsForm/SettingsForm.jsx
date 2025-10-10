import { useSettingsStore } from '../../stores/settingsStore';
import styles from './SettingsForm.module.css';

function SettingsForm() {
  const {
    openaiApiKey,
    openrouterApiKey,
    selectedLanguageModel,
    availableModels,
    isLoadingModels,
    lastFetchTime,
    isValidatedOpenai,
    isValidatedOpenrouter,
    openaiError,
    openrouterError,
    setOpenaiApiKey,
    setOpenrouterApiKey,
    setSelectedLanguageModel,
    checkApiKeys,
    clearErrors,
  } = useSettingsStore();

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

  return (
    <div className={styles.settingsForm}>
      <div className={styles.formGroup}>
        <label htmlFor="openai-key" className={styles.label}>
          <span>OpenAI API Key <span className={styles.required}>*</span></span>
          {isValidatedOpenai && <span className={styles.validatedIndicator}> ✓ Validated</span>}
        </label>
        <input
          id="openai-key"
          type="text"
          value={openaiApiKey}
          onChange={handleOpenaiKeyChange}
          className={styles.input}
          placeholder="sk-..."
          autoComplete="off"
          required
        />
        <small className={styles.helpText}>
          Required for OpenAI models
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
          {isValidatedOpenrouter && <span className={styles.validatedIndicator}> ✓ Validated</span>}
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
          Optional - enables access to additional models
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
              onClick={checkApiKeys}
              disabled={isLoadingModels || (!openaiApiKey?.trim() && !openrouterApiKey?.trim())}
              className={styles.checkButton}
            >
              {isLoadingModels ? 'Checking...' : 'Check API Keys'}
            </button>
            {(openaiError || openrouterError) && (
              <button
                type="button"
                onClick={clearErrors}
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

      <div className={styles.formGroup}>
        <label htmlFor="language-model" className={styles.label}>
          Language Model
        </label>
        <select
          id="language-model"
          value={selectedLanguageModel}
          onChange={handleModelChange}
          className={styles.select}
          disabled={!isValidatedOpenai || isLoadingModels}
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
            ? 'Fetching available models...'
            : !isValidatedOpenai || !isValidatedOpenrouter
            ? 'Add API keys and click "Check API Keys" to validate and see available models'
            : availableModels.length === 0 
            ? 'Click "Check API Keys" to fetch available models'
            : `${availableModels.length} model${availableModels.length !== 1 ? 's' : ''} available`
          }
        </small>
      </div>
    </div>
  );
}

export default SettingsForm;
