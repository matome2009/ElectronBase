/**
 * Clipboard utility with fallback for when document is not focused
 */

/**
 * Copy text to clipboard with fallback
 * @param text Text to copy
 * @returns Promise that resolves when copy is successful
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    // Try modern clipboard API first
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for when document is not focused or clipboard API is not available
    console.warn('Clipboard API failed, using fallback:', error);
    
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      
      // Make it invisible
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      
      // Select and copy
      textarea.focus();
      textarea.select();
      
      const successful = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textarea);
      
      if (!successful) {
        throw new Error('execCommand failed');
      }
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      throw new Error('クリップボードへのコピーに失敗しました。ブラウザの設定を確認してください。');
    }
  }
}

/**
 * Copy text to clipboard and show alert
 * @param text Text to copy
 * @param successMessage Success message to show
 */
export async function copyToClipboardWithAlert(
  text: string,
  successMessage: string = 'クリップボードにコピーしました'
): Promise<void> {
  try {
    await copyToClipboard(text);
    alert(successMessage);
  } catch (error) {
    alert(error instanceof Error ? error.message : 'コピーに失敗しました');
  }
}
