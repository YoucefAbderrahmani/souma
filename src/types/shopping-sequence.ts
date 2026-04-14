/** JSON shape for admin sequence list (client + API). */
export type ShoppingSequenceDTO = {
  id: string;
  sessionKey: string;
  userId: string | null;
  /** "First Last", email if no name, id if user missing from DB, or "—" for guests */
  userDisplayName: string;
  triggerType: string;
  triggerLabel: string;
  status: string;
  productVisitedAt: string | null;
  startedAt: string;
  endedAt: string | null;
};
