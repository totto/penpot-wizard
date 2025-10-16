import styles from './StreamingCancelDialog.module.css'

/**
 * StreamingCancelDialog Component
 * Shows a confirmation dialog when user tries to navigate away during streaming
 */
function StreamingCancelDialog({ onContinue, onCancel }) {
  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>Message is being received</h3>
        <p className={styles.message}>
          The AI is currently streaming a response. Do you want to wait for it to finish or cancel the message?
        </p>
        <div className={styles.buttons}>
          <button
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onCancel}
          >
            Cancel Message
          </button>
          <button
            className={`${styles.button} ${styles.continueButton}`}
            onClick={onContinue}
          >
            <span className={styles.spinner}></span>
            Wait for Message
          </button>
        </div>
      </div>
    </div>
  )
}

export default StreamingCancelDialog

