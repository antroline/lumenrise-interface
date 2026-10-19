import { getLaunchList, launchListKey } from '@/lib/api/launches/market';
import type { DirectoryRequest } from './directory';

export const DIRECTORY_PAGE_SIZE = 20;
export const directoryKey = (request: DirectoryRequest) =>
  launchListKey(request.network, request.page, request.limit, request.owner, request);

/** The backend filters and ranks before pagination. Never collect or reorder pages here. */
export function getDirectory(request: DirectoryRequest, signal?: AbortSignal) {
  return getLaunchList(request.network, request.page, request.limit, request.owner, signal, request);
}
