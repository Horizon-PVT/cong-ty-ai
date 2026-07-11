/**
 * Deterministic meeting slot generator for Milestone 1.1C.
 */

/**
 * Generates 3 deterministic slots based on the recipient's ID to keep it stable.
 */
export function generateDeterministicSlots(recipientId) {
  // Deterministic seed from recipientId
  let hash = 0;
  for (let i = 0; i < recipientId.length; i++) {
    hash = ((hash << 5) - hash + recipientId.charCodeAt(i)) | 0;
  }
  const offset = Math.abs(hash) % 5; // offset in days

  // Base date: Monday, July 13, 2026
  const baseDate = new Date("2026-07-13T09:00:00Z");
  
  const slot1 = new Date(baseDate.getTime() + (offset + 1) * 24 * 60 * 60 * 1000); // Day + 1
  const slot2 = new Date(baseDate.getTime() + (offset + 2) * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000); // Day + 2, 4 hours later
  const slot3 = new Date(baseDate.getTime() + (offset + 3) * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000); // Day + 3, 2 hours later

  return [
    { slot_id: `slot_${recipientId}_1`, start_time: slot1.toISOString(), duration_minutes: 30 },
    { slot_id: `slot_${recipientId}_2`, start_time: slot2.toISOString(), duration_minutes: 30 },
    { slot_id: `slot_${recipientId}_3`, start_time: slot3.toISOString(), duration_minutes: 30 }
  ];
}
