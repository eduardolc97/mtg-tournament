export function publicAssetUrl(fileName: string): string {
  const segments = fileName.split('/').filter(Boolean);
  return '/' + segments.map(encodeURIComponent).join('/');
}
