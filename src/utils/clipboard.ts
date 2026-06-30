/**
 * Robust clipboard copy function with fallback to legacy input selection.
 * This is crucial for sandboxed iframe environments where navigator.clipboard might be blocked.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try modern navigator.clipboard
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Modern navigator.clipboard failed, trying fallback:', err);
  }

  // 2. Fallback to document.execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Position out of sight but visible enough to be selectable
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.fontSize = '16px'; // Prevent zooming in iOS
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // Select full text for iOS
    textArea.setSelectionRange(0, 999999);
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copyToClipboard failed entirely:', err);
    return false;
  }
}
