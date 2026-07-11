/**
 * Time conflict checker for calendar scheduling in UTC.
 */

/**
 * Checks if a proposed slot overlaps with any busy interval.
 *
 * @param {object} proposedSlot - { start_time, duration_minutes }
 * @param {Array<{start: string, end: string}>} busySlots - busy intervals in ISO format
 * @returns {boolean} true if there is a conflict, false otherwise
 */
export function hasConflict(proposedSlot, busySlots = []) {
  const start = new Date(proposedSlot.start_time).getTime();
  const end = start + proposedSlot.duration_minutes * 60 * 1000;

  for (const busy of busySlots) {
    const busyStart = new Date(busy.start).getTime();
    const busyEnd = new Date(busy.end).getTime();

    // Overlap condition: startA < endB and startB < endA
    if (start < busyEnd && busyStart < end) {
      return true;
    }
  }

  return false;
}
