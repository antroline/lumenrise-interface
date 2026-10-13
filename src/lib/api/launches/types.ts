/**
 * Shared types for the launches API.
 *
 * The server only stores the token image before a launch; the launch itself
 * is read back from the factory contract after the transaction confirms.
 */

/** Stellar networks the launches API accepts. */
export type ApiNetwork = 'testnet' | 'public';

/** Lifecycle of an uploaded token image on the server. */
export type LaunchImageStatus =
  | 'pending'
  | 'cleanup_ready'
  | 'deleting'
  | 'finalized'
  | 'expired';

/** Result of `POST /launches/images`. */
export type UploadedLaunchImage = {
  imageId: string;
  /** Server-issued URL, stored verbatim in the launch's `metadata.logo`. */
  publicUrl: string;
  status: LaunchImageStatus;
};

/** Result of `GET /launches/images/:imageId` (owner only). */
export type LaunchImageInfo = UploadedLaunchImage & {
  network: ApiNetwork;
  ownerAddress: string;
  launchContractId: string | null;
  assetContractId: string | null;
  cleanupReadyAt: string | null;
  expiredAt: string | null;
};
