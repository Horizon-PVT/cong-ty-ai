/**
 * Follow-up email rendering.
 */

export function renderFollowupMessage({ recipientId, attempt, timezone }) {
  const text = `Hi there,\n\nJust following up on the AI demo invite we sent you. Let us know if you have any questions.\n\nBest,\nAI Company\n\nUnsubscribe here: https://paperclip.dev/unsubscribe?recipient=${recipientId}`;
  
  const html = `
    <h3>Follow-up Demo Request</h3>
    <p>Hi there,</p>
    <p>Just following up on the AI demo invitation. Let us know if the proposed slot works for you in ${timezone}.</p>
    <br>
    <hr>
    <p style="font-size: 11px; color: gray;">If you wish to opt-out, please <a href="https://paperclip.dev/unsubscribe?recipient=${recipientId}">Unsubscribe here</a>.</p>
  `;

  return { text, html };
}
