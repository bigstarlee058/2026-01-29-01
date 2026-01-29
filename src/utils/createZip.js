import JSZip from 'jszip';

export const createZip = async imageBlobs => {
  const zip = new JSZip();
  imageBlobs.forEach((blob, index) => {
    zip.file(`image${index}.jpg`, blob);
  });
  const zipFile = await zip.generateAsync({ type: 'blob' });
  return zipFile;
};
