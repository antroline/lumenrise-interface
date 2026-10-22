/**
 * Shared types for the launches API.
 *
 * The server stores the token image and optional links before a launch; the launch itself
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

/** Result of `POST /launches/prelaunch`. */
export type UploadedLaunchImage = {
  name: string;
  slug: string;
  imageId: string;
  /** Server-issued URL, stored verbatim in the launch's `metadata.logo`. */
  publicUrl: string;
  status: LaunchImageStatus;
};

/** Result of `GET /launches/prelaunch/:imageId` (owner only). */
export type LaunchImageInfo = Omit<UploadedLaunchImage, 'slug'> & {
  slug: string | null;
  network: ApiNetwork;
  ownerAddress: string;
  launchContractId: string | null;
  assetContractId: string | null;
  cleanupReadyAt: string | null;
  expiredAt: string | null;
};
