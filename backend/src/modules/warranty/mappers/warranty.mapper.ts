/** Maps locked claim statuses to conceptual doc labels. */
export function claimStatusLabel(status: string): string {
  switch (status) {
    case 'in_service':
      return 'repair';
    case 'closed':
      return 'completed';
    default:
      return status;
  }
}
