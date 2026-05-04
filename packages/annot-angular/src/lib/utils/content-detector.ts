export type ContentType = 'pdf' | 'image' | 'email' | 'unknown';

const IMAGE_EXT = /\.(jpe?g|png|gif|bmp|webp|svg|tiff?)$/i;

export function detectContentType(file: File): ContentType {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';

  if (mime.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';

  if (name.endsWith('.eml') || name.endsWith('.msg') || mime === 'message/rfc822') return 'email';

  return 'unknown';
}

export function contentTypeLabel(type: ContentType): string {
  switch (type) {
    case 'pdf':   return 'PDF';
    case 'image': return 'Image';
    case 'email': return 'Email';
    default:      return 'File';
  }
}

export function acceptForContentType(type: ContentType | 'all'): string {
  switch (type) {
    case 'pdf':   return '.pdf,application/pdf';
    case 'image': return 'image/*';
    case 'email': return '.eml,.msg,message/rfc822';
    default:      return '.pdf,application/pdf,image/*,.eml,.msg';
  }
}
