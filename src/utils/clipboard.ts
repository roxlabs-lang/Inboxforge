/**
 * Clipboard system with chunked handling for large datasets
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

export async function copyMultipleEmails(emails: string[]): Promise<{ count: number; success: boolean }> {
  if (!emails.length) return { count: 0, success: false };

  // For very large email lists, join efficiently
  const text = emails.join('\n');
  const success = await copyToClipboard(text);
  return { count: emails.length, success };
}
