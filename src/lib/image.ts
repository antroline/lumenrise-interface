import { validateImage } from './client-rules';
export const validateProfileImage = (file: File) => validateImage(file, 'avatar');
